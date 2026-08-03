from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Job(TimeStampedModel):
    class EmploymentType(models.TextChoices):
        PART_TIME = "part-time", "Part-time"
        FREELANCE = "freelance", "Freelance"
        GIG = "gig", "On-demand gig"
        SERVICE = "service", "Service"

    class WorkMode(models.TextChoices):
        ONSITE = "onsite", "Onsite"
        REMOTE = "remote", "Remote"
        HYBRID = "hybrid", "Hybrid"

    class ShiftType(models.TextChoices):
        MORNING = "morning", "Morning"
        DAY = "day", "Day"
        EVENING = "evening", "Evening"
        NIGHT = "night", "Night"
        WEEKEND = "weekend", "Weekend"
        FLEXIBLE = "flexible", "Flexible"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CLOSED = "closed", "Closed"

    employer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=180)
    category = models.CharField(max_length=80, default="General")
    description = models.TextField()
    employment_type = models.CharField(max_length=20, choices=EmploymentType.choices, default=EmploymentType.PART_TIME)
    work_mode = models.CharField(max_length=12, choices=WorkMode.choices, default=WorkMode.ONSITE)
    shift_type = models.CharField(max_length=12, choices=ShiftType.choices, default=ShiftType.FLEXIBLE)
    location = models.CharField(max_length=120)
    schedule = models.JSONField(default=dict, blank=True)
    skills = models.JSONField(default=list, blank=True)
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_period = models.CharField(max_length=20, default="month")
    positions = models.PositiveSmallIntegerField(default=1)
    is_urgent = models.BooleanField(default=False)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    rejection_reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="approved_jobs",
        null=True,
        blank=True,
    )
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-is_urgent", "-created_at")
        indexes = (
            models.Index(fields=("status", "employment_type")),
            models.Index(fields=("location", "shift_type")),
        )

    def clean(self):
        if self.salary_min is not None and self.salary_max is not None and self.salary_min > self.salary_max:
            raise ValidationError({"salary_max": "Maximum salary must be greater than or equal to minimum salary."})

    def __str__(self):
        return self.title


class Application(TimeStampedModel):
    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under-review", "Under review"
        INTERVIEW = "interview", "Interview"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        WITHDRAWN = "withdrawn", "Withdrawn"

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    seeker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    cover_letter = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    employer_notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = (
            models.UniqueConstraint(fields=("job", "seeker"), name="unique_job_application"),
        )

    def __str__(self):
        return f"{self.seeker.email} -> {self.job.title}"


class WorkerReview(TimeStampedModel):
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="worker_reviews_given")
    worker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="worker_reviews_received")
    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name="worker_review")
    rating = models.PositiveSmallIntegerField(validators=(MinValueValidator(1), MaxValueValidator(5)))
    feedback = models.TextField(max_length=2000)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.reviewer.email} reviewed {self.worker.email}"


class SavedJob(TimeStampedModel):
    seeker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_jobs")
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="saved_by")

    class Meta:
        ordering = ("-created_at",)
        constraints = (
            models.UniqueConstraint(fields=("seeker", "job"), name="unique_saved_job"),
        )


class SavedTalent(TimeStampedModel):
    employer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_talent")
    talent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_by_employers")

    class Meta:
        ordering = ("-created_at",)
        constraints = (
            models.UniqueConstraint(fields=("employer", "talent"), name="unique_saved_talent"),
        )

    def clean(self):
        if self.employer_id == self.talent_id:
            raise ValidationError("You cannot save your own profile.")


class FraudReport(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        INVESTIGATING = "investigating", "Investigating"
        RESOLVED = "resolved", "Resolved"
        DISMISSED = "dismissed", "Dismissed"

    class Reason(models.TextChoices):
        FAKE_JOB = "fake-job", "Fake job"
        FEE_REQUEST = "fee-request", "Upfront fee request"
        HARASSMENT = "harassment", "Harassment"
        IDENTITY = "identity", "Fake identity"
        SPAM = "spam", "Spam"
        OTHER = "other", "Other"

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fraud_reports")
    job = models.ForeignKey(Job, on_delete=models.SET_NULL, related_name="fraud_reports", null=True, blank=True)
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="reports_received",
        null=True,
        blank=True,
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolution_notes = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_reports",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ("-created_at",)


class Notification(models.Model):
    class EmailStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    category = models.CharField(max_length=40)
    title = models.CharField(max_length=180)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    email_status = models.CharField(max_length=12, choices=EmailStatus.choices, default=EmailStatus.PENDING)
    emailed_at = models.DateTimeField(null=True, blank=True)
    email_error = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (models.Index(fields=("recipient", "is_read")),)


class NotificationBroadcast(TimeStampedModel):
    class Audience(models.TextChoices):
        ALL = "all", "All users"
        SEEKERS = "seekers", "Job seekers"
        EMPLOYERS = "employers", "All employers"
        COMPANY_EMPLOYERS = "company-employers", "Company employers"
        INDIVIDUAL_EMPLOYERS = "individual-employers", "Individual employers"

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="notification_broadcasts")
    audience = models.CharField(max_length=24, choices=Audience.choices, default=Audience.ALL)
    category = models.CharField(max_length=40, default="information")
    title = models.CharField(max_length=180)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    send_email = models.BooleanField(default=True)
    is_marketing = models.BooleanField(default=False)
    recipient_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("-created_at",)


class Conversation(TimeStampedModel):
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="conversations")
    job = models.ForeignKey(Job, on_delete=models.SET_NULL, related_name="conversations", null=True, blank=True)
    subject = models.CharField(max_length=180, blank=True)

    class Meta:
        ordering = ("-updated_at",)


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    body = models.TextField(max_length=5000, blank=True)
    attachment = models.FileField(upload_to="messages/%Y/%m/", blank=True, null=True)
    attachment_name = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        indexes = (models.Index(fields=("conversation", "created_at")),)


class ServiceListing(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"

    provider = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="service_listings")
    title = models.CharField(max_length=180)
    category = models.CharField(max_length=80)
    description = models.TextField()
    location = models.CharField(max_length=120, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    price_unit = models.CharField(max_length=24, default="hour")
    availability = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ("-created_at",)


class Booking(TimeStampedModel):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        ACCEPTED = "accepted", "Accepted"
        IN_PROGRESS = "in-progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    service = models.ForeignKey(ServiceListing, on_delete=models.PROTECT, related_name="bookings")
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="service_bookings")
    scheduled_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.REQUESTED)

    class Meta:
        ordering = ("-created_at",)


class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="audit_logs", null=True, blank=True)
    action = models.CharField(max_length=80)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=255)
    status_code = models.PositiveSmallIntegerField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (models.Index(fields=("created_at", "status_code")),)


class PlatformSetting(TimeStampedModel):
    key = models.SlugField(max_length=80, unique=True)
    value = models.JSONField(default=dict)
    description = models.CharField(max_length=255, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="platform_settings_updated", null=True, blank=True)

    class Meta:
        ordering = ("key",)


class UserAction(models.Model):
    """Durable record for secondary UI actions that do not own a domain model yet."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_actions")
    label = models.CharField(max_length=120)
    detail = models.TextField(blank=True, max_length=5000)
    page = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (models.Index(fields=("user", "created_at")),)


class UserInteraction(models.Model):
    class Kind(models.TextChoices):
        VIEW = "view", "View"
        SAVE = "save", "Save"
        APPLY = "apply", "Apply"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="interactions")
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="interactions")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = (models.Index(fields=("user", "kind")),)
