import secrets
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken

from .emails import send_branded_email
from .models import EmailVerificationCode, EmployerProfile, LoginActivity, PasswordResetCode, SecuritySession, TwoFactorCode, User, VerificationSubmission
from .serializers import (
    KaamverseTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
    VerificationReviewSerializer,
    VerificationSubmissionSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        from marketplace.services import create_notification
        create_notification(
            recipient=user,
            category="account",
            title="Welcome to KaamVerse",
            message="Your account was created successfully. Verify your email and complete your profile to start using trusted opportunities.",
            send_email=True,
        )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class KaamverseTokenObtainPairView(TokenObtainPairView):
    serializer_class = KaamverseTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class SessionTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        token = RefreshToken(attrs["refresh"])
        session_id = token.get("session_id")
        if session_id and not SecuritySession.objects.filter(id=session_id, revoked_at__isnull=True, expires_at__gt=timezone.now()).exists():
            raise InvalidToken("This session has been revoked. Sign in again.")
        return super().validate(attrs)


class SessionTokenRefreshView(TokenRefreshView):
    serializer_class = SessionTokenRefreshSerializer


def _send_two_factor_code(user, purpose="setup"):
    code = f"{secrets.randbelow(1_000_000):06d}"
    TwoFactorCode.objects.update_or_create(
        user=user,
        defaults={"code_hash": make_password(code), "purpose": purpose, "expires_at": timezone.now() + timedelta(minutes=10), "attempts": 0, "last_sent_at": timezone.now()},
    )
    send_branded_email(recipient=user.email, subject="Your KaamVerse security code", heading="Confirm two-factor authentication", message=f"Your six-digit security code is {code}. It expires in 10 minutes.")


class TwoFactorSendView(generics.GenericAPIView):
    def post(self, request):
        if request.user.two_factor_enabled:
            return Response({"detail": "Two-factor authentication is already enabled.", "two_factor_enabled": True})
        existing = TwoFactorCode.objects.filter(user=request.user).first()
        if existing and existing.last_sent_at > timezone.now() - timedelta(seconds=60):
            return Response({"detail": "Please wait before requesting another code."}, status=429)
        try:
            _send_two_factor_code(request.user)
        except Exception:
            TwoFactorCode.objects.filter(user=request.user, purpose="setup").delete()
            return Response({"detail": "We could not send the security code. Check the email configuration and try again."}, status=503)
        return Response({"detail": "A two-factor setup code was sent to your email."})


class TwoFactorConfirmView(generics.GenericAPIView):
    def post(self, request):
        code = str(request.data.get("code", "")).strip()
        if not code.isdigit() or len(code) != 6:
            return Response({"detail": "Enter the six-digit code from your email."}, status=400)
        verification = TwoFactorCode.objects.filter(user=request.user, purpose="setup").first()
        if not verification or verification.expires_at <= timezone.now() or verification.attempts >= 5:
            return Response({"detail": "The security code is invalid or expired."}, status=400)
        if not check_password(code, verification.code_hash):
            verification.attempts += 1
            verification.save(update_fields=("attempts",))
            return Response({"detail": "The security code is incorrect."}, status=400)
        request.user.two_factor_enabled = True
        request.user.save(update_fields=("two_factor_enabled", "updated_at"))
        verification.delete()
        return Response({"two_factor_enabled": True})


class TwoFactorDisableView(generics.GenericAPIView):
    def post(self, request):
        if not request.user.check_password(str(request.data.get("password", ""))):
            return Response({"detail": "The account password is incorrect."}, status=400)
        request.user.two_factor_enabled = False
        request.user.save(update_fields=("two_factor_enabled", "updated_at"))
        TwoFactorCode.objects.filter(user=request.user).delete()
        return Response({"two_factor_enabled": False})


class SecurityOverviewView(generics.GenericAPIView):
    def get(self, request):
        current_id = str(request.auth.get("session_id", "")) if request.auth else ""
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        ip_address = forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:255]

        # Backfill tokens issued before device-session tracking was introduced.
        if not current_id:
            current_session = SecuritySession.objects.filter(
                user=request.user,
                ip_address=ip_address,
                user_agent=user_agent,
                revoked_at__isnull=True,
                expires_at__gt=timezone.now(),
            ).first()
            if not current_session:
                current_session = SecuritySession.objects.create(
                    user=request.user,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    expires_at=timezone.now() + timedelta(days=7),
                )
            current_id = str(current_session.id)
            LoginActivity.objects.get_or_create(
                user=request.user,
                session=current_session,
                defaults={"ip_address": ip_address, "user_agent": user_agent, "successful": True},
            )
        else:
            current_session = SecuritySession.objects.filter(id=current_id, user=request.user).first()
            if current_session:
                LoginActivity.objects.get_or_create(
                    user=request.user,
                    session=current_session,
                    defaults={
                        "ip_address": current_session.ip_address,
                        "user_agent": current_session.user_agent,
                        "successful": True,
                    },
                )

        sessions = SecuritySession.objects.filter(user=request.user, revoked_at__isnull=True, expires_at__gt=timezone.now())
        activities = LoginActivity.objects.filter(user=request.user)[:50]
        session_data = [{"id": str(item.id), "ip_address": item.ip_address, "user_agent": item.user_agent, "created_at": item.created_at, "last_seen_at": item.last_seen_at, "current": str(item.id) == current_id} for item in sessions]
        return Response({
            "two_factor_enabled": request.user.two_factor_enabled,
            "sessions": session_data,
            "login_history": [{"id": item.id, "ip_address": item.ip_address, "user_agent": item.user_agent, "successful": item.successful, "created_at": item.created_at} for item in activities],
        })


class SecuritySessionDetailView(generics.GenericAPIView):
    def delete(self, request, session_id):
        session = SecuritySession.objects.filter(id=session_id, user=request.user, revoked_at__isnull=True).first()
        if not session:
            return Response({"detail": "Session not found."}, status=404)
        session.revoked_at = timezone.now()
        session.save(update_fields=("revoked_at",))
        return Response(status=status.HTTP_204_NO_CONTENT)


class LoginHistoryClearView(generics.GenericAPIView):
    def delete(self, request):
        deleted, _ = LoginActivity.objects.filter(user=request.user).delete()
        return Response({"deleted": deleted})


class EmailVerificationSendView(generics.GenericAPIView):
    def post(self, request):
        if request.user.is_email_verified:
            return Response({"detail": "Your email address is already verified.", "verified": True})
        existing = EmailVerificationCode.objects.filter(user=request.user).first()
        if existing and existing.last_sent_at > timezone.now() - timedelta(seconds=60):
            retry_after = max(1, 60 - int((timezone.now() - existing.last_sent_at).total_seconds()))
            return Response({"detail": f"Please wait {retry_after} seconds before requesting another code.", "retry_after": retry_after}, status=429)
        code = f"{secrets.randbelow(1_000_000):06d}"
        verification, _ = EmailVerificationCode.objects.update_or_create(
            user=request.user,
            defaults={
                "code_hash": make_password(code),
                "expires_at": timezone.now() + timedelta(minutes=10),
                "attempts": 0,
                "last_sent_at": timezone.now(),
                "verified_at": None,
            },
        )
        try:
            send_branded_email(
                recipient=request.user.email,
                subject="Your KaamVerse verification code",
                heading="Verify your email address",
                message=f"Your six-digit verification code is {code}. It expires in 10 minutes. Never share this code with anyone.",
            )
        except Exception:
            verification.delete()
            return Response({"detail": "We could not send the verification email. Check SMTP configuration and try again."}, status=503)
        return Response({"detail": "A six-digit verification code was sent to your email.", "expires_in": 600})


class EmailVerificationConfirmView(generics.GenericAPIView):
    def post(self, request):
        code = str(request.data.get("code", "")).strip()
        if not code.isdigit() or len(code) != 6:
            return Response({"detail": "Enter the six-digit code from your email."}, status=400)
        verification = EmailVerificationCode.objects.filter(user=request.user).first()
        if not verification or verification.expires_at <= timezone.now():
            return Response({"detail": "The verification code has expired. Request a new code."}, status=400)
        if verification.attempts >= 5:
            return Response({"detail": "Too many incorrect attempts. Request a new code."}, status=429)
        if not check_password(code, verification.code_hash):
            verification.attempts += 1
            verification.save(update_fields=("attempts",))
            return Response({"detail": "The verification code is incorrect."}, status=400)
        request.user.is_email_verified = True
        request.user.save(update_fields=("is_email_verified", "updated_at"))
        verification.verified_at = timezone.now()
        verification.save(update_fields=("verified_at",))
        from marketplace.services import create_notification
        create_notification(
            recipient=request.user,
            category="verification",
            title="Email verified",
            message="Your email address has been verified successfully.",
            send_email=False,
        )
        return Response({"verified": True})


class PhoneVerificationSendView(generics.GenericAPIView):
    def post(self, request):
        if not request.user.phone:
            return Response({"detail": "Add a phone number before requesting verification."}, status=400)
        code = f"{secrets.randbelow(1_000_000):06d}"
        cache.set(f"phone-verification:{request.user.pk}", code, timeout=600)
        payload = {"detail": "Verification code sent. SMS delivery is mocked in local development."}
        if settings.DEBUG:
            payload["development_code"] = code
        return Response(payload)


class PhoneVerificationConfirmView(generics.GenericAPIView):
    def post(self, request):
        expected = cache.get(f"phone-verification:{request.user.pk}")
        submitted = str(request.data.get("code", ""))
        if not expected or not secrets.compare_digest(expected, submitted):
            return Response({"detail": "The verification code is invalid or expired."}, status=400)
        request.user.is_phone_verified = True
        request.user.save(update_fields=("is_phone_verified", "updated_at"))
        cache.delete(f"phone-verification:{request.user.pk}")
        return Response({"verified": True})


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class PasswordChangeView(generics.GenericAPIView):
    def post(self, request):
        current_password = str(request.data.get("current_password", ""))
        new_password = str(request.data.get("new_password", ""))
        if not request.user.check_password(current_password):
            return Response({"detail": "The current password is incorrect."}, status=400)
        if len(new_password) < 8:
            return Response({"detail": "The new password must contain at least 8 characters."}, status=400)
        if current_password == new_password:
            return Response({"detail": "Choose a password different from the current password."}, status=400)
        try:
            validate_password(new_password, user=request.user)
        except ValidationError as exc:
            return Response({"detail": list(exc.messages)}, status=400)
        request.user.set_password(new_password)
        request.user.save(update_fields=("password", "updated_at"))
        current_session = str(request.auth.get("session_id", "")) if request.auth else ""
        sessions = SecuritySession.objects.filter(user=request.user, revoked_at__isnull=True)
        if current_session:
            sessions = sessions.exclude(id=current_session)
        sessions.update(revoked_at=timezone.now())
        return Response({"detail": "Password changed successfully."})


class PasswordResetRequestView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        user = User.objects.filter(email=email, is_active=True).first()
        generic = {"detail": "If an active account uses this email, a six-digit reset code has been sent."}
        if not user:
            return Response(generic)
        existing = PasswordResetCode.objects.filter(user=user).first()
        if existing and existing.last_sent_at > timezone.now() - timedelta(seconds=60):
            return Response(generic)
        code = f"{secrets.randbelow(1_000_000):06d}"
        reset, _ = PasswordResetCode.objects.update_or_create(
            user=user,
            defaults={"code_hash": make_password(code), "expires_at": timezone.now() + timedelta(minutes=15), "attempts": 0, "last_sent_at": timezone.now(), "used_at": None},
        )
        try:
            send_branded_email(recipient=user.email, subject="Your KaamVerse password reset code", heading="Reset your password", message=f"Your six-digit password reset code is {code}. It expires in 15 minutes. If you did not request this, you can ignore this email.")
        except Exception:
            reset.delete()
            return Response({"detail": "The reset email could not be delivered. Please try again later."}, status=503)
        return Response(generic)


class PasswordResetConfirmView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        code = str(request.data.get("code", "")).strip()
        new_password = str(request.data.get("new_password", ""))
        user = User.objects.filter(email=email, is_active=True).first()
        reset = PasswordResetCode.objects.filter(user=user).first() if user else None
        if not reset or reset.used_at or reset.expires_at <= timezone.now():
            return Response({"detail": "The reset code is invalid or expired."}, status=400)
        if reset.attempts >= 5:
            return Response({"detail": "Too many incorrect attempts. Request a new code."}, status=429)
        if not code.isdigit() or len(code) != 6 or not check_password(code, reset.code_hash):
            reset.attempts += 1
            reset.save(update_fields=("attempts",))
            return Response({"detail": "The reset code is incorrect."}, status=400)
        try:
            validate_password(new_password, user=user)
        except ValidationError as exc:
            return Response({"detail": list(exc.messages)}, status=400)
        user.set_password(new_password)
        user.save(update_fields=("password", "updated_at"))
        SecuritySession.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=timezone.now())
        reset.used_at = timezone.now()
        reset.save(update_fields=("used_at",))
        from marketplace.services import create_notification
        create_notification(recipient=user, category="security", title="Password changed", message="Your KaamVerse password was reset successfully. If this was not you, contact support immediately.", send_email=True, force_email=True)
        return Response({"detail": "Password reset successfully."})


class ResumeView(generics.GenericAPIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        if request.user.role != User.Role.SEEKER or not hasattr(request.user, "seeker_profile"):
            return Response({"detail": "A job-seeker account is required."}, status=403)
        resume = request.FILES.get("resume")
        if not resume:
            return Response({"detail": "Choose a resume file to upload."}, status=400)
        extension = resume.name.rsplit(".", 1)[-1].lower() if "." in resume.name else ""
        if extension not in {"pdf", "doc", "docx", "txt"}:
            return Response({"detail": "Upload a PDF, DOC, DOCX, or TXT resume."}, status=400)
        if resume.size > 8 * 1024 * 1024:
            return Response({"detail": "The resume must be 8 MB or smaller."}, status=400)
        profile = request.user.seeker_profile
        if profile.resume:
            profile.resume.delete(save=False)
        profile.resume = resume
        profile.profile_completion = max(profile.profile_completion, 70)
        profile.save(update_fields=("resume", "profile_completion"))
        
        from accounts.resume_parser import analyze_resume_file
        analysis = analyze_resume_file(profile.resume, profile)

        data = UserSerializer(request.user, context={"request": request}).data
        data["resume_analysis"] = analysis
        return Response(data)

    def delete(self, request):
        if request.user.role != User.Role.SEEKER or not hasattr(request.user, "seeker_profile"):
            return Response({"detail": "A job-seeker account is required."}, status=403)
        profile = request.user.seeker_profile
        if profile.resume:
            profile.resume.delete(save=False)
            profile.resume = ""
            profile.save(update_fields=("resume",))
        return Response(status=status.HTTP_204_NO_CONTENT)


class AvatarView(generics.GenericAPIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response({"detail": "Choose an image to upload."}, status=400)
        extension = avatar.name.rsplit(".", 1)[-1].lower() if "." in avatar.name else ""
        if extension not in {"jpg", "jpeg", "png", "webp"} or not str(avatar.content_type).startswith("image/"):
            return Response({"detail": "Upload a JPG, PNG, or WebP image."}, status=400)
        if avatar.size > 3 * 1024 * 1024:
            return Response({"detail": "The profile image must be 3 MB or smaller."}, status=400)
        if request.user.avatar:
            request.user.avatar.delete(save=False)
        request.user.avatar = avatar
        request.user.save(update_fields=("avatar", "updated_at"))
        return Response(UserSerializer(request.user, context={"request": request}).data)

    def delete(self, request):
        if request.user.avatar:
            request.user.avatar.delete(save=False)
            request.user.avatar = ""
            request.user.save(update_fields=("avatar", "updated_at"))
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserManagementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    search_fields = ("email", "first_name", "last_name", "phone")
    ordering_fields = ("created_at", "trust_score", "email")

    def get_queryset(self):
        if self.request.user.role != User.Role.ADMIN:
            return User.objects.none()
        return User.objects.select_related("seeker_profile", "employer_profile").all().order_by("-created_at")

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=("post",))
    def suspend(self, request, pk=None):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Administrator access is required."}, status=403)
        user = self.get_object()
        if user == request.user:
            return Response({"detail": "You cannot suspend your own administrator account."}, status=400)
        user.is_active = False
        user.save(update_fields=("is_active", "updated_at"))
        from marketplace.services import create_notification
        reason = str(request.data.get("reason", "")).strip() or "Your account was suspended by a KaamVerse administrator. Contact support if you believe this is a mistake."
        create_notification(recipient=user, category="account-suspension", title="Account suspended", message=reason, send_email=True, force_email=True)
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=("post",))
    def activate(self, request, pk=None):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Administrator access is required."}, status=403)
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=("is_active", "updated_at"))
        from marketplace.services import create_notification
        create_notification(recipient=user, category="account", title="Account reactivated", message="Your KaamVerse account has been reactivated. You can sign in again.", send_email=True, force_email=True)
        return Response(UserSerializer(user).data)


class VerificationSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = VerificationSubmissionSerializer
    http_method_names = ("get", "post", "head", "options")

    def get_queryset(self):
        queryset = VerificationSubmission.objects.select_related("user", "reviewed_by")
        if self.request.user.role == User.Role.ADMIN:
            return queryset
        return queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=("post",), serializer_class=VerificationReviewSerializer)
    def review(self, request, pk=None):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Administrator access is required."}, status=403)
        submission = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission.status = serializer.validated_data["status"]
        submission.notes = serializer.validated_data.get("notes", "")
        submission.reviewed_by = request.user
        submission.reviewed_at = timezone.now()
        submission.save()
        if hasattr(submission.user, "employer_profile"):
            profile = submission.user.employer_profile
            profile.verification_status = (
                EmployerProfile.VerificationStatus.APPROVED
                if submission.status == VerificationSubmission.Status.APPROVED
                else EmployerProfile.VerificationStatus.REJECTED
            )
            profile.rejection_reason = submission.notes if submission.status == VerificationSubmission.Status.REJECTED else ""
            profile.save()
        from marketplace.services import create_notification
        create_notification(
            recipient=submission.user,
            category="verification",
            title=f"Verification {submission.get_status_display().lower()}",
            message=submission.notes or f"Your {submission.document_type} verification was {submission.get_status_display().lower()}.",
            send_email=True,
        )
        return Response(VerificationSubmissionSerializer(submission, context={"request": request}).data)
