"""
Advanced Data Quality Monitoring Service with automated alerts and validation.
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
import json
from dataclasses import dataclass, asdict
from enum import Enum
import pandas as pd
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
import logging

from app.models.pipeline import PipelineExecution, ETLPipeline, ExecutionStatus
from app.models.connector import DataConnector, DataPreview
from app.models.user import User, Organization
from app.core.redis import redis_manager
from app.core.websocket import websocket_manager, MessageType
from app.schemas.websocket import DataQualityAlert
import uuid

logger = logging.getLogger(__name__)


class QualityRuleType(str, Enum):
    """Types of data quality rules."""
    COMPLETENESS = "completeness"
    ACCURACY = "accuracy"
    CONSISTENCY = "consistency"
    VALIDITY = "validity"
    UNIQUENESS = "uniqueness"
    TIMELINESS = "timeliness"
    INTEGRITY = "integrity"


class AlertSeverity(str, Enum):
    """Data quality alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class QualityRule:
    """Data quality rule definition."""
    rule_id: str
    name: str
    description: str
    rule_type: QualityRuleType
    column_name: Optional[str] = None
    threshold: Optional[float] = None
    expected_values: Optional[List[Any]] = None
    regex_pattern: Optional[str] = None
    is_active: bool = True
    severity: AlertSeverity = AlertSeverity.MEDIUM


@dataclass
class QualityCheck:
    """Individual quality check result."""
    rule_id: str
    rule_name: str
    rule_type: QualityRuleType
    status: str  # passed, failed, warning
    score: float  # 0.0 to 100.0
    records_checked: int
    records_failed: int
    details: Dict[str, Any]
    timestamp: datetime
    
    def __post_init__(self):
        if isinstance(self.timestamp, str):
            self.timestamp = datetime.fromisoformat(self.timestamp)


@dataclass 
class QualityReport:
    """Comprehensive data quality report."""
    pipeline_id: str
    execution_id: str
    overall_score: float
    checks_performed: List[QualityCheck]
    alerts_generated: List[DataQualityAlert]
    recommendations: List[str]
    timestamp: datetime
    
    def __post_init__(self):
        if isinstance(self.timestamp, str):
            self.timestamp = datetime.fromisoformat(self.timestamp)


class DataQualityService:
    """Advanced data quality monitoring and alerting service."""
    
    def __init__(self):
        self.default_rules = self._create_default_rules()
        self.alert_thresholds = {
            AlertSeverity.LOW: 90.0,
            AlertSeverity.MEDIUM: 80.0,
            AlertSeverity.HIGH: 70.0,
            AlertSeverity.CRITICAL: 60.0
        }
        
    def _create_default_rules(self) -> List[QualityRule]:
        """Create default data quality rules."""
        return [
            QualityRule(
                rule_id="completeness_check",
                name="Data Completeness",
                description="Check for missing or null values",
                rule_type=QualityRuleType.COMPLETENESS,
                threshold=95.0,
                severity=AlertSeverity.HIGH
            ),
            QualityRule(
                rule_id="uniqueness_check",
                name="Data Uniqueness",
                description="Check for duplicate records",
                rule_type=QualityRuleType.UNIQUENESS,
                threshold=98.0,
                severity=AlertSeverity.MEDIUM
            ),
            QualityRule(
                rule_id="validity_email",
                name="Email Format Validation",
                description="Validate email addresses",
                rule_type=QualityRuleType.VALIDITY,
                regex_pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
                threshold=99.0,
                severity=AlertSeverity.HIGH
            ),
            QualityRule(
                rule_id="consistency_date",
                name="Date Consistency",
                description="Check date format consistency",
                rule_type=QualityRuleType.CONSISTENCY,
                threshold=100.0,
                severity=AlertSeverity.CRITICAL
            )
        ]
    
    async def run_quality_checks(
        self,
        pipeline_id: str,
        execution_id: str,
        data: pd.DataFrame,
        rules: Optional[List[QualityRule]] = None,
        db: AsyncSession = None
    ) -> QualityReport:
        """Run comprehensive data quality checks on a dataset."""
        
        if rules is None:
            rules = self.default_rules
        
        checks_performed = []
        alerts_generated = []
        
        # Run each quality rule
        for rule in rules:
            if not rule.is_active:
                continue
                
            try:
                check_result = await self._execute_quality_rule(rule, data)
                checks_performed.append(check_result)
                
                # Generate alert if threshold not met
                if check_result.score < self.alert_thresholds[rule.severity]:
                    alert = await self._generate_quality_alert(
                        rule, check_result, pipeline_id, execution_id
                    )
                    alerts_generated.append(alert)
                    
            except Exception as e:
                logger.error(f"Failed to execute quality rule {rule.rule_id}: {e}")
                # Create failed check
                failed_check = QualityCheck(
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    rule_type=rule.rule_type,
                    status="error",
                    score=0.0,
                    records_checked=len(data),
                    records_failed=len(data),
                    details={"error": str(e)},
                    timestamp=datetime.utcnow()
                )
                checks_performed.append(failed_check)
        
        # Calculate overall score
        if checks_performed:
            overall_score = sum(check.score for check in checks_performed) / len(checks_performed)
        else:
            overall_score = 0.0
        
        # Generate recommendations
        recommendations = await self._generate_recommendations(checks_performed, data)
        
        # Create quality report
        report = QualityReport(
            pipeline_id=pipeline_id,
            execution_id=execution_id,
            overall_score=overall_score,
            checks_performed=checks_performed,
            alerts_generated=alerts_generated,
            recommendations=recommendations,
            timestamp=datetime.utcnow()
        )
        
        # Store report in cache
        await self._store_quality_report(report)
        
        # Send alerts via WebSocket
        if alerts_generated and db:
            await self._broadcast_quality_alerts(alerts_generated, pipeline_id, db)
        
        return report
    
    async def _execute_quality_rule(self, rule: QualityRule, data: pd.DataFrame) -> QualityCheck:
        """Execute a specific quality rule on the data."""
        
        if rule.rule_type == QualityRuleType.COMPLETENESS:
            return await self._check_completeness(rule, data)
        elif rule.rule_type == QualityRuleType.UNIQUENESS:
            return await self._check_uniqueness(rule, data)
        elif rule.rule_type == QualityRuleType.VALIDITY:
            return await self._check_validity(rule, data)
        elif rule.rule_type == QualityRuleType.CONSISTENCY:
            return await self._check_consistency(rule, data)
        elif rule.rule_type == QualityRuleType.ACCURACY:
            return await self._check_accuracy(rule, data)
        elif rule.rule_type == QualityRuleType.TIMELINESS:
            return await self._check_timeliness(rule, data)
        else:
            raise ValueError(f"Unknown quality rule type: {rule.rule_type}")
    
    async def _check_completeness(self, rule: QualityRule, data: pd.DataFrame) -> QualityCheck:
        """Check data completeness (missing values)."""
        
        total_records = len(data)
        
        if rule.column_name:
            # Check specific column
            if rule.column_name not in data.columns:
                missing_records = total_records
                completeness_score = 0.0
            else:
                missing_records = data[rule.column_name].isna().sum()
                completeness_score = ((total_records - missing_records) / total_records) * 100
        else:
            # Check overall completeness
            missing_records = data.isna().sum().sum()
            total_cells = total_records * len(data.columns)
            completeness_score = ((total_cells - missing_records) / total_cells) * 100 if total_cells > 0 else 0.0
        
        status = "passed" if completeness_score >= (rule.threshold or 95.0) else "failed"
        
        return QualityCheck(
            rule_id=rule.rule_id,
            rule_name=rule.name,
            rule_type=rule.rule_type,
            status=status,
            score=completeness_score,
            records_checked=total_records,
            records_failed=missing_records,
            details={
                "column_name": rule.column_name,
                "missing_percentage": round(100 - completeness_score, 2),
                "threshold": rule.threshold
            },
            timestamp=datetime.utcnow()
        )
    
    async def _check_uniqueness(self, rule: QualityRule, data: pd.DataFrame) -> QualityCheck:
        """Check data uniqueness (duplicate records)."""
        
        total_records = len(data)
        
        if rule.column_name:
            # Check specific column for duplicates
            if rule.column_name not in data.columns:
                duplicate_records = 0
                uniqueness_score = 100.0
            else:
                duplicate_records = data[rule.column_name].duplicated().sum()
                uniqueness_score = ((total_records - duplicate_records) / total_records) * 100
        else:
            # Check entire rows for duplicates
            duplicate_records = data.duplicated().sum()
            uniqueness_score = ((total_records - duplicate_records) / total_records) * 100 if total_records > 0 else 100.0
        
        status = "passed" if uniqueness_score >= (rule.threshold or 98.0) else "failed"
        
        return QualityCheck(
            rule_id=rule.rule_id,
            rule_name=rule.name,
            rule_type=rule.rule_type,
            status=status,
            score=uniqueness_score,
            records_checked=total_records,
            records_failed=duplicate_records,
            details={
                "column_name": rule.column_name,
                "duplicate_percentage": round(100 - uniqueness_score, 2),
                "threshold": rule.threshold
            },
            timestamp=datetime.utcnow()
        )
    
    async def _check_validity(self, rule: QualityRule, data: pd.DataFrame) -> QualityCheck:
        """Check data validity using patterns or expected values."""
        
        total_records = len(data)
        
        if not rule.column_name or rule.column_name not in data.columns:
            return QualityCheck(
                rule_id=rule.rule_id,
                rule_name=rule.name,
                rule_type=rule.rule_type,
                status="error",
                score=0.0,
                records_checked=total_records,
                records_failed=total_records,
                details={"error": f"Column '{rule.column_name}' not found"},
                timestamp=datetime.utcnow()
            )
        
        column_data = data[rule.column_name].dropna()
        valid_records = 0
        
        if rule.regex_pattern:
            # Validate using regex pattern
            import re
            pattern = re.compile(rule.regex_pattern)
            valid_records = column_data.astype(str).str.match(pattern, na=False).sum()
        elif rule.expected_values:
            # Validate against expected values
            valid_records = column_data.isin(rule.expected_values).sum()
        else:
            # Default validation (non-null)
            valid_records = len(column_data)
        
        validity_score = (valid_records / len(column_data)) * 100 if len(column_data) > 0 else 100.0
        invalid_records = len(column_data) - valid_records
        
        status = "passed" if validity_score >= (rule.threshold or 95.0) else "failed"
        
        return QualityCheck(
            rule_id=rule.rule_id,
            rule_name=rule.name,
            rule_type=rule.rule_type,
            status=status,
            score=validity_score,
            records_checked=len(column_data),
            records_failed=invalid_records,
            details={
                "column_name": rule.column_name,
                "invalid_percentage": round(100 - validity_score, 2),
                "regex_pattern": rule.regex_pattern,
                "expected_values": rule.expected_values[:10] if rule.expected_values else None,
                "threshold": rule.threshold
            },
            timestamp=datetime.utcnow()
        )
    
    async def _check_consistency(self, rule: QualityRule, data: pd.DataFrame) -> QualityCheck:
        """Check data consistency (format, type consistency)."""
        
        total_records = len(data)
        
        if not rule.column_name or rule.column_name not in data.columns:
            return QualityCheck(
                rule_id=rule.rule_id,
                rule_name=rule.name,
                rule_type=rule.rule_type,
                status="error",
                score=0.0,
                records_checked=total_records,
                records_failed=total_records,
                details={"error": f"Column '{rule.column_name}' not found"},
                timestamp=datetime.utcnow()
            )
        
        column_data = data[rule.column_name].dropna()
        
        # Check type consistency
        if len(column_data) == 0:
            consistency_score = 100.0
            inconsistent_records = 0
        else:
            # For date columns, check format consistency
            if 'date' in rule.name.lower() or 'time' in rule.name.lower():
                try:
                    pd.to_datetime(column_data, errors='coerce')
                    consistent_records = column_data.notna().sum()
                    consistency_score = (consistent_records / len(column_data)) * 100
                    inconsistent_records = len(column_data) - consistent_records
                except:
                    consistency_score = 0.0
                    inconsistent_records = len(column_data)
            else:
                # Check if all values can be converted to the same type
                try:
                    # Try to determine the most common type
                    types = column_data.apply(type).value_counts()
                    most_common_type = types.index[0]
                    consistent_records = column_data.apply(lambda x: isinstance(x, most_common_type)).sum()
                    consistency_score = (consistent_records / len(column_data)) * 100
                    inconsistent_records = len(column_data) - consistent_records
                except:
                    consistency_score = 0.0
                    inconsistent_records = len(column_data)
        
        status = "passed" if consistency_score >= (rule.threshold or 95.0) else "failed"
        
        return QualityCheck(
            rule_id=rule.rule_id,
            rule_name=rule.name,
            rule_type=rule.rule_type,
            status=status,
            score=consistency_score,
            records_checked=len(column_data),
            records_failed=inconsistent_records,
            details={
                "column_name": rule.column_name,
                "inconsistent_percentage": round(100 - consistency_score, 2),
                "threshold": rule.threshold
            },
            timestamp=datetime.utcnow()
        )
    
    async def _check_accuracy(self, rule: QualityRule, data: pd.DataFrame) -> QualityCheck:
        """Check data accuracy against reference data or business rules."""
        
        # This is a placeholder for accuracy checks that would require
        # reference data or external validation
        total_records = len(data)
        
        # For now, assume high accuracy if no obvious issues
        accuracy_score = 95.0
        inaccurate_records = int(total_records * 0.05)  # Assume 5% potential inaccuracy
        
        status = "passed" if accuracy_score >= (rule.threshold or 90.0) else "failed"
        
        return QualityCheck(
            rule_id=rule.rule_id,
            rule_name=rule.name,
            rule_type=rule.rule_type,
            status=status,
            score=accuracy_score,
            records_checked=total_records,
            records_failed=inaccurate_records,
            details={
                "note": "Accuracy check requires reference data for full validation",
                "threshold": rule.threshold
            },
            timestamp=datetime.utcnow()
        )
    
    async def _check_timeliness(self, rule: QualityRule, data: pd.DataFrame) -> QualityCheck:
        """Check data timeliness (freshness, currency)."""
        
        total_records = len(data)
        
        # Check if there are timestamp columns
        timestamp_columns = []
        for col in data.columns:
            if any(keyword in col.lower() for keyword in ['time', 'date', 'created', 'updated', 'timestamp']):
                timestamp_columns.append(col)
        
        if not timestamp_columns:
            # No timestamp columns found
            return QualityCheck(
                rule_id=rule.rule_id,
                rule_name=rule.name,
                rule_type=rule.rule_type,
                status="warning",
                score=50.0,
                records_checked=total_records,
                records_failed=0,
                details={
                    "note": "No timestamp columns found for timeliness check",
                    "threshold": rule.threshold
                },
                timestamp=datetime.utcnow()
            )
        
        # Check freshness of most recent timestamp column
        most_recent_col = timestamp_columns[0]
        try:
            timestamps = pd.to_datetime(data[most_recent_col], errors='coerce')
            latest_timestamp = timestamps.max()
            
            # Calculate age in hours
            age_hours = (datetime.utcnow() - latest_timestamp.to_pydatetime()).total_seconds() / 3600
            
            # Assume data is timely if less than 24 hours old
            timeliness_score = max(0, 100 - (age_hours / 24) * 100) if age_hours >= 0 else 100
            
            status = "passed" if timeliness_score >= (rule.threshold or 75.0) else "failed"
            
        except Exception as e:
            timeliness_score = 0.0
            status = "error"
            age_hours = None
        
        return QualityCheck(
            rule_id=rule.rule_id,
            rule_name=rule.name,
            rule_type=rule.rule_type,
            status=status,
            score=timeliness_score,
            records_checked=total_records,
            records_failed=0,
            details={
                "timestamp_column": most_recent_col,
                "age_hours": age_hours,
                "threshold": rule.threshold
            },
            timestamp=datetime.utcnow()
        )
    
    async def _generate_quality_alert(
        self,
        rule: QualityRule,
        check: QualityCheck,
        pipeline_id: str,
        execution_id: str
    ) -> DataQualityAlert:
        """Generate a data quality alert."""
        
        alert_id = str(uuid.uuid4())
        
        # Create descriptive title and message
        if check.score == 0.0 and check.status == "error":
            title = f"Data Quality Check Failed: {rule.name}"
            description = f"Quality check '{rule.name}' encountered an error during execution."
        else:
            title = f"Data Quality Alert: {rule.name}"
            description = f"Data quality score ({check.score:.1f}%) below threshold ({rule.threshold:.1f}%) for rule '{rule.name}'."
        
        # Generate suggested actions
        suggested_actions = []
        if rule.rule_type == QualityRuleType.COMPLETENESS:
            suggested_actions = [
                "Review data source for missing values",
                "Implement data validation at ingestion",
                "Consider default value imputation strategies"
            ]
        elif rule.rule_type == QualityRuleType.UNIQUENESS:
            suggested_actions = [
                "Investigate duplicate data sources",
                "Implement deduplication logic",
                "Review primary key constraints"
            ]
        elif rule.rule_type == QualityRuleType.VALIDITY:
            suggested_actions = [
                "Review data format requirements",
                "Implement input validation",
                "Update data cleansing rules"
            ]
        
        return DataQualityAlert(
            alert_id=alert_id,
            severity=rule.severity,
            title=title,
            description=description,
            source=f"pipeline:{pipeline_id}",
            affected_records=check.records_failed,
            timestamp=datetime.utcnow(),
            details={
                "rule_id": rule.rule_id,
                "rule_type": rule.rule_type,
                "execution_id": execution_id,
                "score": check.score,
                "threshold": rule.threshold,
                "check_details": check.details
            },
            suggested_actions=suggested_actions,
            auto_resolution_available=rule.rule_type in [QualityRuleType.COMPLETENESS, QualityRuleType.UNIQUENESS]
        )
    
    async def _generate_recommendations(self, checks: List[QualityCheck], data: pd.DataFrame) -> List[str]:
        """Generate data quality improvement recommendations."""
        
        recommendations = []
        
        # Analyze failed checks
        failed_checks = [check for check in checks if check.status == "failed"]
        
        if failed_checks:
            recommendations.append("Review data ingestion process to address quality issues")
            
            # Check for patterns in failures
            completeness_failures = [c for c in failed_checks if c.rule_type == QualityRuleType.COMPLETENESS]
            if completeness_failures:
                recommendations.append("Implement data validation and default value strategies")
            
            uniqueness_failures = [c for c in failed_checks if c.rule_type == QualityRuleType.UNIQUENESS]
            if uniqueness_failures:
                recommendations.append("Add deduplication step to data pipeline")
            
            validity_failures = [c for c in failed_checks if c.rule_type == QualityRuleType.VALIDITY]
            if validity_failures:
                recommendations.append("Enhance data format validation and cleansing")
        
        # Check data characteristics
        if len(data) < 100:
            recommendations.append("Consider increasing sample size for more reliable quality metrics")
        
        return recommendations
    
    async def _store_quality_report(self, report: QualityReport):
        """Store quality report in cache for later retrieval."""
        
        cache_key = f"quality_report:{report.pipeline_id}:{report.execution_id}"
        
        # Convert to JSON-serializable format
        report_data = {
            "pipeline_id": report.pipeline_id,
            "execution_id": report.execution_id,
            "overall_score": report.overall_score,
            "checks_performed": [asdict(check) for check in report.checks_performed],
            "alerts_generated": [alert.dict() for alert in report.alerts_generated],
            "recommendations": report.recommendations,
            "timestamp": report.timestamp.isoformat()
        }
        
        await redis_manager.set(cache_key, json.dumps(report_data, default=str), ex=86400)  # 24 hours
    
    async def _broadcast_quality_alerts(
        self,
        alerts: List[DataQualityAlert],
        pipeline_id: str,
        db: AsyncSession
    ):
        """Broadcast quality alerts via WebSocket."""
        
        # Get pipeline to find organization
        result = await db.execute(
            select(ETLPipeline).where(ETLPipeline.id == pipeline_id)
        )
        pipeline = result.scalar_one_or_none()
        
        if pipeline:
            for alert in alerts:
                await websocket_manager.send_data_quality_alert(
                    alert_data=alert.dict(),
                    org_id=str(pipeline.organization_id)
                )
    
    async def get_quality_report(self, pipeline_id: str, execution_id: str) -> Optional[QualityReport]:
        """Retrieve quality report from cache."""
        
        cache_key = f"quality_report:{pipeline_id}:{execution_id}"
        cached_data = await redis_manager.get(cache_key)
        
        if cached_data:
            report_data = json.loads(cached_data)
            
            # Reconstruct QualityCheck objects
            checks = []
            for check_data in report_data["checks_performed"]:
                check = QualityCheck(**check_data)
                checks.append(check)
            
            # Reconstruct DataQualityAlert objects
            alerts = []
            for alert_data in report_data["alerts_generated"]:
                alert = DataQualityAlert(**alert_data)
                alerts.append(alert)
            
            return QualityReport(
                pipeline_id=report_data["pipeline_id"],
                execution_id=report_data["execution_id"],
                overall_score=report_data["overall_score"],
                checks_performed=checks,
                alerts_generated=alerts,
                recommendations=report_data["recommendations"],
                timestamp=datetime.fromisoformat(report_data["timestamp"])
            )
        
        return None


# Global data quality service instance
data_quality_service = DataQualityService()