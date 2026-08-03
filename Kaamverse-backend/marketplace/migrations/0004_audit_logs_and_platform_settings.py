from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("marketplace", "0003_services_and_bookings")]
    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(max_length=80)), ("method", models.CharField(max_length=10)),
                ("path", models.CharField(max_length=255)), ("status_code", models.PositiveSmallIntegerField()),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)), ("user_agent", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to=settings.AUTH_USER_MODEL)),
            ], options={"ordering": ("-created_at",)},
        ),
        migrations.AddIndex(model_name="auditlog", index=models.Index(fields=["created_at", "status_code"], name="marketplace_created_3facf9_idx")),
        migrations.CreateModel(
            name="PlatformSetting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
                ("key", models.SlugField(max_length=80, unique=True)), ("value", models.JSONField(default=dict)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="platform_settings_updated", to=settings.AUTH_USER_MODEL)),
            ], options={"ordering": ("key",)},
        ),
    ]
