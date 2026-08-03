from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("marketplace", "0008_workerreview"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SavedTalent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("employer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saved_talent", to=settings.AUTH_USER_MODEL)),
                ("talent", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saved_by_employers", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("-created_at",)},
        ),
        migrations.AddConstraint(
            model_name="savedtalent",
            constraint=models.UniqueConstraint(fields=("employer", "talent"), name="unique_saved_talent"),
        ),
    ]
