"""
Email delivery service.

In SMTP_CONSOLE_MODE (default for dev) every email is printed to stdout
so you can click/copy the invite link without needing real SMTP credentials.
Set SMTP_CONSOLE_MODE=false and fill in SMTP_* vars in .env for production.
"""

import smtplib
import textwrap
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings


def _html_invite(invite_link: str, invited_by: str, expires_hours: int) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #07090f; color: #ffffff; margin: 0; padding: 40px 20px; }}
    .card {{ max-width: 480px; margin: 0 auto;
             background: rgba(255,255,255,0.06);
             border: 1px solid rgba(255,255,255,0.10);
             border-radius: 20px; padding: 40px; }}
    .logo {{ display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }}
    .logo-icon {{ width: 36px; height: 36px; background: #0A84FF;
                  border-radius: 10px; display: flex; align-items: center;
                  justify-content: center; }}
    .logo-text {{ font-size: 18px; font-weight: 700; }}
    h1 {{ font-size: 22px; font-weight: 700; margin: 0 0 8px; }}
    p  {{ color: rgba(255,255,255,0.65); line-height: 1.6; margin: 0 0 16px; }}
    .btn {{ display: inline-block; background: #0A84FF; color: #ffffff;
            text-decoration: none; font-weight: 600; font-size: 15px;
            padding: 14px 32px; border-radius: 14px; margin: 8px 0 24px; }}
    .footer {{ color: rgba(255,255,255,0.30); font-size: 12px; margin-top: 24px;
               border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }}
    .link-fallback {{ word-break: break-all; color: rgba(255,255,255,0.40);
                      font-size: 12px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="white" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <span class="logo-text">ChronoLens</span>
    </div>

    <h1>You've been invited</h1>
    <p><strong style="color:#fff">{invited_by}</strong> has invited you to join
       ChronoLens — a precision time-tracking app.</p>
    <p>Click the button below to set up your account. This link expires in
       <strong style="color:#fff">{expires_hours} hours</strong>.</p>

    <a class="btn" href="{invite_link}">Accept Invitation</a>

    <div class="footer">
      <p>If the button doesn't work, copy this link into your browser:</p>
      <p class="link-fallback">{invite_link}</p>
      <p>If you weren't expecting this, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>"""


def _text_invite(invite_link: str, invited_by: str, expires_hours: int) -> str:
    return textwrap.dedent(f"""\
        You've been invited to ChronoLens by {invited_by}.

        Accept your invitation here:
        {invite_link}

        This link expires in {expires_hours} hours.

        If you weren't expecting this, ignore this email.
    """)


def send_invite_email(to_email: str, invite_link: str, invited_by_name: str) -> None:
    """
    Send an invite email. Falls back to console output when
    SMTP_CONSOLE_MODE=true (the default for local development).
    """
    if settings.SMTP_CONSOLE_MODE:
        separator = "=" * 62
        print(f"\n{separator}")
        print("  CHRONOLENS — INVITE EMAIL  (console mode, no SMTP sent)")
        print(separator)
        print(f"  To      : {to_email}")
        print(f"  From    : {invited_by_name}")
        print(f"  Expires : {settings.INVITE_EXPIRE_HOURS}h")
        print(f"\n  Invite link:\n  {invite_link}\n")
        print(separator + "\n")
        return

    subject = f"{invited_by_name} invited you to ChronoLens"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email

    msg.attach(MIMEText(_text_invite(invite_link, invited_by_name, settings.INVITE_EXPIRE_HOURS), "plain"))
    msg.attach(MIMEText(_html_invite(invite_link, invited_by_name, settings.INVITE_EXPIRE_HOURS), "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            if settings.SMTP_TLS:
                smtp.starttls()
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
    except smtplib.SMTPException as exc:
        # Log but don't crash — the invite is already in the DB
        import logging
        logging.getLogger(__name__).error("SMTP send failed: %s", exc)
        raise
