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
    
    # This would integrate with email service (SendGrid, SES, etc.)
    # For now, returning mock response
    message_id = f"msg_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(recipient) % 10000}"
    
    logger.info(f"Email sent to {recipient}: {subject}")
    
    return {
        "message_id": message_id,
        "status": "sent",
        "recipient": recipient,
        "timestamp": datetime.now().isoformat()
    }

def _get_user_notification_preferences(user_id: int) -> Dict[str, Any]:
    """Get user notification preferences from database."""
    
    # Mock preferences
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
    
    # This would store notification in database for in-app display
    notification_id = f"notif_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id}"
    
    logger.info(f"In-app notification sent to user {user_id}: {content.get('title', '')}")
    
    return {
        "notification_id": notification_id,
        "user_id": user_id,
        "status": "sent",
        "timestamp": datetime.now().isoformat()
    }

def _send_webhook_notification(webhook_url: str, content: Dict[str, Any]) -> Dict[str, Any]:
    """Send webhook notification."""
    
    # This would make HTTP request to webhook URL
    logger.info(f"Webhook notification sent to {webhook_url}")
    
    return {
        "webhook_url": webhook_url,
        "status": "sent",
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
    
    # Mock user info
    return {
        "user_id": user_id,
        "name": f"User {user_id}",
        "email": f"user{user_id}@example.com",
        "role": "analyst"
    }

def _generate_secure_download_link(file_path: str, user_id: int) -> str:
    """Generate secure download link with expiration."""
    
    token = f"download_token_{user_id}_{int(datetime.now().timestamp())}"
    return f"/api/v1/reports/download?token={token}"

def _get_active_users() -> List[Dict[str, Any]]:
    """Get all active users from database."""
    
    # Mock active users
    return [
        {"user_id": 1, "email": "user1@example.com", "name": "User 1"},
        {"user_id": 2, "email": "user2@example.com", "name": "User 2"},
        {"user_id": 3, "email": "user3@example.com", "name": "User 3"}
    ]

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
    
    # Mock activity data
    return {
        "user_id": user_id,
        "user_name": f"User {user_id}",
        "has_activity": True,
        "pipelines_executed": 5,
        "reports_generated": 3,
        "data_processed_gb": 12.5,
        "top_insights": [
            "Revenue increased by 15% this week",
            "Customer satisfaction scores improved",
            "Supply chain efficiency optimized"
        ],
        "recommendations": [
            "Consider expanding successful marketing campaigns",
            "Review high-performing product categories",
            "Optimize underperforming regions"
        ],
        "upcoming_schedules": [
            {"pipeline": "Daily Sales Report", "next_run": "Tomorrow 9:00 AM"},
            {"pipeline": "Weekly Analytics", "next_run": "Monday 6:00 AM"}
        ]
    }