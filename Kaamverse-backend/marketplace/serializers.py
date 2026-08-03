from rest_framework import serializers
from django.utils import timezone
from django.db.models import Count

from accounts.models import User
from accounts.serializers import UserSerializer
from .models import Application, AuditLog, Booking, Conversation, FraudReport, Job, Message, Notification, NotificationBroadcast, PlatformSetting, SavedJob, SavedTalent, ServiceListing, UserAction, WorkerReview
from .recommendations import recommendation_score


class EmployerSummarySerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "name", "trust_score", "verification_level", "verification_status")

    def get_name(self, obj):
        if hasattr(obj, "employer_profile") and obj.employer_profile.business_name:
            return obj.employer_profile.business_name
        return obj.get_full_name() or obj.email

    def get_verification_status(self, obj):
        if hasattr(obj, "employer_profile"):
            return obj.employer_profile.verification_status
        return "unverified"


class JobSerializer(serializers.ModelSerializer):
    employer_details = EmployerSummarySerializer(source="employer", read_only=True)
    match_percentage = serializers.SerializerMethodField()
    application_count = serializers.IntegerField(read_only=True)
    is_saved = serializers.SerializerMethodField()
    has_applied = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = "__all__"
        read_only_fields = (
            "employer",
            "status",
            "rejection_reason",
            "approved_by",
            "created_at",
            "updated_at",
        )

    def get_match_percentage(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == User.Role.SEEKER:
            return recommendation_score(request.user, obj)
        return None

    def get_is_saved(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and request.user.role == User.Role.SEEKER
            and obj.saved_by.filter(seeker=request.user).exists()
        )

    def get_has_applied(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and request.user.role == User.Role.SEEKER
            and obj.applications.filter(seeker=request.user).exists()
        )

    def validate(self, attrs):
        minimum = attrs.get("salary_min", getattr(self.instance, "salary_min", None))
        maximum = attrs.get("salary_max", getattr(self.instance, "salary_max", None))
        if minimum is not None and maximum is not None and minimum > maximum:
            raise serializers.ValidationError({"salary_max": "Maximum salary must not be less than minimum salary."})
        return attrs


class ApplicationSerializer(serializers.ModelSerializer):
    seeker_details = UserSerializer(source="seeker", read_only=True)
    job_details = JobSerializer(source="job", read_only=True)
    job = serializers.PrimaryKeyRelatedField(read_only=True)
    job_id = serializers.PrimaryKeyRelatedField(
        queryset=Job.objects.filter(status=Job.Status.APPROVED), source="job", write_only=True
    )

    class Meta:
        model = Application
        fields = "__all__"
        read_only_fields = ("seeker", "status", "employer_notes", "created_at", "updated_at")

    def validate_job_id(self, job):
        request = self.context["request"]
        if Application.objects.filter(job=job, seeker=request.user).exists():
            raise serializers.ValidationError("You have already applied for this job.")
        return job


class ApplicationStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Application.Status.choices)
    employer_notes = serializers.CharField(required=False, allow_blank=True)


class WorkerReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    worker_details = UserSerializer(source="worker", read_only=True)

    class Meta:
        model = WorkerReview
        fields = ("id", "reviewer", "reviewer_name", "worker", "worker_details", "application", "rating", "feedback", "created_at", "updated_at")
        read_only_fields = ("reviewer", "reviewer_name", "worker_details", "created_at", "updated_at")

    def get_reviewer_name(self, obj):
        return obj.reviewer.get_full_name() or getattr(getattr(obj.reviewer, "employer_profile", None), "business_name", "") or obj.reviewer.email

    def validate(self, attrs):
        request = self.context["request"]
        application = attrs["application"]
        worker = attrs["worker"]
        if request.user.role not in {User.Role.EMPLOYER, User.Role.EMPLOYER_INDIVIDUAL}:
            raise serializers.ValidationError("Only employers can review workers.")
        if application.job.employer_id != request.user.id or application.seeker_id != worker.id:
            raise serializers.ValidationError("This worker is not linked to your application.")
        if application.status != Application.Status.ACCEPTED:
            raise serializers.ValidationError("Feedback can be submitted after the worker has been hired.")
        return attrs


class SavedJobSerializer(serializers.ModelSerializer):
    job_details = JobSerializer(source="job", read_only=True)

    class Meta:
        model = SavedJob
        fields = "__all__"
        read_only_fields = ("seeker", "created_at", "updated_at")


class SaveToggleSerializer(serializers.Serializer):
    job_id = serializers.PrimaryKeyRelatedField(
        queryset=Job.objects.filter(status=Job.Status.APPROVED), source="job"
    )


class FraudReportSerializer(serializers.ModelSerializer):
    reporter_email = serializers.EmailField(source="reporter.email", read_only=True)
    job_title = serializers.CharField(source="job.title", read_only=True)

    class Meta:
        model = FraudReport
        fields = "__all__"
        read_only_fields = (
            "reporter",
            "status",
            "resolution_notes",
            "assigned_to",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        if not attrs.get("job") and not attrs.get("reported_user") and not attrs.get("description", "").strip():
            raise serializers.ValidationError("Describe the job, user, or conversation being reported.")
        return attrs


class FraudReportStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=FraudReport.Status.choices)
    resolution_notes = serializers.CharField(required=False, allow_blank=True)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ("recipient", "created_at")


class NotificationBroadcastSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)

    class Meta:
        model = NotificationBroadcast
        fields = "__all__"
        read_only_fields = ("created_by", "recipient_count", "created_at", "updated_at")


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ("id", "conversation", "sender", "sender_name", "body", "attachment", "attachment_name", "is_read", "created_at")
        read_only_fields = ("conversation", "sender", "sender_name", "attachment_name", "is_read", "created_at")

    def validate_attachment(self, attachment):
        if not attachment:
            return attachment
        extension = attachment.name.rsplit(".", 1)[-1].lower() if "." in attachment.name else ""
        if extension not in {"pdf", "doc", "docx", "jpg", "jpeg", "png", "txt", "webm", "mp3", "wav", "ogg", "m4a"}:
            raise serializers.ValidationError("Upload a supported document, image, or audio file.")
        if attachment.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("The attachment must be 10 MB or smaller.")
        return attachment

    def validate(self, attrs):
        if not str(attrs.get("body", "")).strip() and not attrs.get("attachment"):
            raise serializers.ValidationError("Write a message or attach a file.")
        return attrs

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.email


class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    participant_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True), write_only=True, required=False)
    job_id = serializers.PrimaryKeyRelatedField(queryset=Job.objects.all(), source="job", write_only=True, required=False, allow_null=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ("id", "participants", "participant_id", "job", "job_id", "subject", "last_message", "unread_count", "created_at", "updated_at")
        read_only_fields = ("job", "created_at", "updated_at")

    def validate_participant_id(self, user):
        if user == self.context["request"].user:
            raise serializers.ValidationError("Choose another user for the conversation.")
        return user

    def create(self, validated_data):
        other = validated_data.pop("participant_id")
        current = self.context["request"].user
        existing = (
            Conversation.objects.filter(
                subject=validated_data.get("subject", ""),
                job=validated_data.get("job"),
                participants=current,
            )
            .filter(participants=other)
            .annotate(participant_count=Count("participants"))
            .filter(participant_count=2)
            .first()
        )
        if existing:
            return existing
        conversation = Conversation.objects.create(**validated_data)
        conversation.participants.add(current, other)
        return conversation

    def get_last_message(self, obj):
        message = obj.messages.select_related("sender").last()
        return MessageSerializer(message).data if message else None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        return obj.messages.exclude(sender=request.user).filter(is_read=False).count() if request else 0


class TalentSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    headline = serializers.CharField(source="seeker_profile.headline", read_only=True)
    skills = serializers.JSONField(source="seeker_profile.skills", read_only=True)
    location = serializers.CharField(source="seeker_profile.preferred_location", read_only=True)
    availability = serializers.JSONField(source="seeker_profile.availability", read_only=True)
    match_percentage = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "name", "headline", "skills", "location", "availability", "trust_score", "verification_level", "match_percentage")

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    def get_match_percentage(self, obj):
        skills = obj.seeker_profile.skills or []
        completion = obj.seeker_profile.profile_completion
        return min(99, round(obj.trust_score * 0.45 + obj.verification_level * 8 + min(len(skills), 6) * 3 + completion * 0.15))


class SavedTalentSerializer(serializers.ModelSerializer):
    talent_details = TalentSerializer(source="talent", read_only=True)

    class Meta:
        model = SavedTalent
        fields = "__all__"
        read_only_fields = ("employer", "created_at", "updated_at")


class SavedTalentToggleSerializer(serializers.Serializer):
    talent_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.SEEKER, is_active=True), source="talent"
    )


class ServiceListingSerializer(serializers.ModelSerializer):
    provider_name = serializers.SerializerMethodField()
    provider_trust_score = serializers.IntegerField(source="provider.trust_score", read_only=True)
    provider_verification_level = serializers.IntegerField(source="provider.verification_level", read_only=True)

    class Meta:
        model = ServiceListing
        fields = "__all__"
        read_only_fields = ("provider", "created_at", "updated_at")

    def get_provider_name(self, obj):
        return obj.provider.get_full_name() or obj.provider.email

    def validate(self, attrs):
        if attrs.get("price", getattr(self.instance, "price", 0)) <= 0:
            raise serializers.ValidationError({"price": "Price must be greater than zero."})
        return attrs


class BookingSerializer(serializers.ModelSerializer):
    service_details = ServiceListingSerializer(source="service", read_only=True)

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = ("client", "status", "created_at", "updated_at")

    def validate(self, attrs):
        if attrs.get("start_time") and attrs.get("end_time") and attrs["start_time"] >= attrs["end_time"]:
            raise serializers.ValidationError({"end_time": "End time must be later than start time."})
        scheduled_date = attrs.get("scheduled_date")
        if scheduled_date and scheduled_date < timezone.localdate():
            raise serializers.ValidationError({"scheduled_date": "Choose today or a future date."})
        service = attrs.get("service")
        if service and service.status != ServiceListing.Status.ACTIVE:
            raise serializers.ValidationError({"service": "This service is not currently available."})
        return attrs


class BookingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Booking.Status.choices)


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True, default="System")

    class Meta:
        model = AuditLog
        fields = "__all__"
        read_only_fields = ("id", "actor", "action", "method", "path", "status_code", "ip_address", "user_agent", "created_at")


class PlatformSettingSerializer(serializers.ModelSerializer):
    updated_by_email = serializers.EmailField(source="updated_by.email", read_only=True)

    class Meta:
        model = PlatformSetting
        fields = "__all__"
        read_only_fields = ("updated_by", "created_at", "updated_at")


class UserActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAction
        fields = "__all__"
        read_only_fields = ("user", "created_at")

    def validate_label(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("An action label is required.")
        return value
