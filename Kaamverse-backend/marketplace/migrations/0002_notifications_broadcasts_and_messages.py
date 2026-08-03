from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_email_preferences_and_verification_code"),
        ("marketplace", "0001_initial"),
    ]

    operations = [
        migrations.AddField(model_name="notification", name="email_error", field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name="notification", name="email_status", field=models.CharField(choices=[("pending", "Pending"), ("sent", "Sent"), ("failed", "Failed"), ("skipped", "Skipped")], default="pending", max_length=12)),
        migrations.AddField(model_name="notification", name="emailed_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.CreateModel(
            name="Conversation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("subject", models.CharField(blank=True, max_length=180)),
                ("job", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="conversations", to="marketplace.job")),
                ("participants", models.ManyToManyField(related_name="conversations", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("-updated_at",)},
        ),
        migrations.CreateModel(
            name="NotificationBroadcast",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("audience", models.CharField(choices=[("all", "All users"), ("seekers", "Job seekers"), ("employers", "All employers"), ("company-employers", "Company employers"), ("individual-employers", "Individual employers")], default="all", max_length=24)),
                ("category", models.CharField(default="information", max_length=40)),
                ("title", models.CharField(max_length=180)),
                ("message", models.TextField()),
                ("link", models.CharField(blank=True, max_length=255)),
                ("send_email", models.BooleanField(default=True)),
                ("is_marketing", models.BooleanField(default=False)),
                ("recipient_count", models.PositiveIntegerField(default=0)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="notification_broadcasts", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("-created_at",)},
        ),
        migrations.CreateModel(
            name="Message",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField(max_length=5000)),
                ("is_read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="marketplace.conversation")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sent_messages", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("created_at",)},
        ),
        migrations.AddIndex(model_name="message", index=models.Index(fields=["conversation", "created_at"], name="marketplace_convers_64eb0c_idx")),
    ]
