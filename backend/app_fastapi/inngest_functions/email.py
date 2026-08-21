"""
Inngest function: send-email

Triggered by: email/send.requested event
Wraps email delivery with automatic retry on transient failures.
"""

import inngest
from app_fastapi.inngest_client import inngest_client


@inngest_client.create_function(
    fn_id="send-email",
    trigger=inngest.TriggerEvent(event="email/send.requested"),
    retries=3,
)
async def send_email(ctx: inngest.Context, step: inngest.Step) -> str:
    """Send an email with retry. Failures auto-retry 3 times."""
    to = ctx.event.data["to"]
    subject = ctx.event.data["subject"]
    body = ctx.event.data["body"]

    await step.run(
        "deliver-email",
        lambda: _deliver_email(to, subject, body),
    )

    ctx.logger.info(f"[Inngest] Email sent to {to}: {subject}")
    return f"Email sent to {to}"


def _deliver_email(to: str, subject: str, body: str):
    """Sync email delivery via the existing email service."""
    from app.services.email_service import EmailService
    success, msg = EmailService.send_email(to, subject, body)
    if not success:
        raise RuntimeError(f"Email delivery failed: {msg}")
    return {"sent": True, "to": to}
