"""
Webhook endpoints for external integrations.
"""
from fastapi import APIRouter, Request, HTTPException, status, BackgroundTasks
from typing import Dict, Any, List
import logging
import json
from datetime import datetime

from app.services.analytics_service import analytics_service
from app.services.performance_service import performance_monitor

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/alerts")
async def receive_prometheus_alerts(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Webhook endpoint for receiving Prometheus/Alertmanager alerts.
    
    This endpoint receives alerts from Alertmanager and processes them
    for internal notification and logging systems.
    """
    try:
        alert_data = await request.json()
        
        # Log the received alert
        logger.info(f"Received Prometheus alert: {alert_data}")
        
        # Process alerts in background
        background_tasks.add_task(process_alerts, alert_data)
        
        return {"status": "received", "message": "Alert processed successfully"}
        
    except Exception as e:
        logger.error(f"Failed to process Prometheus alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process alert"
        )


async def process_alerts(alert_data: Dict[str, Any]):
    """
    Process incoming alerts and take appropriate actions.
    
    Args:
        alert_data: Alert data from Prometheus/Alertmanager
    """
    try:
        alerts = alert_data.get('alerts', [])
        
        for alert in alerts:
            await process_single_alert(alert)
            
    except Exception as e:
        logger.error(f"Error processing alerts: {e}")


async def process_single_alert(alert: Dict[str, Any]):
    """
    Process a single alert and perform appropriate actions.
    
    Args:
        alert: Single alert data
    """
    try:
        alert_name = alert.get('labels', {}).get('alertname', 'Unknown')
        severity = alert.get('labels', {}).get('severity', 'unknown')
        service = alert.get('labels', {}).get('service', 'unknown')
        status = alert.get('status', 'unknown')
        
        # Create internal alert record
        internal_alert = {
            'type': 'prometheus_alert',
            'severity': severity,
            'service': service,
            'alert_name': alert_name,
            'status': status,
            'message': alert.get('annotations', {}).get('summary', 'No summary available'),
            'description': alert.get('annotations', {}).get('description', 'No description available'),
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'prometheus',
            'raw_data': alert
        }
        
        # Add to performance monitor alerts
        performance_monitor.performance_alerts.append(internal_alert)
        
        # Limit alert history
        if len(performance_monitor.performance_alerts) > 100:
            performance_monitor.performance_alerts = performance_monitor.performance_alerts[-100:]
        
        # Take action based on severity and alert type
        if severity == 'critical':
            await handle_critical_alert(internal_alert)
        elif severity == 'warning':
            await handle_warning_alert(internal_alert)
        
        # Log the processed alert
        logger.info(f"Processed {severity} alert: {alert_name} for service {service}")
        
    except Exception as e:
        logger.error(f"Error processing single alert: {e}")


async def handle_critical_alert(alert: Dict[str, Any]):
    """
    Handle critical alerts with immediate actions.
    
    Args:
        alert: Alert information
    """
    try:
        alert_name = alert.get('alert_name', '')
        service = alert.get('service', '')
        
        # Critical alert actions
        if 'memory' in alert_name.lower():
            # Memory critical - could trigger cache cleanup
            logger.critical(f"Critical memory alert for {service}: {alert.get('message', '')}")
            
        elif 'cpu' in alert_name.lower():
            # CPU critical - could trigger load balancing
            logger.critical(f"Critical CPU alert for {service}: {alert.get('message', '')}")
            
        elif 'service' in alert_name.lower() and 'down' in alert_name.lower():
            # Service down - could trigger restart procedures
            logger.critical(f"Service down alert for {service}: {alert.get('message', '')}")
            
        # Could integrate with:
        # - PagerDuty for on-call notifications
        # - Slack for team notifications
        # - Automated remediation systems
        # - Health check endpoints
        
    except Exception as e:
        logger.error(f"Error handling critical alert: {e}")


async def handle_warning_alert(alert: Dict[str, Any]):
    """
    Handle warning alerts with monitoring and logging.
    
    Args:
        alert: Alert information
    """
    try:
        alert_name = alert.get('alert_name', '')
        service = alert.get('service', '')
        
        # Warning alert actions
        if 'cache' in alert_name.lower():
            # Cache performance warning
            logger.warning(f"Cache performance warning for {service}: {alert.get('message', '')}")
            
        elif 'response' in alert_name.lower():
            # Response time warning
            logger.warning(f"Response time warning for {service}: {alert.get('message', '')}")
            
        elif 'rate_limit' in alert_name.lower():
            # Rate limiting warning
            logger.warning(f"Rate limiting warning for {service}: {alert.get('message', '')}")
        
        # Could integrate with:
        # - Monitoring dashboards
        # - Trend analysis systems
        # - Capacity planning tools
        
    except Exception as e:
        logger.error(f"Error handling warning alert: {e}")


@router.post("/data-quality")
async def receive_data_quality_alert(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Webhook endpoint for data quality alerts.
    
    This endpoint receives data quality notifications from external
    data validation systems.
    """
    try:
        quality_data = await request.json()
        
        # Log the received data quality alert
        logger.info(f"Received data quality alert: {quality_data}")
        
        # Process in background
        background_tasks.add_task(process_data_quality_alert, quality_data)
        
        return {"status": "received", "message": "Data quality alert processed successfully"}
        
    except Exception as e:
        logger.error(f"Failed to process data quality alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process data quality alert"
        )


async def process_data_quality_alert(quality_data: Dict[str, Any]):
    """
    Process data quality alerts.
    
    Args:
        quality_data: Data quality alert information
    """
    try:
        rule_type = quality_data.get('rule_type', 'unknown')
        severity = quality_data.get('severity', 'medium')
        pipeline_id = quality_data.get('pipeline_id', 'unknown')
        
        # Create internal data quality alert
        internal_alert = {
            'type': 'data_quality_violation',
            'severity': severity,
            'rule_type': rule_type,
            'pipeline_id': pipeline_id,
            'message': quality_data.get('message', 'Data quality issue detected'),
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'external_validator',
            'raw_data': quality_data
        }
        
        # Add to performance monitor alerts
        performance_monitor.performance_alerts.append(internal_alert)
        
        # Record analytics event
        await analytics_service.record_event(
            event_type="data_quality_alert",
            properties={
                "rule_type": rule_type,
                "severity": severity,
                "pipeline_id": pipeline_id,
                "source": "webhook"
            }
        )
        
        logger.info(f"Processed data quality alert: {rule_type} for pipeline {pipeline_id}")
        
    except Exception as e:
        logger.error(f"Error processing data quality alert: {e}")


@router.get("/health")
async def webhook_health():
    """
    Health check endpoint for webhook services.
    """
    return {
        "status": "healthy",
        "service": "webhooks",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": [
            "/alerts",
            "/data-quality",
            "/health"
        ]
    }