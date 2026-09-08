"""
Sends the weekly digest email over Gmail's SMTP server.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def build_digest_html(user_company: str, briefings: list) -> str:
    sections = []
    for b in briefings:
        categories = [
            ("Product Updates", b.product_updates),
            ("Hiring Signals", b.hiring_signals),
            ("Pricing Changes", b.pricing_changes),
            ("Tech Stack Changes", b.tech_stack_changes),
        ]
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
    message = MIMEMultipart("alternative")
    message["Subject"] = f"ScoutFlux Weekly Digest — {user_company}"
    message["From"] = f"ScoutFlux <{settings.gmail_address}>"
    message["To"] = to_email

    html_body = build_digest_html(user_company, briefings)
    message.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.gmail_address, settings.gmail_app_password)
        server.sendmail(settings.gmail_address, to_email, message.as_string())