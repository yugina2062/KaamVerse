from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("marketplace", "0002_notifications_broadcasts_and_messages")]
    operations = [
        migrations.CreateModel(
            name="ServiceListing",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=180)), ("category", models.CharField(max_length=80)),
                ("description", models.TextField()), ("location", models.CharField(blank=True, max_length=120)),
                ("price", models.DecimalField(decimal_places=2, max_digits=12)), ("price_unit", models.CharField(default="hour", max_length=24)),
                ("availability", models.JSONField(blank=True, default=dict)),
                ("status", models.CharField(choices=[("active", "Active"), ("paused", "Paused")], default="active", max_length=12)),
                ("provider", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="service_listings", to=settings.AUTH_USER_MODEL)),
            ], options={"ordering": ("-created_at",)},
        ),
        migrations.CreateModel(
            name="Booking",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
                ("scheduled_date", models.DateField()), ("start_time", models.TimeField()), ("end_time", models.TimeField()),
                ("notes", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("requested", "Requested"), ("accepted", "Accepted"), ("in-progress", "In progress"), ("completed", "Completed"), ("cancelled", "Cancelled")], default="requested", max_length=16)),
                ("client", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="service_bookings", to=settings.AUTH_USER_MODEL)),
                ("service", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="bookings", to="marketplace.servicelisting")),
            ], options={"ordering": ("-created_at",)},
        ),
    ]
