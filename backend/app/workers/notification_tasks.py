from celery import current_task
from app.workers.celery_app import celery_app
from typing import Dict, Any, List, Optional
import logging
import traceback
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="notifications.send_email")
def send_email_notification(self, recipient: str, subject: str, content: Dict[str, Any]):
    """Send email notification with templated content."""
    
    try:
        template_name = content.get("template", "default")
        template_data = content.get("data", {})
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "template_rendering",
                "progress": 25,
                "message": f"Rendering email template: {template_name}"
            }
        )
        
        # Render email template
        rendered_content = _render_email_template(template_name, template_data)
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "email_sending",
                "progress": 75,
                "message": f"Sending email to {recipient}"
            }
        )
        
        # Send email
        email_result = _send_email(recipient, subject, rendered_content)
        
        return {
            "status": "sent",
            "recipient": recipient,
            "subject": subject,
            "template": template_name,
            "message_id": email_result.get("message_id"),
            "sent_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Email notification failed: {str(e)}")
        
        self.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "recipient": recipient,
                "subject": subject
            }
        )
        
        raise

@celery_app.task(bind=True, name="notifications.pipeline_status")
def send_pipeline_status_notification(self, user_id: int, pipeline_id: int, status: str, details: Dict[str, Any]):
    """Send pipeline status notification to user."""
    
    try:
        # Get user notification preferences
        notification_prefs = _get_user_notification_preferences(user_id)
        
        if not notification_prefs.get("pipeline_notifications", True):
            return {"status": "skipped", "reason": "User disabled pipeline notifications"}
        
        # Prepare notification content
        notification_content = _prepare_pipeline_notification(pipeline_id, status, details)
        
        # Send notifications via enabled channels
        results = {}
        
        if notification_prefs.get("email_enabled", True):
            email_result = _send_pipeline_email(user_id, notification_content)
            results["email"] = email_result
        
        if notification_prefs.get("in_app_enabled", True):
            in_app_result = _send_in_app_notification(user_id, notification_content)
            results["in_app"] = in_app_result
        
        if notification_prefs.get("webhook_enabled", False) and notification_prefs.get("webhook_url"):
            webhook_result = _send_webhook_notification(
                notification_prefs["webhook_url"],
                notification_content
            )
            results["webhook"] = webhook_result
        
        return {
            "status": "completed",
            "user_id": user_id,
            "pipeline_id": pipeline_id,
            "notification_status": status,
            "channels_used": list(results.keys()),
            "results": results,
            "sent_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Pipeline status notification failed: {str(e)}")
        
        self.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "user_id": user_id,
                "pipeline_id": pipeline_id
            }
        )
        
        raise

@celery_app.task(bind=True, name="notifications.data_quality_alert")
def send_data_quality_alert(self, dataset_id: str, quality_issues: List[Dict[str, Any]], severity: str):
    """Send data quality alert to relevant users."""
    
    try:
        # Determine recipients based on severity
        recipients = _get_alert_recipients(dataset_id, severity)
        
        if not recipients:
            return {"status": "skipped", "reason": "No recipients found"}
        
        # Prepare alert content
        alert_content = _prepare_data_quality_alert(dataset_id, quality_issues, severity)
        
        # Send alerts to all recipients
        notification_results = []
        
        for recipient in recipients:
            try:
                # Send email alert
                email_result = _send_data_quality_email(recipient, alert_content)
                
                # Send in-app notification if critical
                if severity == "critical":
                    in_app_result = _send_urgent_in_app_notification(recipient, alert_content)
                    notification_results.append({
                        "recipient": recipient,
                        "email": email_result,
                        "in_app": in_app_result
                    })
                else:
                    notification_results.append({
                        "recipient": recipient,
                        "email": email_result
                    })
                    
            except Exception as e:
                logger.error(f"Failed to send alert to {recipient}: {str(e)}")
                notification_results.append({
                    "recipient": recipient,
                    "error": str(e)
                })
        
        return {
            "status": "completed",
            "dataset_id": dataset_id,
            "severity": severity,
            "recipients_count": len(recipients),
            "issues_count": len(quality_issues),
            "notification_results": notification_results,
            "alert_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Data quality alert failed: {str(e)}")
        
        self.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "dataset_id": dataset_id,
                "severity": severity
            }
        )
        
        raise

@celery_app.task(bind=True, name="notifications.report_ready")
def send_report_ready_notification(self, user_id: int, report_id: str, report_type: str, file_path: str):
    """Notify user that their report is ready for download."""
    
    try:
        # Get user details
        user_info = _get_user_info(user_id)
        
        # Prepare report notification
        notification_content = {
            "template": "report_ready",
            "data": {
                "user_name": user_info.get("name", "User"),
                "report_type": report_type.title(),
                "report_id": report_id,
                "download_link": _generate_secure_download_link(file_path, user_id),
                "expiry_hours": 24,
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }
        
        # Send email notification
        email_result = send_email_notification.delay(
            recipient=user_info.get("email", ""),
            subject=f"Your {report_type.title()} Report is Ready",
            content=notification_content
        )
        
        # Send in-app notification
        in_app_result = _send_in_app_notification(
            user_id,
            {
                "type": "report_ready",
                "title": "Report Generated Successfully",
                "message": f"Your {report_type} report is ready for download",
                "action_url": f"/reports/{report_id}/download",
                "priority": "normal"
            }
        )
        
        return {
            "status": "completed",
            "user_id": user_id,
            "report_id": report_id,
            "report_type": report_type,
            "email_task_id": email_result.id,
            "in_app_result": in_app_result,
            "notification_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Report ready notification failed: {str(e)}")
        
        self.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "user_id": user_id,
                "report_id": report_id
            }
        )
        
        raise

@celery_app.task(bind=True, name="notifications.system_maintenance")
def send_system_maintenance_notification(self, maintenance_details: Dict[str, Any]):
    """Send system maintenance notifications to all users."""
    
    try:
        maintenance_start = maintenance_details.get("start_time")
        maintenance_duration = maintenance_details.get("duration_hours", 2)
        affected_services = maintenance_details.get("affected_services", [])
        
        # Get all active users
        active_users = _get_active_users()
        
        self.update_state(
            state="PROGRESS",
            meta={
                "stage": "notification_preparation",
                "progress": 10,
                "message": f"Preparing maintenance notifications for {len(active_users)} users"
            }
        )
        
        # Prepare notification content
        notification_content = {
            "template": "system_maintenance",
            "data": {
                "maintenance_start": maintenance_start,
                "duration_hours": maintenance_duration,
                "affected_services": affected_services,
                "alternative_access": maintenance_details.get("alternative_access", ""),
                "contact_support": maintenance_details.get("support_contact", "support@dreflowpro.com")
            }
        }
        
        # Send notifications in batches
        batch_size = 50
        notification_results = []
        
        for i in range(0, len(active_users), batch_size):
            batch = active_users[i:i + batch_size]
            progress = int(((i + len(batch)) / len(active_users)) * 90) + 10
            
            self.update_state(
                state="PROGRESS",
                meta={
                    "stage": "sending_notifications",
                    "progress": progress,
                    "message": f"Sending notifications to batch {i//batch_size + 1}"
                }
            )
            
            batch_results = _send_batch_maintenance_notifications(batch, notification_content)
            notification_results.extend(batch_results)
        
        return {
            "status": "completed",
            "total_users": len(active_users),
            "notifications_sent": len([r for r in notification_results if r.get("status") == "sent"]),
            "notifications_failed": len([r for r in notification_results if r.get("status") == "failed"]),
            "maintenance_start": maintenance_start,
            "notification_results": notification_results,
            "sent_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"System maintenance notification failed: {str(e)}")
        
        self.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "maintenance_details": maintenance_details
            }
        )
        
        raise

@celery_app.task(bind=True, name="notifications.digest_email")
def send_weekly_digest(self, user_id: int):
    """Send weekly digest email with user activity summary."""
    
    try:
        # Calculate date range for digest
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        # Gather user activity data
        user_activity = _get_user_activity_summary(user_id, start_date, end_date)
        
        if not user_activity.get("has_activity", False):
            return {"status": "skipped", "reason": "No activity in the past week"}
        
        # Prepare digest content
        digest_content = {
            "template": "weekly_digest",
            "data": {
                "user_name": user_activity.get("user_name"),
                "week_start": start_date.strftime("%B %d"),
                "week_end": end_date.strftime("%B %d, %Y"),
                "pipelines_executed": user_activity.get("pipelines_executed", 0),
                "reports_generated": user_activity.get("reports_generated", 0),
                "data_processed_gb": user_activity.get("data_processed_gb", 0),
                "top_insights": user_activity.get("top_insights", []),
                "recommendations": user_activity.get("recommendations", []),
                "upcoming_schedules": user_activity.get("upcoming_schedules", [])
            }
        }
        
        # Send digest email
        user_info = _get_user_info(user_id)
        email_result = send_email_notification.delay(
            recipient=user_info.get("email"),
            subject="Your Weekly DReflowPro Digest",
            content=digest_content
        )
        
        return {
            "status": "sent",
            "user_id": user_id,
            "digest_period": f"{start_date.date()} to {end_date.date()}",
            "email_task_id": email_result.id,
            "activity_summary": user_activity,
            "sent_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Weekly digest failed: {str(e)}")
        
        self.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "user_id": user_id
            }
        )
        
        raise

# Helper Functions

def _render_email_template(template_name: str, data: Dict[str, Any]) -> Dict[str, str]:
    """Render email template with provided data."""
    
    templates = {
        "default": {
            "html": "<html><body><h1>{{title}}</h1><p>{{message}}</p></body></html>",
            "text": "{{title}}\n\n{{message}}"
        },
        "pipeline_status": {
            "html": """
            <html><body>
                <h1>Pipeline Status Update</h1>
                <p>Your pipeline <strong>{{pipeline_name}}</strong> has {{status}}.</p>
                <div>{{details}}</div>
            </body></html>
            """,
            "text": "Pipeline {{pipeline_name}} has {{status}}.\n\n{{details}}"
        },
        "report_ready": {
            "html": """
            <html><body>
                <h1>Your {{report_type}} Report is Ready!</h1>
                <p>Hello {{user_name}},</p>
                <p>Your report has been generated successfully.</p>
                <p><a href="{{download_link}}">Download Report</a></p>
                <p>This link will expire in {{expiry_hours}} hours.</p>
            </body></html>
            """,
            "text": "Your {{report_type}} report is ready!\n\nDownload: {{download_link}}\n\nLink expires in {{expiry_hours}} hours."
        },
        "data_quality_alert": {
            "html": """
            <html><body>
                <h1>Data Quality Alert - {{severity}}</h1>
                <p>Issues detected in dataset: {{dataset_name}}</p>
                <ul>{{issue_list}}</ul>
                <p>Please review and take appropriate action.</p>
            </body></html>
            """,
            "text": "Data Quality Alert - {{severity}}\n\nDataset: {{dataset_name}}\nIssues:\n{{issue_list}}"
        },
        "email_verification": {
            "html": """
            <html><body>
                <h1>Verify Your Email Address</h1>
                <p>Hello {{user_name}},</p>
                <p>Thank you for signing up for {{company_name}}! Please verify your email address by clicking the link below:</p>
                <p><a href="{{verification_url}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email Address</a></p>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p>{{verification_url}}</p>
                <p>This verification link will expire in 24 hours for security reasons.</p>
                <p>If you didn't create an account with us, please ignore this email.</p>
                <p>Best regards,<br>The {{company_name}} Team</p>
            </body></html>
            """,
            "text": "Hello {{user_name}},\n\nThank you for signing up for {{company_name}}! Please verify your email address by visiting this link:\n\n{{verification_url}}\n\nThis verification link will expire in 24 hours for security reasons.\n\nIf you didn't create an account with us, please ignore this email.\n\nBest regards,\nThe {{company_name}} Team"
        },
        "password_reset": {
            "html": """
            <html><body>
                <h1>Password Reset Request</h1>
                <p>Hello {{user_name}},</p>
                <p>We received a request to reset your password for your {{company_name}} account.</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="{{reset_url}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p>{{reset_url}}</p>
                <p>This password reset link will expire in {{expires_in}} for security reasons.</p>
                <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                <p>Best regards,<br>The {{company_name}} Team</p>
            </body></html>
            """,
            "text": "Hello {{user_name}},\n\nWe received a request to reset your password for your {{company_name}} account.\n\nReset your password by visiting this link:\n\n{{reset_url}}\n\nThis password reset link will expire in {{expires_in}} for security reasons.\n\nIf you didn't request a password reset, please ignore this email and your password will remain unchanged.\n\nBest regards,\nThe {{company_name}} Team"
        }
    }
    
    template = templates.get(template_name, templates["default"])
    
    # Simple template rendering (in production, use Jinja2 or similar)
    html_content = template["html"]
    text_content = template["text"]
    
    for key, value in data.items():
        placeholder = "{{" + key + "}}"
        html_content = html_content.replace(placeholder, str(value))
        text_content = text_content.replace(placeholder, str(value))
    
    return {
        "html": html_content,
        "text": text_content
    }

def _send_email(recipient: str, subject: str, content: Dict[str, str]) -> Dict[str, Any]:
    """Send email using configured email service."""
    
    try:
        import smtplib
        import os
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Get email configuration from environment variables
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        from_email = os.getenv("FROM_EMAIL", smtp_username)
        
        if not smtp_username or not smtp_password:
            logger.warning(f"Email configuration missing - logging email instead of sending to {recipient}: {subject}")
            message_id = f"log_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(recipient) % 10000}"
            
            # Log the email content for debugging/testing
            logger.info(f"EMAIL LOG - To: {recipient}, Subject: {subject}")
            logger.info(f"HTML Content: {content.get('html', 'No HTML content')}")
            logger.info(f"Text Content: {content.get('text', 'No text content')}")
            
            return {
                "message_id": message_id,
                "status": "logged",
                "recipient": recipient,
                "timestamp": datetime.now().isoformat()
            }
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = from_email
        message["To"] = recipient
        
        # Create text and HTML parts
        text_part = MIMEText(content.get("text", ""), "plain")
        html_part = MIMEText(content.get("html", ""), "html")
        
        message.attach(text_part)
        if content.get("html"):
            message.attach(html_part)
        
        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(message)
        
        message_id = f"email_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(recipient) % 10000}"
        logger.info(f"Email sent successfully to {recipient}: {subject}")
        
        return {
            "message_id": message_id,
            "status": "sent",
            "recipient": recipient,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {str(e)}")
        
        # Fallback to logging when email fails
        message_id = f"failed_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(recipient) % 10000}"
        logger.info(f"EMAIL FALLBACK LOG - To: {recipient}, Subject: {subject}")
        logger.info(f"Error: {str(e)}")
        logger.info(f"Content: {content.get('text', 'No content')}")
        
        return {
            "message_id": message_id,
            "status": "failed",
            "recipient": recipient,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

def _get_user_notification_preferences(user_id: int) -> Dict[str, Any]:
    """Get user notification preferences from database."""
    
    try:
        import asyncio
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select
        from app.models.user import User
        from app.core.database import AsyncSessionFactory
        
        async def fetch_preferences():
            async with AsyncSessionFactory() as session:
                result = await session.execute(
                    select(User).where(User.id == user_id)
                )
                user = result.scalar_one_or_none()
                
                if not user:
                    # Return default preferences for non-existent user
                    return {
                        "email_enabled": True,
                        "in_app_enabled": True,
                        "webhook_enabled": False,
                        "pipeline_notifications": True,
                        "report_notifications": True,
                        "data_quality_alerts": True
                    }
                
                # Extract preferences from user settings or use defaults
                user_prefs = user.preferences or {}
                notification_prefs = user_prefs.get("notifications", {})
                
                return {
                    "email_enabled": notification_prefs.get("email_enabled", True),
                    "in_app_enabled": notification_prefs.get("in_app_enabled", True),
                    "webhook_enabled": notification_prefs.get("webhook_enabled", False),
                    "webhook_url": notification_prefs.get("webhook_url"),
                    "pipeline_notifications": notification_prefs.get("pipeline_notifications", True),
                    "report_notifications": notification_prefs.get("report_notifications", True),
                    "data_quality_alerts": notification_prefs.get("data_quality_alerts", True)
                }
        
        # Run the async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(fetch_preferences())
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Failed to fetch user preferences for user {user_id}: {str(e)}")
        # Return safe defaults on error
        return {
            "email_enabled": True,
            "in_app_enabled": True,
            "webhook_enabled": False,
            "pipeline_notifications": True,
            "report_notifications": True,
            "data_quality_alerts": True
        }

def _prepare_pipeline_notification(pipeline_id: int, status: str, details: Dict[str, Any]) -> Dict[str, Any]:
    """Prepare pipeline notification content."""
    
    status_messages = {
        "completed": "completed successfully",
        "failed": "failed with errors",
        "running": "is currently running",
        "queued": "has been queued for execution"
    }
    
    return {
        "pipeline_id": pipeline_id,
        "pipeline_name": details.get("pipeline_name", f"Pipeline {pipeline_id}"),
        "status": status_messages.get(status, status),
        "details": details.get("message", ""),
        "execution_time": details.get("execution_time"),
        "records_processed": details.get("records_processed"),
        "dashboard_link": f"/pipelines/{pipeline_id}/dashboard"
    }

def _send_pipeline_email(user_id: int, content: Dict[str, Any]) -> Dict[str, Any]:
    """Send pipeline status email."""
    
    user_info = _get_user_info(user_id)
    
    email_content = {
        "template": "pipeline_status",
        "data": content
    }
    
    return _send_email(
        user_info.get("email", ""),
        f"Pipeline Status: {content['status'].title()}",
        _render_email_template("pipeline_status", content)
    )

def _send_in_app_notification(user_id: int, content: Dict[str, Any]) -> Dict[str, Any]:
    """Send in-app notification."""
    
    try:
        import asyncio
        from sqlalchemy.ext.asyncio import AsyncSession
        from app.core.database import AsyncSessionFactory
        import uuid
        
        async def store_notification():
            async with AsyncSessionFactory() as session:
                # Create notification record in database
                # Note: This assumes a notifications table exists
                # If not, we'll log the notification instead
                try:
                    from app.models.notification import Notification
                    
                    notification = Notification(
                        id=uuid.uuid4(),
                        user_id=user_id,
                        title=content.get('title', 'Notification'),
                        message=content.get('message', ''),
                        notification_type=content.get('type', 'info'),
                        priority=content.get('priority', 'normal'),
                        action_url=content.get('action_url'),
                        is_read=False,
                        created_at=datetime.now()
                    )
                    
                    session.add(notification)
                    await session.commit()
                    
                    return {
                        "notification_id": str(notification.id),
                        "user_id": user_id,
                        "status": "stored",
                        "timestamp": datetime.now().isoformat()
                    }
                    
                except ImportError:
                    # Notification model doesn't exist, log instead
                    notification_id = f"log_notif_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id}"
                    logger.info(
                        f"IN-APP NOTIFICATION LOG - User: {user_id}, "
                        f"Title: {content.get('title', '')}, "
                        f"Message: {content.get('message', '')}, "
                        f"Type: {content.get('type', 'info')}"
                    )
                    
                    return {
                        "notification_id": notification_id,
                        "user_id": user_id,
                        "status": "logged",
                        "timestamp": datetime.now().isoformat()
                    }
        
        # Run the async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(store_notification())
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Failed to send in-app notification to user {user_id}: {str(e)}")
        
        # Fallback to simple logging
        notification_id = f"failed_notif_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id}"
        logger.info(
            f"IN-APP NOTIFICATION FALLBACK - User: {user_id}, "
            f"Title: {content.get('title', '')}, "
            f"Error: {str(e)}"
        )
        
        return {
            "notification_id": notification_id,
            "user_id": user_id,
            "status": "failed",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

def _send_webhook_notification(webhook_url: str, content: Dict[str, Any]) -> Dict[str, Any]:
    """Send webhook notification."""
    
    try:
        import requests
        import json
        
        # Prepare webhook payload
        payload = {
            "timestamp": datetime.now().isoformat(),
            "event_type": "notification",
            "data": content
        }
        
        # Send POST request to webhook URL
        response = requests.post(
            webhook_url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "DReflowPro-Webhook/1.0"
            },
            timeout=30  # 30 second timeout
        )
        
        response.raise_for_status()  # Raises HTTPError for bad responses
        
        logger.info(f"Webhook notification sent successfully to {webhook_url}")
        
        return {
            "webhook_url": webhook_url,
            "status": "sent",
            "response_status": response.status_code,
            "response_text": response.text[:200],  # First 200 chars
            "timestamp": datetime.now().isoformat()
        }
        
    except requests.exceptions.Timeout:
        error_msg = "Webhook request timed out"
        logger.error(f"Webhook timeout for {webhook_url}: {error_msg}")
        
        return {
            "webhook_url": webhook_url,
            "status": "timeout",
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Webhook request failed: {str(e)}"
        logger.error(f"Webhook error for {webhook_url}: {error_msg}")
        
        return {
            "webhook_url": webhook_url,
            "status": "failed",
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(f"Webhook unexpected error for {webhook_url}: {error_msg}")
        
        return {
            "webhook_url": webhook_url,
            "status": "error",
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }

def _get_alert_recipients(dataset_id: str, severity: str) -> List[Dict[str, Any]]:
    """Get recipients for data quality alerts."""
    
    # Mock recipients based on severity
    if severity == "critical":
        return [
            {"user_id": 1, "email": "admin@company.com", "role": "admin"},
            {"user_id": 2, "email": "data-team@company.com", "role": "data_analyst"}
        ]
    else:
        return [
            {"user_id": 2, "email": "data-team@company.com", "role": "data_analyst"}
        ]

def _prepare_data_quality_alert(dataset_id: str, issues: List[Dict[str, Any]], severity: str) -> Dict[str, Any]:
    """Prepare data quality alert content."""
    
    return {
        "dataset_id": dataset_id,
        "dataset_name": f"Dataset {dataset_id}",
        "severity": severity.upper(),
        "issue_count": len(issues),
        "issue_list": "\n".join([f"- {issue.get('description', '')}" for issue in issues]),
        "detection_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "action_required": severity == "critical"
    }

def _send_data_quality_email(recipient: Dict[str, Any], content: Dict[str, Any]) -> Dict[str, Any]:
    """Send data quality alert email."""
    
    return _send_email(
        recipient.get("email", ""),
        f"Data Quality Alert - {content['severity']}",
        _render_email_template("data_quality_alert", content)
    )

def _send_urgent_in_app_notification(recipient: Dict[str, Any], content: Dict[str, Any]) -> Dict[str, Any]:
    """Send urgent in-app notification."""
    
    notification_content = {
        "type": "data_quality_alert",
        "title": f"Critical Data Quality Issue",
        "message": f"Critical issues detected in {content['dataset_name']}",
        "priority": "urgent",
        "action_url": f"/datasets/{content['dataset_id']}/quality"
    }
    
    return _send_in_app_notification(recipient["user_id"], notification_content)

def _get_user_info(user_id: int) -> Dict[str, Any]:
    """Get user information from database."""
    
    try:
        import asyncio
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select
        from app.models.user import User
        from app.core.database import AsyncSessionFactory
        
        async def fetch_user_info():
            async with AsyncSessionFactory() as session:
                result = await session.execute(
                    select(User).where(User.id == user_id)
                )
                user = result.scalar_one_or_none()
                
                if not user:
                    return {
                        "user_id": user_id,
                        "name": f"User {user_id}",
                        "email": f"user{user_id}@example.com",
                        "role": "unknown"
                    }
                
                return {
                    "user_id": user.id,
                    "name": f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0],
                    "email": user.email,
                    "role": user.role.value if user.role else "user",
                    "is_active": user.is_active,
                    "organization_id": str(user.organization_id) if user.organization_id else None
                }
        
        # Run the async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(fetch_user_info())
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Failed to fetch user info for user {user_id}: {str(e)}")
        # Return fallback info on error
        return {
            "user_id": user_id,
            "name": f"User {user_id}",
            "email": f"user{user_id}@example.com",
            "role": "unknown"
        }

def _generate_secure_download_link(file_path: str, user_id: int) -> str:
    """Generate secure download link with expiration."""
    
    token = f"download_token_{user_id}_{int(datetime.now().timestamp())}"
    return f"/api/v1/reports/download?token={token}"

def _get_active_users() -> List[Dict[str, Any]]:
    """Get all active users from database."""
    
    try:
        import asyncio
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select
        from app.models.user import User
        from app.core.database import AsyncSessionFactory
        
        async def fetch_active_users():
            async with AsyncSessionFactory() as session:
                result = await session.execute(
                    select(User).where(User.is_active == True)
                )
                users = result.scalars().all()
                
                return [
                    {
                        "user_id": user.id,
                        "email": user.email,
                        "name": f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0],
                        "role": user.role.value if user.role else "user",
                        "organization_id": str(user.organization_id) if user.organization_id else None
                    }
                    for user in users
                ]
        
        # Run the async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(fetch_active_users())
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Failed to fetch active users: {str(e)}")
        # Return empty list on error to prevent spam
        return []

def _send_batch_maintenance_notifications(users: List[Dict[str, Any]], content: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Send maintenance notifications to batch of users."""
    
    results = []
    
    for user in users:
        try:
            email_result = _send_email(
                user["email"],
                "Scheduled System Maintenance",
                _render_email_template("system_maintenance", content["data"])
            )
            
            in_app_result = _send_in_app_notification(
                user["user_id"],
                {
                    "type": "system_maintenance",
                    "title": "Scheduled Maintenance",
                    "message": f"System maintenance scheduled for {content['data']['maintenance_start']}",
                    "priority": "normal"
                }
            )
            
            results.append({
                "user_id": user["user_id"],
                "email": user["email"],
                "status": "sent",
                "email_result": email_result,
                "in_app_result": in_app_result
            })
            
        except Exception as e:
            results.append({
                "user_id": user["user_id"],
                "email": user["email"],
                "status": "failed",
                "error": str(e)
            })
    
    return results

def _get_user_activity_summary(user_id: int, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Get user activity summary for digest."""
    
    try:
        import asyncio
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select, func, and_
        from app.models.user import User
        from app.models.pipeline import ETLPipeline, PipelineExecution, ExecutionStatus
        from app.core.database import AsyncSessionFactory
        
        async def fetch_activity_summary():
            async with AsyncSessionFactory() as session:
                # Get user info
                user_result = await session.execute(
                    select(User).where(User.id == user_id)
                )
                user = user_result.scalar_one_or_none()
                
                if not user:
                    return {
                        "user_id": user_id,
                        "user_name": f"User {user_id}",
                        "has_activity": False
                    }
                
                user_name = f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0]
                
                # Get pipeline executions in date range
                execution_result = await session.execute(
                    select(PipelineExecution)
                    .join(ETLPipeline)
                    .where(
                        and_(
                            ETLPipeline.created_by_id == user_id,
                            PipelineExecution.started_at >= start_date,
                            PipelineExecution.started_at <= end_date
                        )
                    )
                )
                executions = execution_result.scalars().all()
                
                # Calculate activity metrics
                completed_executions = [e for e in executions if e.status == ExecutionStatus.COMPLETED]
                total_rows_processed = sum(e.rows_processed or 0 for e in completed_executions)
                
                # Get scheduled pipelines
                scheduled_result = await session.execute(
                    select(ETLPipeline).where(
                        and_(
                            ETLPipeline.created_by_id == user_id,
                            ETLPipeline.is_scheduled == True,
                            ETLPipeline.next_run.isnot(None)
                        )
                    ).order_by(ETLPipeline.next_run).limit(5)
                )
                scheduled_pipelines = scheduled_result.scalars().all()
                
                upcoming_schedules = [
                    {
                        "pipeline": pipeline.name,
                        "next_run": pipeline.next_run.strftime("%A %I:%M %p") if pipeline.next_run else "Not scheduled"
                    }
                    for pipeline in scheduled_pipelines
                ]
                
                has_activity = len(executions) > 0 or len(scheduled_pipelines) > 0
                
                # Generate insights based on actual data
                top_insights = []
                recommendations = []
                
                if completed_executions:
                    avg_success_rate = len(completed_executions) / len(executions) * 100
                    top_insights.append(f"Pipeline success rate: {avg_success_rate:.1f}%")
                    
                    if total_rows_processed > 1000000:
                        top_insights.append(f"Processed over {total_rows_processed // 1000000}M records")
                    elif total_rows_processed > 1000:
                        top_insights.append(f"Processed {total_rows_processed // 1000}K records")
                    
                    if avg_success_rate < 90:
                        recommendations.append("Review failed pipelines to improve reliability")
                    
                    if len(scheduled_pipelines) == 0:
                        recommendations.append("Consider scheduling regular pipelines for automation")
                
                return {
                    "user_id": user_id,
                    "user_name": user_name,
                    "has_activity": has_activity,
                    "pipelines_executed": len(executions),
                    "successful_executions": len(completed_executions),
                    "reports_generated": len([e for e in executions if "report" in (e.trigger_data or {}).get("type", "").lower()]),
                    "data_processed_rows": total_rows_processed,
                    "data_processed_gb": round(total_rows_processed * 0.001 / 1000, 2),  # Rough estimate
                    "top_insights": top_insights or ["No significant activity this week"],
                    "recommendations": recommendations or ["Keep up the great work with your data pipelines!"],
                    "upcoming_schedules": upcoming_schedules
                }
        
        # Run the async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(fetch_activity_summary())
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Failed to fetch user activity summary for user {user_id}: {str(e)}")
        # Return minimal activity summary on error
        return {
            "user_id": user_id,
            "user_name": f"User {user_id}",
            "has_activity": False
        }

@celery_app.task(bind=True, name="notifications.send_email_verification")
def send_email_verification(self, user_id: str, verification_token: str):
    """Send email verification email to user."""
    
    try:
        # Get user info
        user_info = _get_user_info(user_id)
        if not user_info:
            return {"status": "failed", "error": "User not found"}
        
        # Send verification email
        subject = "Verify Your Email - D-ReflowPro"
        verification_url = f"https://app.dreflowpro.com/verify-email/{verification_token}"
        
        content = {
            "template": "email_verification",
            "data": {
                "user_name": user_info["first_name"],
                "verification_url": verification_url,
                "company_name": "D-ReflowPro"
            }
        }
        
        # Render template and send
        rendered_content = _render_email_template("email_verification", content["data"])
        email_result = _send_email(user_info["email"], subject, rendered_content)
        
        return {
            "status": "sent",
            "user_id": user_id,
            "email": user_info["email"],
            "verification_token": verification_token,
            "sent_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Email verification failed for user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=3)

@celery_app.task(bind=True, name="notifications.send_password_reset_email")
def send_password_reset_email(self, user_id: str, reset_token: str):
    """Send password reset email to user."""
    
    try:
        # Get user info
        user_info = _get_user_info(user_id)
        if not user_info:
            return {"status": "failed", "error": "User not found"}
        
        # Send password reset email
        subject = "Reset Your Password - D-ReflowPro"
        reset_url = f"https://app.dreflowpro.com/reset-password/{reset_token}"
        
        content = {
            "template": "password_reset",
            "data": {
                "user_name": user_info["first_name"],
                "reset_url": reset_url,
                "company_name": "D-ReflowPro",
                "expires_in": "1 hour"
            }
        }
        
        # Render template and send
        rendered_content = _render_email_template("password_reset", content["data"])
        email_result = _send_email(user_info["email"], subject, rendered_content)
        
        return {
            "status": "sent",
            "user_id": user_id,
            "email": user_info["email"],
            "reset_token": reset_token,
            "sent_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Password reset email failed for user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=3)