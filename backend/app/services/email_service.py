"""
Sends the weekly digest email over Gmail's SMTP server.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def build_digest_html(user_company: str, briefings: list) -> str:
    """
    Turns a list of this week's Briefing rows into one HTML email body.
    `briefings` is a list of Briefing model instances (SQLAlchemy rows),
    one per tracked competitor.
    """
    sections = []
    for b in briefings:
        categories = [
            ("Product Updates", b.product_updates),
            ("Hiring Signals", b.hiring_signals),
            ("Pricing Changes", b.pricing_changes),
            ("Tech Stack Changes", b.tech_stack_changes),
        ]
        # Skip categories the analyzer found nothing for, same as
        # BriefingCard.jsx already does on the frontend.
        category_html = "".join(
            f"<p><strong>{label}:</strong> {text}</p>"
            for label, text in categories
            if text
        )

        if not category_html:
            category_html = "<p style='color:#888'>No notable changes this week.</p>"

        sections.append(
            f"<h3 style='margin-bottom:4px'>{b.competitor_name}</h3>{category_html}<hr/>"
        )

    body = "".join(sections) if sections else "<p>No updates to report this week.</p>"

    return f"""
    <html>
      <body style="font-family: sans-serif; color: #222; max-width: 600px;">
        <h2>ScoutFlux Weekly Digest</h2>
        <p style="color:#555">Competitor intelligence for {user_company}</p>
        {body}
      </body>
    </html>
    """


def send_digest_email(to_email: str, user_company: str, briefings: list) -> None:
    """
    Sends one digest email to `to_email`, built from `briefings`.
    Raises on failure — the caller (the weekly job) decides how to
    handle that so one user's bad email address doesn't crash the run.
    """
    message = MIMEMultipart("alternative")
    message["Subject"] = f"ScoutFlux Weekly Digest — {user_company}"
    message["From"] = f"ScoutFlux <{settings.gmail_address}>"
    message["To"] = to_email

    html_body = build_digest_html(user_company, briefings)
    message.attach(MIMEText(html_body, "html"))

    # Port 465 = SSL is active from the moment the connection opens
    # (as opposed to port 587, which connects plain and then upgrades
    # via STARTTLS). Both work with Gmail; SSL on 465 is one step fewer.
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.gmail_address, settings.gmail_app_password)
        server.sendmail(settings.gmail_address, to_email, message.as_string())