import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


class EmailConfigurationError(Exception):
    pass


def _smtp_backend_is_configured():
    return bool(settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)


def send_configured_mail(*, subject, message, recipient_list):
    """Send mail only when a real SMTP backend is configured."""
    email_backend = getattr(settings, 'EMAIL_BACKEND', '')

    if email_backend == 'django.core.mail.backends.console.EmailBackend':
        raise EmailConfigurationError(
            'Email is using the console backend, so no real email will be delivered. '
            'Set EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, and EMAIL_BACKEND on Render.'
        )

    if email_backend == 'django.core.mail.backends.smtp.EmailBackend' and not _smtp_backend_is_configured():
        raise EmailConfigurationError(
            'SMTP email is missing EMAIL_HOST_USER or EMAIL_HOST_PASSWORD on Render.'
        )

    sent_count = send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', '') or settings.EMAIL_HOST_USER,
        recipient_list=recipient_list,
        fail_silently=False,
    )

    if sent_count < len(recipient_list):
        logger.warning(
            'Email backend accepted only %s of %s recipients for subject %r.',
            sent_count,
            len(recipient_list),
            subject,
        )

    return sent_count
