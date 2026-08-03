from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
import uuid


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_email_verified", True)
        if extra_fields.get("is_staff") is not True or extra_fields.get("is_superuser") is not True:
            raise ValueError("A superuser must have is_staff=True and is_superuser=True.")
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        SEEKER = "seeker", "Job seeker"
        EMPLOYER = "employer", "Company employer"
        EMPLOYER_INDIVIDUAL = "employer-individual", "Individual employer"
        ADMIN = "admin", "Administrator"

    username = None
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=24, unique=True, null=True, blank=True)
    role = models.CharField(max_length=24, choices=Role.choices, default=Role.SEEKER)
    preferred_language = models.CharField(
        max_length=2,
        choices=(("en", "English"), ("np", "Nepali")),
        default="en",
    )
    trust_score = models.PositiveSmallIntegerField(
        default=20,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    verification_level = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(0), MaxValueValidator(4)],
    )
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    email_notifications = models.BooleanField(default=True)
    email_job_alerts = models.BooleanField(default=True)
    email_marketing = models.BooleanField(default=False)
    date_of_birth = models.DateField(null=True, blank=True)
    avatar = models.FileField(upload_to="avatars/%Y/%m/", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self):
        return self.email


class SeekerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="seeker_profile")
    education = models.CharField(max_length=255, blank=True)
    headline = models.CharField(max_length=160, blank=True)
    bio = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    preferred_job_types = models.JSONField(default=list, blank=True)
    availability = models.JSONField(default=dict, blank=True)
    preferred_location = models.CharField(max_length=120, blank=True)
    resume = models.FileField(upload_to="resumes/%Y/%m/", blank=True)
    profile_completion = models.PositiveSmallIntegerField(default=20)

    def __str__(self):
        return f"Seeker profile: {self.user.email}"


class EmployerProfile(models.Model):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employer_profile")
    business_name = models.CharField(max_length=180, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    pan_vat_number = models.CharField(max_length=100, blank=True)
    contact_person = models.CharField(max_length=150, blank=True)
    industry = models.CharField(max_length=120, blank=True)
    company_size = models.CharField(max_length=80, blank=True)
    website = models.URLField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    wanted_schedule = models.JSONField(default=dict, blank=True)
    verification_status = models.CharField(
        max_length=16,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    rejection_reason = models.TextField(blank=True)

    @property
    def is_verified(self):
        return self.verification_status == self.VerificationStatus.APPROVED

    def __str__(self):
        return self.business_name or self.user.get_full_name() or self.user.email


class VerificationSubmission(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="verification_submissions")
    document_type = models.CharField(max_length=80)
    document = models.FileField(upload_to="verification/%Y/%m/")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="reviewed_verifications",
        null=True,
        blank=True,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.user.email} - {self.document_type}"


class EmailVerificationCode(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="email_verification_code")
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    last_sent_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Email verification for {self.user.email}"


class PasswordResetCode(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="password_reset_code")
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    last_sent_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Password reset for {self.user.email}"


class TwoFactorCode(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="two_factor_code")
    code_hash = models.CharField(max_length=128)
    purpose = models.CharField(max_length=16, default="setup")
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    last_sent_at = models.DateTimeField()


class SecuritySession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="security_sessions")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-last_seen_at",)


class LoginActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="login_activities")
    session = models.ForeignKey(SecuritySession, on_delete=models.SET_NULL, related_name="activities", null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    successful = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
