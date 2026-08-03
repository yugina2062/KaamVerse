from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("marketplace", "0006_job_category"),
    ]

    operations = [
        migrations.AlterField(
            model_name="message",
            name="body",
            field=models.TextField(blank=True, max_length=5000),
        ),
        migrations.AddField(
            model_name="message",
            name="attachment",
            field=models.FileField(blank=True, null=True, upload_to="messages/%Y/%m/"),
        ),
        migrations.AddField(
            model_name="message",
            name="attachment_name",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
