import os
import requests
import logging


class EmailService:
    """Email service using Resend API (primary) with Gmail SMTP fallback."""

    @staticmethod
    def send_contact_email(name, user_email, subject, message, type='contact'):
        """Send an email using Resend first, falling back to Gmail SMTP."""
        # Try Resend first
        resend_key = os.environ.get('RESEND_API_KEY', '')
        if resend_key:
            success, msg = EmailService._send_via_resend(
                resend_key, name, user_email, subject, message, type
            )
            if success:
                return True, msg

        # Fall back to Gmail SMTP
        return EmailService._send_via_smtp(name, user_email, subject, message, type)

    @staticmethod
    def _send_via_resend(api_key, name, user_email, subject, message, type='contact'):
        """Send email via Resend API — cleaner, more reliable than SMTP."""
        try:
            recipient = os.environ.get('MAIL_USERNAME', 'hmzaakram295@gmail.com')

            html_body = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Inceptrax</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 14px;">{type.title()} Notification</p>
                </div>
                <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0 0 8px 0;"><strong>From:</strong> {name} ({user_email})</p>
                    <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> {subject}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
                    <div style="white-space: pre-wrap; line-height: 1.6;">{message}</div>
                </div>
            </div>
            """

            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "Inceptrax <onboarding@resend.dev>",
                    "to": [recipient],
                    "subject": f"[{type.upper()}] {subject}",
                    "html": html_body,
                    "reply_to": user_email,
                },
                timeout=10
            )

            if response.status_code in (200, 201):
                logging.info(f"[Resend] Email sent: {subject}")
                return True, "Email sent via Resend"
            else:
                logging.error(f"[Resend] Error {response.status_code}: {response.text[:200]}")
                return False, f"Resend error: {response.status_code}"

        except Exception as e:
            logging.error(f"[Resend] Failed: {str(e)}")
            return False, str(e)

    @staticmethod
    def _send_via_smtp(name, user_email, subject, message, type='contact'):
        """Fallback: send via Gmail SMTP."""
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        sender_email = os.getenv('MAIL_USERNAME')
        sender_password = os.getenv('MAIL_PASSWORD')
        recipient_email = "hmzaakram295@gmail.com"

        if not sender_email or not sender_password:
            logging.error("Mail credentials not configured")
            return False, "Server email configuration missing"

        try:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = recipient_email
            msg['Subject'] = f"[{type.upper()}] {subject}"
            msg['Reply-To'] = user_email

            body = f"""
            You have received a new {type} message.

            Name: {name}
            Email: {user_email}
            Subject: {subject}

            Message:
            {message}
            """

            msg.attach(MIMEText(body, 'plain'))

            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(msg)

            return True, "Email sent via SMTP"

        except Exception as e:
            logging.error(f"Failed to send email: {str(e)}")
            return False, str(e)
