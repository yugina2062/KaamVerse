from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_seekerprofile_headline"),
    ]

    operations = [
        migrations.AddField(
            model_name="employerprofile",
            name="wanted_schedule",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
