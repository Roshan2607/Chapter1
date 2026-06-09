import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

def get_smtp_credentials():
    email = os.getenv("SMTP_EMAIL")
    password = os.getenv("SMTP_PASSWORD")
    return email, password

def send_email(to_email: str, subject: str, html_body: str):
    sender_email, sender_password = get_smtp_credentials()
    if not sender_email or not sender_password:
        logger.warning(f"SMTP credentials missing. Simulated email to {to_email} | Subject: {subject}")
        print(f"\n[EMAIL MOCK] To: {to_email}\nSubject: {subject}\nBody:\n{html_body}\n")
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Chapter1 AI Tutor <{sender_email}>"
    msg["To"] = to_email

    part = MIMEText(html_body, "html")
    msg.attach(part)

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.ehlo()
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False

def send_otp_email(to_email: str, otp_code: str):
    subject = "Verify your Chapter1 Account"
    html_body = f"""
    <html>
      <body style="font-family: sans-serif; background-color: #FFFDF5; color: #000; padding: 20px;">
        <div style="max-w-md; margin: 0 auto; border: 4px solid #000; padding: 20px; background-color: #fff;">
            <h2 style="text-transform: uppercase; border-bottom: 4px solid #000; padding-bottom: 10px;">Verification Code</h2>
            <p>Welcome to Chapter1!</p>
            <p>Your one-time verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; color: #FF6B6B;">{otp_code}</h1>
            <p>This code will expire in 10 minutes.</p>
        </div>
      </body>
    </html>
    """
    return send_email(to_email, subject, html_body)

def send_welcome_email(to_email: str, name: str):
    subject = "Welcome to Chapter1!"
    html_body = f"""
    <html>
      <body style="font-family: sans-serif; background-color: #FFFDF5; color: #000; padding: 20px;">
        <div style="max-w-md; margin: 0 auto; border: 4px solid #000; padding: 20px; background-color: #fff;">
            <h2 style="text-transform: uppercase; border-bottom: 4px solid #000; padding-bottom: 10px;">Welcome, {name}!</h2>
            <p>Your account has been successfully verified and created.</p>
            <p>Get ready to master your engineering subjects using our interactive AI Tutor.</p>
            <p>- The Chapter1 Team</p>
        </div>
      </body>
    </html>
    """
    return send_email(to_email, subject, html_body)
