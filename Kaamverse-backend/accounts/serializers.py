from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from datetime import timedelta
import secrets
import uuid
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .emails import send_branded_email
from .models import EmployerProfile, LoginActivity, SecuritySession, SeekerProfile, TwoFactorCode, User, VerificationSubmission


class SeekerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeekerProfile
        exclude = ("id", "user")


class EmployerProfileSerializer(serializers.ModelSerializer):
    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = EmployerProfile
        exclude = ("id", "user")
        read_only_fields = ("verification_status", "rejection_reason")


class UserSerializer(serializers.ModelSerializer):
    seeker_profile = SeekerProfileSerializer(required=False)
    employer_profile = EmployerProfileSerializer(required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "phone",
            "first_name",
            "last_name",
            "role",
            "preferred_language",
            "trust_score",
            "verification_level",
            "is_email_verified",
            "is_phone_verified",
            "two_factor_enabled",
            "email_notifications",
            "email_job_alerts",
            "email_marketing",
            "date_of_birth",
            "avatar",
            "is_active",
            "created_at",
            "seeker_profile",
            "employer_profile",
        )
        read_only_fields = (
            "id",
            "email",
            "role",
            "trust_score",
            "verification_level",
            "is_email_verified",
            "is_phone_verified",
            "two_factor_enabled",
            "is_active",
            "created_at",
        )

    def validate_phone(self, value):
        value = value.strip() if value else None
        if value and User.objects.exclude(pk=getattr(self.instance, "pk", None)).filter(phone=value).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        return value

    def update(self, instance, validated_data):
        seeker_data = validated_data.pop("seeker_profile", None)
        employer_data = validated_data.pop("employer_profile", None)
        instance = super().update(instance, validated_data)
        if seeker_data is not None and hasattr(instance, "seeker_profile"):
            for field, value in seeker_data.items():
                setattr(instance.seeker_profile, field, value)
            instance.seeker_profile.save()
        if employer_data is not None and hasattr(instance, "employer_profile"):
            for field, value in employer_data.items():
                setattr(instance.employer_profile, field, value)
            instance.employer_profile.save()
        return instance


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, validators=[validate_password])
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, allow_blank=True, required=False)
    phone = serializers.CharField(max_length=24, allow_blank=True, required=False)
    role = serializers.ChoiceField(
        choices=(User.Role.SEEKER, User.Role.EMPLOYER, User.Role.EMPLOYER_INDIVIDUAL)
    )
    preferred_language = serializers.ChoiceField(choices=("en", "np"), default="en")
    profile = serializers.JSONField(default=dict)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_phone(self, value):
        value = value.strip() or None
        if value and User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        profile_data = validated_data.pop("profile", {})
        user = User.objects.create_user(**validated_data)
        if user.role == User.Role.SEEKER:
            allowed = {
                key: profile_data[key]
                for key in ("education", "skills", "preferred_job_types", "availability", "preferred_location")
                if key in profile_data
            }
            SeekerProfile.objects.create(user=user, **allowed)
        else:
            allowed = {
                key: profile_data[key]
                for key in (
                    "business_name",
                    "registration_number",
                    "pan_vat_number",
                    "contact_person",
                    "industry",
                    "company_size",
                    "website",
                    "address",
                    "city",
                )
                if key in profile_data
            }
            EmployerProfile.objects.create(user=user, **allowed)
        return user


class KaamverseTokenObtainPairSerializer(TokenObtainPairSerializer):
    two_factor_code = serializers.CharField(required=False, allow_blank=True, write_only=True)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["session_id"] = str(uuid.uuid4())
        return token

    def validate(self, attrs):
        submitted_code = str(attrs.pop("two_factor_code", "")).strip()
        identifier = attrs.get(self.username_field, "")
        if identifier and "@" not in identifier:
            user = User.objects.filter(phone=identifier).only("email").first()
            if user:
                attrs[self.username_field] = user.email
        data = super().validate(attrs)
        if self.user.two_factor_enabled:
            verification = TwoFactorCode.objects.filter(user=self.user, purpose="login").first()
            valid = bool(
                submitted_code
                and verification
                and verification.expires_at > timezone.now()
                and verification.attempts < 5
                and check_password(submitted_code, verification.code_hash)
            )
            if not valid:
                if submitted_code and verification:
                    verification.attempts += 1
                    verification.save(update_fields=("attempts",))
                if not verification or verification.expires_at <= timezone.now() or verification.last_sent_at < timezone.now() - timedelta(seconds=60):
                    code = f"{secrets.randbelow(1_000_000):06d}"
                    TwoFactorCode.objects.update_or_create(
                        user=self.user,
                        defaults={"code_hash": make_password(code), "purpose": "login", "expires_at": timezone.now() + timedelta(minutes=10), "attempts": 0, "last_sent_at": timezone.now()},
                    )
                    send_branded_email(recipient=self.user.email, subject="Your KaamVerse login code", heading="Confirm your sign in", message=f"Your two-factor login code is {code}. It expires in 10 minutes. If this was not you, change your password immediately.")
                raise serializers.ValidationError({"detail": "Two-factor verification code required. A code was sent to your email.", "two_factor_required": True})
            verification.delete()
        request = self.context.get("request")
        refresh = RefreshToken(data["refresh"])
        session_id = refresh.get("session_id")
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "") if request else ""
        ip_address = (forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")) if request else None
        session = SecuritySession.objects.create(
            id=session_id,
            user=self.user,
            ip_address=ip_address,
            user_agent=(request.META.get("HTTP_USER_AGENT", "")[:255] if request else ""),
            expires_at=timezone.now() + timedelta(days=7),
        )
        LoginActivity.objects.create(user=self.user, session=session, ip_address=ip_address, user_agent=session.user_agent)
        data["user"] = UserSerializer(self.user).data
        return data


class VerificationSubmissionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    reviewed_by_email = serializers.EmailField(source="reviewed_by.email", read_only=True)

    class Meta:
        model = VerificationSubmission
        fields = "__all__"
        read_only_fields = ("user", "status", "notes", "reviewed_by", "reviewed_at", "created_at")

    def validate_document(self, document):
        extension = document.name.rsplit(".", 1)[-1].lower() if "." in document.name else ""
        if extension not in {"jpg", "jpeg", "png", "pdf"}:
            raise serializers.ValidationError("Upload a JPG, PNG, or PDF document.")
        if document.size > 8 * 1024 * 1024:
            raise serializers.ValidationError("The document must be 8 MB or smaller.")
        return document

    def validate_document_type(self, value):
        normalized = value.strip().lower().replace("-", "_")
        if any(term in normalized for term in ("face", "selfie", "biometric")):
            raise serializers.ValidationError("Face authentication is not enabled. Submit an identity or professional document instead.")
        return value


class VerificationReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=(VerificationSubmission.Status.APPROVED, VerificationSubmission.Status.REJECTED)
    )
    notes = serializers.CharField(required=False, allow_blank=True)
