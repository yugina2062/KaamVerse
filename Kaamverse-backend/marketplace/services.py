import logging

from django.utils import timezone

from accounts.emails import send_branded_email
from .models import Notification


logger = logging.getLogger(__name__)


def create_notification(
    *,
    recipient,
    category: str,
    title: str,
    message: str,
    link: str = "",
    send_email: bool = True,
    force_email: bool = False,
    marketing: bool = False,
    job_alert: bool = False,
) -> Notification:
    notification = Notification.objects.create(
        recipient=recipient,
        category=category,
        title=title,
        message=message,
        link=link,
        email_status=Notification.EmailStatus.PENDING if send_email else Notification.EmailStatus.SKIPPED,
    )
    allowed = force_email or (
        recipient.email_notifications
        and (not marketing or recipient.email_marketing)
        and (not job_alert or recipient.email_job_alerts)
    )
    if not send_email or not allowed or not recipient.email or recipient.email.lower().endswith(".local"):
        notification.email_status = Notification.EmailStatus.SKIPPED
        notification.save(update_fields=("email_status",))
        return notification
    try:
        send_branded_email(
            recipient=recipient.email,
            subject=f"KaamVerse: {title}",
            heading=title,
            message=message,
            action_label="Open KaamVerse" if link else "",
            action_url=link,
        )
        notification.email_status = Notification.EmailStatus.SENT
        notification.emailed_at = timezone.now()
        notification.email_error = ""
        notification.save(update_fields=("email_status", "emailed_at", "email_error"))
    except Exception as exc:  # Notification delivery must not roll back marketplace actions.
        logger.exception("Notification email delivery failed for user %s", recipient.pk)
        notification.email_status = Notification.EmailStatus.FAILED
        notification.email_error = str(exc)[:255]
        notification.save(update_fields=("email_status", "email_error"))
    return notification
