from django.contrib import admin

from .models import Application, AuditLog, Booking, Conversation, FraudReport, Job, Message, Notification, NotificationBroadcast, PlatformSetting, SavedJob, SavedTalent, ServiceListing, UserAction, UserInteraction, WorkerReview


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("title", "employer", "employment_type", "location", "shift_type", "status", "created_at")
    list_filter = ("status", "employment_type", "work_mode", "shift_type", "is_urgent")
    search_fields = ("title", "description", "location", "employer__email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("job", "seeker", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("job__title", "seeker__email")


@admin.register(FraudReport)
class FraudReportAdmin(admin.ModelAdmin):
    list_display = ("reason", "reporter", "job", "status", "created_at")
    list_filter = ("status", "reason")
    search_fields = ("reporter__email", "job__title", "description")


admin.site.register(SavedJob)
admin.site.register(SavedTalent)
admin.site.register(Notification)
admin.site.register(UserInteraction)
admin.site.register(NotificationBroadcast)
admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(ServiceListing)
admin.site.register(Booking)
admin.site.register(AuditLog)
admin.site.register(PlatformSetting)
admin.site.register(UserAction)
admin.site.register(WorkerReview)
