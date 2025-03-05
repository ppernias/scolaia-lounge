from typing import Dict, Optional, Tuple
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from ..database.models import Setting
from ..schemas.email import EmailSchema

def get_mail_settings(db: Session) -> Dict[str, str]:
    settings = {}
    mail_settings = db.query(Setting).filter(Setting.category == "mail").all()
    return {setting.key: setting.get_value() for setting in mail_settings}

async def send_email(db: Session, email_data: EmailSchema) -> Tuple[bool, str]:
    try:
        settings = get_mail_settings(db)
        
        # Validate required settings
        if not settings.get('smtp_server'):
            return False, "SMTP server not configured in settings"
            
        if not settings.get('smtp_username'):
            return False, "SMTP username not configured in settings"
            
        if not settings.get('smtp_password'):
            return False, "SMTP password not configured in settings"
            
        owner_email = db.query(Setting).filter(
            Setting.category == "general",
            Setting.key == "owner_email"
        ).first()
        
        if not owner_email or not owner_email.get_value():
            return False, "Owner email not configured in settings"

        msg = MIMEMultipart()
        msg['From'] = email_data.sender or settings.get('smtp_fullname', 'System')
        msg['To'] = email_data.to_email
        msg['Subject'] = email_data.subject

        body = email_data.body_text + "\n\n"
        if email_data.signature:
            body += email_data.signature
        elif settings.get('smtp_signature'):
            body += settings.get('smtp_signature')
        
        msg.attach(MIMEText(body, 'plain'))

        try:
            # Configure SMTP connection
            if settings.get('smtp_SSLreq') == 'yes':
                server = smtplib.SMTP_SSL(
                    settings['smtp_server'], 
                    int(settings.get('smtp_SSLport', 465))
                )
            else:
                server = smtplib.SMTP(
                    settings['smtp_server'], 
                    int(settings.get('smtp_TLSport', 587))
                )
                if settings.get('smtp_TLSreq') == 'yes':
                    server.starttls()

            # Authentication
            if settings.get('smtp_authreq') == 'yes':
                try:
                    server.login(settings['smtp_username'], settings['smtp_password'])
                except smtplib.SMTPAuthenticationError:
                    return False, "SMTP authentication failed: Invalid username or password"

            # Send email
            server.send_message(msg)
            server.quit()
            return True, "Email sent successfully"

        except smtplib.SMTPConnectError:
            return False, f"Failed to connect to SMTP server: {settings['smtp_server']}"
        except smtplib.SMTPServerDisconnected:
            return False, "SMTP server disconnected unexpectedly"
        except smtplib.SMTPException as e:
            return False, f"SMTP error occurred: {str(e)}"

    except Exception as e:
        return False, f"Unexpected error while sending email: {str(e)}" 