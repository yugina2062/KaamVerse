from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("marketplace", "0007_message_attachments"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkerReview",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("rating", models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])),
                ("feedback", models.TextField(max_length=2000)),
                ("application", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="worker_review", to="marketplace.application")),
                ("reviewer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="worker_reviews_given", to=settings.AUTH_USER_MODEL)),
                ("worker", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="worker_reviews_received", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("-created_at",)},
        ),
    ]
