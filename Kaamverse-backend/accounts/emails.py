import logging
from html import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives


logger = logging.getLogger(__name__)


def send_branded_email(*, recipient: str, subject: str, heading: str, message: str, action_label: str = "", action_url: str = "") -> None:
    safe_heading = escape(heading)
    safe_message = escape(message).replace("\n", "<br>")
    action = ""
    if action_label and action_url:
        action = f'<p style="margin:28px 0"><a href="{escape(action_url, quote=True)}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">{escape(action_label)}</a></p>'
    html = f"""
    <!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
      <div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #dbeafe;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:22px 28px;color:#fff;font-size:22px;font-weight:800">KaamVerse</div>
        <div style="padding:30px 28px"><h1 style="font-size:22px;margin:0 0 16px">{safe_heading}</h1><p style="font-size:15px;line-height:1.7;color:#475569">{safe_message}</p>{action}<p style="font-size:12px;color:#94a3b8;margin-top:28px">This message was sent by KaamVerse. Important account and safety messages cannot be disabled.</p></div>
      </div>
    </body></html>
    """
    email = EmailMultiAlternatives(
        subject=subject,
        body=f"{heading}\n\n{message}\n\n{action_url if action_url else ''}".strip(),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )
    email.attach_alternative(html, "text/html")
    email.send(fail_silently=False)
