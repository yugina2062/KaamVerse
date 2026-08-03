from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("accounts", "0004_email_preferences_and_verification_code")]
    operations = [
        migrations.CreateModel(
            name="PasswordResetCode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code_hash", models.CharField(max_length=128)), ("expires_at", models.DateTimeField()),
                ("attempts", models.PositiveSmallIntegerField(default=0)), ("last_sent_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="password_reset_code", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
