from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import EmailVerificationCode, EmployerProfile, LoginActivity, PasswordResetCode, SecuritySession, SeekerProfile, TwoFactorCode, User, VerificationSubmission


@admin.register(User)
class KaamverseUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "trust_score", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff", "is_email_verified")
    search_fields = ("email", "first_name", "last_name", "phone")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identity", {"fields": ("first_name", "last_name", "phone", "preferred_language")}),
        ("Trust", {"fields": ("role", "trust_score", "verification_level", "is_email_verified", "is_phone_verified", "two_factor_enabled")}),
        ("Email preferences", {"fields": ("email_notifications", "email_job_alerts", "email_marketing")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2", "role", "is_staff")}),
    )


admin.site.register(SeekerProfile)
admin.site.register(EmployerProfile)
admin.site.register(VerificationSubmission)
admin.site.register(EmailVerificationCode)
admin.site.register(PasswordResetCode)
admin.site.register(TwoFactorCode)
admin.site.register(SecuritySession)
admin.site.register(LoginActivity)
