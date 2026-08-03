from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import EmployerProfile, User
from .models import Application, AuditLog, Booking, Conversation, FraudReport, Job, Message, Notification, NotificationBroadcast, PlatformSetting, SavedJob, SavedTalent, ServiceListing, UserAction, UserInteraction, WorkerReview
from .permissions import IsAdministrator, IsEmployer, IsSeeker
from .recommendations import recommendation_score
from .serializers import (
    ApplicationSerializer,
    ApplicationStatusSerializer,
    AuditLogSerializer,
    BookingSerializer,
    BookingStatusSerializer,
    ConversationSerializer,
    FraudReportSerializer,
    FraudReportStatusSerializer,
    JobSerializer,
    MessageSerializer,
    NotificationBroadcastSerializer,
    NotificationSerializer,
    PlatformSettingSerializer,
    SavedJobSerializer,
    SavedTalentSerializer,
    SavedTalentToggleSerializer,
    ServiceListingSerializer,
    SaveToggleSerializer,
    TalentSerializer,
    UserActionSerializer,
    WorkerReviewSerializer,
)
from .services import create_notification


class TalentViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = TalentSerializer
    permission_classes = [IsEmployer]
    search_fields = ("first_name", "last_name", "seeker_profile__headline", "seeker_profile__skills", "seeker_profile__preferred_location")
    ordering_fields = ("trust_score", "created_at")
    ordering = ("-trust_score",)

    def get_queryset(self):
        return User.objects.filter(role=User.Role.SEEKER, is_active=True).select_related("seeker_profile")


class JobViewSet(viewsets.ModelViewSet):
    serializer_class = JobSerializer
    search_fields = ("title", "category", "description", "location", "employer__employer_profile__business_name")
    ordering_fields = ("created_at", "salary_min", "salary_max")
    ordering = ("-is_urgent", "-created_at")

    def get_permissions(self):
        if self.action == "destroy" and getattr(self.request.user, "role", None) == User.Role.ADMIN:
            return [IsAdministrator()]
        if self.action in {"create"}:
            return [IsEmployer()]
        if self.action in {"update", "partial_update", "destroy", "mine", "close", "reopen"}:
            return [permissions.IsAuthenticated(), IsEmployer()]
        if self.action in {"moderate", "moderation_queue"}:
            return [IsAdministrator()]
        if self.action in {"list", "retrieve"}:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = Job.objects.select_related("employer", "employer__employer_profile").annotate(
            application_count=Count("applications", distinct=True)
        )
        if self.action == "mine" and self.request.user.is_authenticated:
            return queryset.filter(employer=self.request.user)
        if self.action in {"moderation_queue", "moderate"}:
            return queryset.filter(status=Job.Status.PENDING)
        if self.action == "destroy" and getattr(self.request.user, "role", None) == User.Role.ADMIN:
            return queryset
        if self.action in {"update", "partial_update", "destroy", "close", "reopen"}:
            return queryset.filter(employer=self.request.user)
        queryset = queryset.filter(status=Job.Status.APPROVED).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))
        employment_type = self.request.query_params.get("employment_type")
        shift_type = self.request.query_params.get("shift_type")
        work_mode = self.request.query_params.get("work_mode")
        location = self.request.query_params.get("location")
        skill = self.request.query_params.get("skill")
        category = self.request.query_params.get("category")
        if employment_type:
            queryset = queryset.filter(employment_type=employment_type)
        if shift_type:
            queryset = queryset.filter(shift_type=shift_type)
        if work_mode:
            queryset = queryset.filter(work_mode=work_mode)
        if location:
            queryset = queryset.filter(location__icontains=location)
        if skill:
            queryset = queryset.filter(skills__icontains=skill)
        if category:
            queryset = queryset.filter(category__iexact=category)
        return queryset

    def perform_create(self, serializer):
        profile = getattr(self.request.user, "employer_profile", None)
        if not profile or profile.verification_status != EmployerProfile.VerificationStatus.APPROVED:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Employer verification must be approved before posting a job.")
        job = serializer.save(employer=self.request.user, status=Job.Status.PENDING)
        create_notification(
            recipient=self.request.user,
            category="job-posting",
            title="Job submitted for review",
            message=f'Your listing "{job.title}" is waiting for administrator approval.',
            link=f"{settings.FRONTEND_URL}/?page=dashboard",
            send_email=True,
        )

    def perform_update(self, serializer):
        serializer.save(status=Job.Status.PENDING, approved_by=None, rejection_reason="")

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        if request.user.is_authenticated:
            UserInteraction.objects.create(user=request.user, job=self.get_object(), kind=UserInteraction.Kind.VIEW)
        return response

    @action(detail=False, methods=("get",))
    def mine(self, request):
        return self.list(request)

    @action(detail=False, methods=("get",), permission_classes=(IsAdministrator,))
    def moderation_queue(self, request):
        return self.list(request)

    @action(detail=True, methods=("post",), permission_classes=(IsAdministrator,))
    def moderate(self, request, pk=None):
        job = self.get_object()
        decision = request.data.get("status")
        if decision not in {Job.Status.APPROVED, Job.Status.REJECTED}:
            return Response({"detail": "Status must be approved or rejected."}, status=400)
        job.status = decision
        job.rejection_reason = request.data.get("rejection_reason", "") if decision == Job.Status.REJECTED else ""
        job.approved_by = request.user if decision == Job.Status.APPROVED else None
        job.save()
        create_notification(
            recipient=job.employer,
            category="job-moderation",
            title=f"Job {decision}",
            message=f'Your listing "{job.title}" was {decision}.' + (f" Reason: {job.rejection_reason}" if job.rejection_reason else ""),
            link=f"{settings.FRONTEND_URL}/?page=dashboard",
            send_email=True,
        )
        if decision == Job.Status.APPROVED:
            seekers = User.objects.filter(role=User.Role.SEEKER, is_active=True).select_related("seeker_profile")
            for seeker in seekers:
                score = recommendation_score(seeker, job)
                if score >= 45:
                    create_notification(
                        recipient=seeker,
                        category="similar-job",
                        title="A new job matches your profile",
                        message=f'{job.title} is a {score}% match for your skills and preferences.',
                        link=f"{settings.FRONTEND_URL}/?page=job-details&job={job.pk}",
                        send_email=True,
                        job_alert=True,
                    )
        return Response(self.get_serializer(job).data)

    @action(detail=True, methods=("post",))
    def close(self, request, pk=None):
        job = self.get_object()
        job.status = Job.Status.CLOSED
        job.save(update_fields=("status", "updated_at"))
        return Response(self.get_serializer(job).data)

    @action(detail=True, methods=("post",))
    def reopen(self, request, pk=None):
        job = self.get_object()
        job.status = Job.Status.PENDING
        job.approved_by = None
        job.rejection_reason = ""
        job.save(update_fields=("status", "approved_by", "rejection_reason", "updated_at"))
        return Response(self.get_serializer(job).data)


class RecommendationView(APIView):
    permission_classes = [IsSeeker]

    def get(self, request):
        jobs = list(
            Job.objects.filter(status=Job.Status.APPROVED).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))
            .select_related("employer", "employer__employer_profile")
            .annotate(application_count=Count("applications", distinct=True))
        )
        jobs.sort(key=lambda job: (recommendation_score(request.user, job), job.created_at), reverse=True)
        serializer = JobSerializer(jobs[:20], many=True, context={"request": request})
        return Response(serializer.data)


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    http_method_names = ("get", "post", "head", "options")

    def get_queryset(self):
        queryset = Application.objects.select_related("job", "job__employer", "seeker")
        if self.request.user.role == User.Role.ADMIN:
            return queryset
        if self.request.user.role == User.Role.SEEKER:
            return queryset.filter(seeker=self.request.user)
        return queryset.filter(job__employer=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        if self.request.user.role != User.Role.SEEKER:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Only job seekers can apply for jobs.")
        application = serializer.save(seeker=self.request.user)
        UserInteraction.objects.create(user=self.request.user, job=application.job, kind=UserInteraction.Kind.APPLY)
        create_notification(
            recipient=application.job.employer,
            category="application",
            title="New job application",
            message=f"{self.request.user.get_full_name() or self.request.user.email} applied for {application.job.title}.",
            link=f"{settings.FRONTEND_URL}/?page=dashboard",
            send_email=True,
        )
        create_notification(
            recipient=self.request.user,
            category="application",
            title="Application submitted",
            message=f'Your application for "{application.job.title}" was sent to {application.job.employer.get_full_name() or application.job.employer.email}.',
            link=f"{settings.FRONTEND_URL}/?page=dashboard",
            send_email=True,
        )

    @action(detail=True, methods=("post",), serializer_class=ApplicationStatusSerializer)
    def update_status(self, request, pk=None):
        application = self.get_object()
        if request.user not in {application.job.employer} and request.user.role != User.Role.ADMIN:
            return Response({"detail": "Only the employer or an administrator may update application status."}, status=403)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application.status = serializer.validated_data["status"]
        application.employer_notes = serializer.validated_data.get("employer_notes", "")
        application.save()
        if application.status == Application.Status.ACCEPTED:
            accepted_count = application.job.applications.filter(status=Application.Status.ACCEPTED).count()
            if accepted_count >= application.job.positions:
                application.job.status = Job.Status.CLOSED
                application.job.save(update_fields=("status", "updated_at"))
        create_notification(
            recipient=application.seeker,
            category="application-status",
            title="You were hired" if application.status == Application.Status.ACCEPTED else "Application updated",
            message=(
                f'You were hired for "{application.job.title}" by {application.job.employer.get_full_name() or application.job.employer.email}.'
                if application.status == Application.Status.ACCEPTED
                else f'Your application for "{application.job.title}" is now {application.get_status_display()}.'
            ),
            link=f"{settings.FRONTEND_URL}/?page=dashboard",
            send_email=True,
        )
        if application.status == Application.Status.ACCEPTED:
            seeker_name = application.seeker.get_full_name() or application.seeker.email
            create_notification(
                recipient=application.job.employer,
                category="hiring",
                title="Hiring confirmed",
                message=f'You hired {seeker_name} for "{application.job.title}". The hire is stored in Hired History.',
                link=f"{settings.FRONTEND_URL}/?page=dashboard",
                send_email=True,
            )
        return Response(ApplicationSerializer(application, context={"request": request}).data)

    @action(detail=True, methods=("post",))
    def withdraw(self, request, pk=None):
        application = self.get_object()
        if application.seeker != request.user:
            return Response({"detail": "You may only withdraw your own application."}, status=403)
        application.status = Application.Status.WITHDRAWN
        application.save(update_fields=("status", "updated_at"))
        return Response(self.get_serializer(application).data)


class WorkerReviewViewSet(viewsets.ModelViewSet):
    serializer_class = WorkerReviewSerializer
    http_method_names = ("get", "post", "head", "options")

    def get_queryset(self):
        queryset = WorkerReview.objects.select_related("reviewer", "worker", "application", "application__job")
        if self.request.user.role == User.Role.ADMIN:
            return queryset
        if self.request.user.role == User.Role.SEEKER:
            return queryset.filter(worker=self.request.user)
        return queryset.filter(reviewer=self.request.user)

    def perform_create(self, serializer):
        review = serializer.save(reviewer=self.request.user)
        create_notification(
            recipient=review.worker,
            category="worker-review",
            title="New employer feedback",
            message=f"{review.reviewer.get_full_name() or review.reviewer.email} left you a {review.rating}/5 review.",
            link=f"{settings.FRONTEND_URL}/?page=dashboard",
            send_email=True,
        )


class SavedJobViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = SavedJobSerializer
    permission_classes = [IsSeeker]

    def get_queryset(self):
        return SavedJob.objects.filter(seeker=self.request.user).select_related("job", "job__employer")

    @action(detail=False, methods=("post",), serializer_class=SaveToggleSerializer)
    def toggle(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.validated_data["job"]
        saved, created = SavedJob.objects.get_or_create(seeker=request.user, job=job)
        if not created:
            saved.delete()
            return Response({"saved": False})
        UserInteraction.objects.create(user=request.user, job=job, kind=UserInteraction.Kind.SAVE)
        return Response({"saved": True}, status=status.HTTP_201_CREATED)


class SavedTalentViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = SavedTalentSerializer
    permission_classes = [IsEmployer]

    def get_queryset(self):
        return SavedTalent.objects.filter(employer=self.request.user).select_related("talent", "talent__seeker_profile")

    @action(detail=False, methods=("post",), serializer_class=SavedTalentToggleSerializer)
    def toggle(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        talent = serializer.validated_data["talent"]
        saved, created = SavedTalent.objects.get_or_create(employer=request.user, talent=talent)
        if not created:
            saved.delete()
            return Response({"saved": False})
        return Response({"saved": True}, status=status.HTTP_201_CREATED)


class FraudReportViewSet(viewsets.ModelViewSet):
    serializer_class = FraudReportSerializer
    http_method_names = ("get", "post", "head", "options")

    def get_queryset(self):
        queryset = FraudReport.objects.select_related("reporter", "job", "reported_user", "assigned_to")
        if self.request.user.role == User.Role.ADMIN:
            return queryset
        return queryset.filter(reporter=self.request.user)

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

    @action(detail=True, methods=("post",), serializer_class=FraudReportStatusSerializer)
    def update_status(self, request, pk=None):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Administrator access is required."}, status=403)
        report = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report.status = serializer.validated_data["status"]
        report.resolution_notes = serializer.validated_data.get("resolution_notes", "")
        report.assigned_to = request.user
        report.save()
        create_notification(
            recipient=report.reporter,
            category="safety",
            title="Safety report updated",
            message=report.resolution_notes or f"Your report is now {report.get_status_display()}.",
            send_email=True,
        )
        return Response(FraudReportSerializer(report, context={"request": request}).data)


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=("post",))
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=("is_read",))
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=("post",))
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": updated})


class NotificationBroadcastViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationBroadcastSerializer
    permission_classes = [IsAdministrator]

    def get_queryset(self):
        return NotificationBroadcast.objects.select_related("created_by")

    def perform_create(self, serializer):
        audience = serializer.validated_data["audience"]
        recipients = User.objects.filter(is_active=True).exclude(pk=self.request.user.pk)
        if audience == NotificationBroadcast.Audience.SEEKERS:
            recipients = recipients.filter(role=User.Role.SEEKER)
        elif audience == NotificationBroadcast.Audience.EMPLOYERS:
            recipients = recipients.filter(role__in=(User.Role.EMPLOYER, User.Role.EMPLOYER_INDIVIDUAL))
        elif audience == NotificationBroadcast.Audience.COMPANY_EMPLOYERS:
            recipients = recipients.filter(role=User.Role.EMPLOYER)
        elif audience == NotificationBroadcast.Audience.INDIVIDUAL_EMPLOYERS:
            recipients = recipients.filter(role=User.Role.EMPLOYER_INDIVIDUAL)
        broadcast = serializer.save(created_by=self.request.user, recipient_count=recipients.count())
        for recipient in recipients.iterator():
            create_notification(
                recipient=recipient,
                category=broadcast.category,
                title=broadcast.title,
                message=broadcast.message,
                link=broadcast.link,
                send_email=broadcast.send_email,
                marketing=broadcast.is_marketing,
                force_email=broadcast.category in {"warning", "account", "security"},
            )


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    http_method_names = ("get", "post", "head", "options")

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).prefetch_related("participants", "messages")

    @action(detail=True, methods=("get", "post"))
    def messages(self, request, pk=None):
        conversation = self.get_object()
        if request.method == "GET":
            conversation.messages.exclude(sender=request.user).filter(is_read=False).update(is_read=True)
            return Response(MessageSerializer(conversation.messages.select_related("sender"), many=True).data)
        serializer = MessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attachment = serializer.validated_data.get("attachment")
        message = serializer.save(
            conversation=conversation,
            sender=request.user,
            attachment_name=attachment.name[:255] if attachment else "",
        )
        conversation.save(update_fields=("updated_at",))
        for recipient in conversation.participants.exclude(pk=request.user.pk):
            create_notification(
                recipient=recipient,
                category="message",
                title=f"New message from {request.user.get_full_name() or request.user.email}",
                message=(message.body or f"Shared a file: {message.attachment_name}")[:240],
                link=f"{settings.FRONTEND_URL}/?page=dashboard",
                send_email=True,
            )
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class ServiceListingViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceListingSerializer
    search_fields = ("title", "category", "description", "location", "provider__first_name", "provider__last_name")
    ordering_fields = ("price", "created_at")

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = ServiceListing.objects.select_related("provider")
        if self.action in {"update", "partial_update", "destroy"}:
            return queryset.filter(provider=self.request.user)
        if self.action == "mine":
            return queryset.filter(provider=self.request.user)
        return queryset.filter(status=ServiceListing.Status.ACTIVE)

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.SEEKER:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only job seekers may publish services.")
        serializer.save(provider=self.request.user)

    @action(detail=False, methods=("get",))
    def mine(self, request):
        return self.list(request)


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    http_method_names = ("get", "post", "head", "options")

    def get_queryset(self):
        queryset = Booking.objects.select_related("service", "service__provider", "client")
        if self.request.user.role == User.Role.ADMIN:
            return queryset
        if self.request.user.role == User.Role.SEEKER:
            return queryset.filter(service__provider=self.request.user)
        return queryset.filter(client=self.request.user)

    def perform_create(self, serializer):
        if self.request.user.role not in {User.Role.EMPLOYER, User.Role.EMPLOYER_INDIVIDUAL}:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("An employer account is required to book a service.")
        booking = serializer.save(client=self.request.user)
        create_notification(recipient=booking.service.provider, category="booking", title="New service booking", message=f'{self.request.user.get_full_name() or self.request.user.email} requested {booking.service.title} on {booking.scheduled_date}.', send_email=True)
        create_notification(recipient=self.request.user, category="booking", title="Booking requested", message=f'Your booking for {booking.service.title} was sent to {booking.service.provider.get_full_name() or booking.service.provider.email}.', send_email=True)

    @action(detail=True, methods=("post"), serializer_class=BookingStatusSerializer)
    def update_status(self, request, pk=None):
        booking = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        requested = serializer.validated_data["status"]
        if request.user == booking.client and requested != Booking.Status.CANCELLED:
            return Response({"detail": "Clients may only cancel a booking."}, status=403)
        if request.user not in {booking.client, booking.service.provider} and request.user.role != User.Role.ADMIN:
            return Response({"detail": "You cannot update this booking."}, status=403)
        booking.status = requested
        booking.save(update_fields=("status", "updated_at"))
        recipient = booking.service.provider if request.user == booking.client else booking.client
        create_notification(recipient=recipient, category="booking", title="Booking updated", message=f'{booking.service.title} is now {booking.get_status_display()}.', send_email=True)
        return Response(BookingSerializer(booking, context={"request": request}).data)


class AuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdministrator]
    search_fields = ("actor__email", "action", "path", "ip_address")
    ordering_fields = ("created_at", "status_code")

    def get_queryset(self):
        return AuditLog.objects.select_related("actor")


class PlatformSettingViewSet(viewsets.ModelViewSet):
    serializer_class = PlatformSettingSerializer
    permission_classes = [IsAdministrator]
    lookup_field = "key"

    def get_queryset(self):
        return PlatformSetting.objects.select_related("updated_by")

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class UserActionViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = UserActionSerializer

    def get_queryset(self):
        return UserAction.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DashboardView(APIView):
    def get(self, request):
        user = request.user
        if user.role == User.Role.SEEKER:
            data = {
                "applications": user.applications.count(),
                "saved_jobs": user.saved_jobs.count(),
                "unread_messages": Message.objects.filter(conversation__participants=user, is_read=False).exclude(sender=user).count(),
                "unread_notifications": user.notifications.filter(is_read=False).count(),
                "trust_score": user.trust_score,
            }
        elif user.role in {User.Role.EMPLOYER, User.Role.EMPLOYER_INDIVIDUAL}:
            employer_applications = Application.objects.filter(job__employer=user)
            data = {
                "jobs": user.jobs.count(),
                "active_jobs": user.jobs.filter(status=Job.Status.APPROVED).count(),
                "active_freelance_projects": user.jobs.filter(status=Job.Status.APPROVED, employment_type=Job.EmploymentType.FREELANCE).count(),
                "active_gigs": user.jobs.filter(status=Job.Status.APPROVED, employment_type=Job.EmploymentType.GIG).count(),
                "applications": employer_applications.count(),
                "interviews": employer_applications.filter(status=Application.Status.INTERVIEW).count(),
                "accepted_hires": employer_applications.filter(status=Application.Status.ACCEPTED).count(),
                "unread_messages": Message.objects.filter(conversation__participants=user, is_read=False).exclude(sender=user).count(),
                "unread_notifications": user.notifications.filter(is_read=False).count(),
                "trust_score": user.trust_score,
                "verification_status": getattr(user.employer_profile, "verification_status", "pending"),
            }
        else:
            data = {
                "users": User.objects.count(),
                "pending_verifications": User.objects.filter(employer_profile__verification_status="pending").count(),
                "pending_jobs": Job.objects.filter(status=Job.Status.PENDING).count(),
                "open_fraud_reports": FraudReport.objects.filter(status__in=("open", "investigating")).count(),
                "unread_messages": Message.objects.filter(conversation__participants=user, is_read=False).exclude(sender=user).count(),
                "unread_notifications": user.notifications.filter(is_read=False).count(),
            }
        return Response(data)


class PublicStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "verified_companies": User.objects.filter(role=User.Role.EMPLOYER, employer_profile__verification_status=EmployerProfile.VerificationStatus.APPROVED, is_active=True).count(),
            "professionals": User.objects.filter(role=User.Role.SEEKER, is_active=True).count(),
            "active_jobs": Job.objects.filter(status=Job.Status.APPROVED).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())).count(),
            "active_services": ServiceListing.objects.filter(status=ServiceListing.Status.ACTIVE).count(),
        })
