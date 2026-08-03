from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_employerprofile_wanted_schedule"),
    ]

    operations = [
        migrations.AddField(model_name="user", name="email_notifications", field=models.BooleanField(default=True)),
        migrations.AddField(model_name="user", name="email_job_alerts", field=models.BooleanField(default=True)),
        migrations.AddField(model_name="user", name="email_marketing", field=models.BooleanField(default=False)),
        migrations.CreateModel(
            name="EmailVerificationCode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code_hash", models.CharField(max_length=128)),
                ("expires_at", models.DateTimeField()),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("last_sent_at", models.DateTimeField()),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="email_verification_code", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
