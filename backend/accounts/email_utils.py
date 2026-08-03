import logging
import json
from urllib import error, request

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, send_mail

logger = logging.getLogger(__name__)


class EmailConfigurationError(Exception):
    pass


def _smtp_backend_is_configured():
    return bool(settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)


def _send_resend_mail(*, subject, message, recipient_list, html_message=None):
    resend_key = getattr(settings, 'RESEND_API_KEY', '')
    if not resend_key:
        raise EmailConfigurationError(
            'Resend email is missing RESEND_API_KEY. Set RESEND_API_KEY on Render or in environment.'
        )

    valid_recipients = [
        addr.strip() for addr in recipient_list if addr and isinstance(addr, str) and '@' in addr
    ]
    if not valid_recipients:
        logger.warning('No valid recipient emails provided for Resend email: %s', subject)
        return 0

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or 'Smart Hotel <onboarding@resend.dev>'
    # If DEFAULT_FROM_EMAIL is unverified or using fallback domain like smarthotel.com / example.com,
    # fallback to onboarding@resend.dev which works on Resend out-of-the-box.
    if any(unverified in from_email.lower() for unverified in ['smarthotel.com', 'example.com', 'localhost']):
        from_email = 'Smart Hotel <onboarding@resend.dev>'

    payload = {
        'from': from_email,
        'to': valid_recipients,
        'subject': subject,
        'text': message,
    }
    if html_message:
        payload['html'] = html_message
    encoded_payload = json.dumps(payload).encode('utf-8')

    resend_request = request.Request(
        'https://api.resend.com/emails',
        data=encoded_payload,
        headers={
            'Authorization': f'Bearer {resend_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'smart-hotel/1.0',
        },
        method='POST',
    )

    try:
        with request.urlopen(resend_request, timeout=getattr(settings, 'EMAIL_TIMEOUT', 20)) as response:
            res_body = response.read().decode('utf-8', errors='replace')
            logger.info("Resend email delivered to %s: %s", valid_recipients, res_body)
            if response.status < 200 or response.status >= 300:
                raise EmailConfigurationError(
                    f'Resend email API returned HTTP {response.status}: {res_body}'
                )
    except error.HTTPError as e:
        details = e.read().decode('utf-8', errors='replace')
        logger.error("Resend API HTTP %s: %s", e.code, details)
        if e.code == 403 and "only send to your own email" in details.lower():
            raise EmailConfigurationError(
                "Resend Testing Mode restriction: Resend only permits sending emails to your registered account email until a domain is verified on resend.com. Please set the guest's email to your registered Resend email address."
            ) from e
        raise EmailConfigurationError(
            f'Resend email API returned HTTP {e.code}: {details}'
        ) from e
    except error.URLError as e:
        logger.error("Resend API URLError: %s", e.reason)
        raise EmailConfigurationError(
            f'Could not reach Resend email API: {e.reason}'
        ) from e

    return len(valid_recipients)


def send_configured_mail(*, subject, message, recipient_list, html_message=None):
    """Send mail through the configured production-capable provider."""
    if isinstance(recipient_list, str):
        recipient_list = [recipient_list]

    valid_recipients = [
        addr.strip() for addr in recipient_list if addr and isinstance(addr, str) and '@' in addr
    ]
    if not valid_recipients:
        logger.warning('No valid recipient emails provided for subject %r.', subject)
        return 0

    resend_key = getattr(settings, 'RESEND_API_KEY', '')
    provider = getattr(settings, 'EMAIL_PROVIDER', '').strip().lower()

    if provider == 'resend' or resend_key:
        return _send_resend_mail(
            subject=subject,
            message=message,
            recipient_list=valid_recipients,
            html_message=html_message,
        )

    email_backend = getattr(settings, 'EMAIL_BACKEND', '')

    if email_backend == 'django.core.mail.backends.console.EmailBackend':
        raise EmailConfigurationError(
            'Email is using the console backend, so no real email will be delivered. '
            'Set RESEND_API_KEY and EMAIL_PROVIDER=resend on Render, or use SMTP.'
        )

    if email_backend == 'django.core.mail.backends.smtp.EmailBackend' and not _smtp_backend_is_configured():
        raise EmailConfigurationError(
            'SMTP email is missing EMAIL_HOST_USER or EMAIL_HOST_PASSWORD.'
        )

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or settings.EMAIL_HOST_USER or 'Smart Hotel <onboarding@resend.dev>'
    if html_message:
        email = EmailMultiAlternatives(
            subject=subject,
            body=message,
            from_email=from_email,
            to=valid_recipients,
        )
        email.attach_alternative(html_message, 'text/html')
        sent_count = email.send(fail_silently=False)
    else:
        sent_count = send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=valid_recipients,
            fail_silently=False,
        )

    if sent_count < len(valid_recipients):
        logger.warning(
            'Email backend accepted only %s of %s recipients for subject %r.',
            sent_count,
            len(valid_recipients),
            subject,
        )

    return sent_count

