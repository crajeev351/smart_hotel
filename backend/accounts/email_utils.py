import logging
import json
from urllib import error, request

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


class EmailConfigurationError(Exception):
    pass


def _smtp_backend_is_configured():
    return bool(settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)


def _send_resend_mail(*, subject, message, recipient_list):
    if not settings.RESEND_API_KEY:
        raise EmailConfigurationError(
            'Resend email is missing RESEND_API_KEY on Render.'
        )

    payload = {
        'from': settings.DEFAULT_FROM_EMAIL,
        'to': recipient_list,
        'subject': subject,
        'text': message,
    }
    encoded_payload = json.dumps(payload).encode('utf-8')

    resend_request = request.Request(
        'https://api.resend.com/emails',
        data=encoded_payload,
        headers={
            'Authorization': f'Bearer {settings.RESEND_API_KEY}',
            'Content-Type': 'application/json',
            'User-Agent': 'smart-hotel/1.0',
        },
        method='POST',
    )

    try:
        with request.urlopen(resend_request, timeout=settings.EMAIL_TIMEOUT) as response:
            if response.status < 200 or response.status >= 300:
                raise EmailConfigurationError(
                    f'Resend email API returned HTTP {response.status}.'
                )
    except error.HTTPError as e:
        details = e.read().decode('utf-8', errors='replace')
        raise EmailConfigurationError(
            f'Resend email API returned HTTP {e.code}: {details}'
        ) from e
    except error.URLError as e:
        raise EmailConfigurationError(
            f'Could not reach Resend email API: {e.reason}'
        ) from e

    return len(recipient_list)


def send_configured_mail(*, subject, message, recipient_list):
    """Send mail through the configured production-capable provider."""
    if settings.EMAIL_PROVIDER == 'resend' or settings.RESEND_API_KEY:
        return _send_resend_mail(
            subject=subject,
            message=message,
            recipient_list=recipient_list,
        )

    email_backend = getattr(settings, 'EMAIL_BACKEND', '')

    if email_backend == 'django.core.mail.backends.console.EmailBackend':
        raise EmailConfigurationError(
            'Email is using the console backend, so no real email will be delivered. '
            'Set RESEND_API_KEY and EMAIL_PROVIDER=resend on Render, or use a paid Render service for SMTP.'
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
