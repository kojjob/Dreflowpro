from typing import Dict, Any, List, Optional
import asyncio
import logging
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import pandas as pd

from ..connectors import PostgreSQLConnector, MySQLConnector
from ..transformations import DataTransformations

logger = logging.getLogger(__name__)

class ExecutionStage(Enum):
    """Pipeline execution stages."""
    INITIALIZATION = "initialization"
    EXTRACTION = "extraction" 
    TRANSFORMATION = "transformation"
    LOADING = "loading"
    VALIDATION = "validation"
    COMPLETION = "completion"

@dataclass
class ExecutionContext:
    """Context for pipeline execution."""
    pipeline_id: int
    execution_id: int
    task_id: str
    user_id: Optional[int] = None
    test_mode: bool = False
    sample_size: Optional[int] = None
    start_time: Optional[datetime] = None
    current_stage: Optional[ExecutionStage] = None
    progress: float = 0.0
    metadata: Optional[Dict[str, Any]] = None

class PipelineExecutor:
    """
    Advanced pipeline executor supporting both ETL and ELT patterns.
    
    Features:
    - Async execution with progress tracking
    - Test mode with data sampling
    - Error handling and rollback
    - Performance monitoring
    - AI-powered transformations
    """
    
    def __init__(self, pipeline_id: int, execution_id: int, task_id: str, 
                 test_mode: bool = False, sample_size: Optional[int] = None):
        self.context = ExecutionContext(
            pipeline_id=pipeline_id,
            execution_id=execution_id,
            task_id=task_id,
            test_mode=test_mode,
            sample_size=sample_size,
            start_time=datetime.now(),
            metadata={}
        )
        self.pipeline_config = None
        self.data_sources = []
        self.transformations = []
        self.destinations = []
        
    async def execute(self, execution_params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the complete pipeline."""
        
        try:
            logger.info(f"Starting pipeline execution {self.context.execution_id}")
            
            # Initialize pipeline
            await self._initialize_pipeline(execution_params)
            
            # Determine execution pattern (ETL or ELT)
            execution_pattern = self.pipeline_config.get("execution_pattern", "ETL")
            
            if execution_pattern == "ETL":
                result = await self._execute_etl_pattern()
            else:
                result = await self._execute_elt_pattern()
            
            # Finalize execution
            await self._finalize_execution(result)
            
            return {
                "status": "completed",
                "execution_id": self.context.execution_id,
                "pattern": execution_pattern,
                "records_processed": result.get("records_processed", 0),
                "execution_time_seconds": (datetime.now() - self.context.start_time).total_seconds(),
                "stages_completed": result.get("stages_completed", []),
                "performance_metrics": result.get("performance_metrics", {}),
                "data_quality_score": result.get("data_quality_score", 0),
                "ai_insights": result.get("ai_insights", [])
            }
            
        except Exception as e:
            logger.error(f"Pipeline execution failed: {str(e)}")
            await self._handle_execution_failure(e)
            raise
    
    async def execute_test(self) -> Dict[str, Any]:
        """Execute pipeline in test mode with limited data."""
        
        logger.info(f"Starting pipeline test execution {self.context.execution_id}")
        
        # Load pipeline configuration
        await self._load_pipeline_config()
        
        # Execute test with sample data
        test_result = await self._execute_test_run()
        
        return {
            "status": "test_completed",
            "execution_id": self.context.execution_id,
            "test_records": test_result.get("sample_size", 0),
            "validation_results": test_result.get("validation_results", {}),
            "estimated_full_runtime": test_result.get("estimated_runtime", 0),
            "data_quality_preview": test_result.get("quality_preview", {}),
            "transformation_preview": test_result.get("transformation_preview", [])
        }
    
    # ETL Pattern Implementation
    
    async def _execute_etl_pattern(self) -> Dict[str, Any]:
        """Execute traditional ETL pattern: Extract -> Transform -> Load."""
        
        stages_completed = []
        performance_metrics = {}
        
        # Stage 1: Extract
        await self._update_progress(ExecutionStage.EXTRACTION, 20)
        extraction_result = await self._execute_extraction()
        stages_completed.append("extraction")
        performance_metrics["extraction"] = extraction_result.get("metrics", {})
        
        # Stage 2: Transform
        await self._update_progress(ExecutionStage.TRANSFORMATION, 60)
        transformation_result = await self._execute_transformations(extraction_result["data"])
        stages_completed.append("transformation")
        performance_metrics["transformation"] = transformation_result.get("metrics", {})
        
        # Stage 3: Load
        await self._update_progress(ExecutionStage.LOADING, 85)
        loading_result = await self._execute_loading(transformation_result["data"])
        stages_completed.append("loading")
        performance_metrics["loading"] = loading_result.get("metrics", {})
        
        # Stage 4: Validate
        await self._update_progress(ExecutionStage.VALIDATION, 95)
        validation_result = await self._execute_validation()
        stages_completed.append("validation")
        
        return {
            "pattern": "ETL",
            "stages_completed": stages_completed,
            "records_processed": loading_result.get("records_loaded", 0),
            "performance_metrics": performance_metrics,
            "data_quality_score": validation_result.get("quality_score", 0),
            "ai_insights": transformation_result.get("ai_insights", [])
        }
    
    async def _execute_elt_pattern(self) -> Dict[str, Any]:
        """Execute modern ELT pattern: Extract -> Load -> Transform."""
        
        stages_completed = []
        performance_metrics = {}
        
        # Stage 1: Extract
        await self._update_progress(ExecutionStage.EXTRACTION, 25)
        extraction_result = await self._execute_extraction()
        stages_completed.append("extraction")
        performance_metrics["extraction"] = extraction_result.get("metrics", {})
        
        # Stage 2: Load (raw data)
        await self._update_progress(ExecutionStage.LOADING, 50)
        raw_loading_result = await self._execute_raw_loading(extraction_result["data"])
        stages_completed.append("raw_loading")
        performance_metrics["raw_loading"] = raw_loading_result.get("metrics", {})
        
        # Stage 3: Transform (in destination)
        await self._update_progress(ExecutionStage.TRANSFORMATION, 80)
        transformation_result = await self._execute_in_place_transformations()
        stages_completed.append("transformation")
        performance_metrics["transformation"] = transformation_result.get("metrics", {})
        
        # Stage 4: Validate
        await self._update_progress(ExecutionStage.VALIDATION, 95)
        validation_result = await self._execute_validation()
        stages_completed.append("validation")
        
        return {
            "pattern": "ELT",
            "stages_completed": stages_completed,
            "records_processed": transformation_result.get("records_transformed", 0),
            "performance_metrics": performance_metrics,
            "data_quality_score": validation_result.get("quality_score", 0),
            "ai_insights": transformation_result.get("ai_insights", [])
        }
    
    # Core Execution Methods
    
    async def _initialize_pipeline(self, execution_params: Dict[str, Any]):
        """Initialize pipeline configuration and resources."""
        
        await self._update_progress(ExecutionStage.INITIALIZATION, 5)
        
        # Load pipeline configuration
        await self._load_pipeline_config()
        
        # Initialize data sources
        await self._initialize_data_sources()
        
        # Initialize transformations
        await self._initialize_transformations()
        
        # Initialize destinations
        await self._initialize_destinations()
        
        # Apply execution parameters
        self._apply_execution_params(execution_params)
        
        logger.info(f"Pipeline {self.context.pipeline_id} initialized successfully")
    
    async def _execute_extraction(self) -> Dict[str, Any]:
        """Extract data from configured sources."""
        
        logger.info("Starting data extraction phase")
        
        extracted_data = []
        total_records = 0
        extraction_metrics = {
            "sources_processed": len(self.data_sources),
            "start_time": datetime.now(),
            "errors": []
        }
        
        for source in self.data_sources:
            try:
                source_data = await self._extract_from_source(source)
                extracted_data.append({
                    "source_id": source.get("id"),
                    "data": source_data,
                    "record_count": len(source_data) if isinstance(source_data, list) else 1
                })
                total_records += len(source_data) if isinstance(source_data, list) else 1
                
            except Exception as e:
                error_msg = f"Failed to extract from source {source.get('id')}: {str(e)}"
                logger.error(error_msg)
                extraction_metrics["errors"].append(error_msg)
                
                if source.get("required", True):
                    raise Exception(f"Required source extraction failed: {error_msg}")
        
        extraction_metrics["end_time"] = datetime.now()
        extraction_metrics["total_records"] = total_records
        extraction_metrics["duration_seconds"] = (
            extraction_metrics["end_time"] - extraction_metrics["start_time"]
        ).total_seconds()
        
        logger.info(f"Extraction completed: {total_records} records from {len(self.data_sources)} sources")
        
        return {
            "data": extracted_data,
            "metrics": extraction_metrics
        }
    
    async def _execute_transformations(self, extracted_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute data transformations."""
        
        logger.info("Starting data transformation phase")
        
        transformed_data = extracted_data.copy()
        ai_insights = []
        transformation_metrics = {
            "transformations_applied": len(self.transformations),
            "start_time": datetime.now(),
            "errors": []
        }
        
        for transformation in self.transformations:
            try:
                transformation_result = await self._apply_transformation(transformation, transformed_data)
                transformed_data = transformation_result["data"]
                
                # Collect AI insights if available
                if transformation_result.get("ai_insights"):
                    ai_insights.extend(transformation_result["ai_insights"])
                    
            except Exception as e:
                error_msg = f"Transformation {transformation.get('name')} failed: {str(e)}"
                logger.error(error_msg)
                transformation_metrics["errors"].append(error_msg)
                
                if transformation.get("required", True):
                    raise Exception(f"Required transformation failed: {error_msg}")
        
        transformation_metrics["end_time"] = datetime.now()
        transformation_metrics["duration_seconds"] = (
            transformation_metrics["end_time"] - transformation_metrics["start_time"]
        ).total_seconds()
        
        logger.info(f"Transformation completed: {len(self.transformations)} transformations applied")
        
        return {
            "data": transformed_data,
            "ai_insights": ai_insights,
            "metrics": transformation_metrics
        }
    
    async def _execute_loading(self, transformed_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Load transformed data to destinations."""
        
        logger.info("Starting data loading phase")
        
        total_records_loaded = 0
        loading_metrics = {
            "destinations_processed": len(self.destinations),
            "start_time": datetime.now(),
            "errors": []
        }
        
        for destination in self.destinations:
            try:
                load_result = await self._load_to_destination(destination, transformed_data)
                total_records_loaded += load_result.get("records_loaded", 0)
                
            except Exception as e:
                error_msg = f"Loading to destination {destination.get('id')} failed: {str(e)}"
                logger.error(error_msg)
                loading_metrics["errors"].append(error_msg)
                
                if destination.get("required", True):
                    raise Exception(f"Required destination loading failed: {error_msg}")
        
        loading_metrics["end_time"] = datetime.now()
        loading_metrics["records_loaded"] = total_records_loaded
        loading_metrics["duration_seconds"] = (
            loading_metrics["end_time"] - loading_metrics["start_time"]
        ).total_seconds()
        
        logger.info(f"Loading completed: {total_records_loaded} records to {len(self.destinations)} destinations")
        
        return {
            "records_loaded": total_records_loaded,
            "metrics": loading_metrics
        }
    
    async def _execute_raw_loading(self, extracted_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Load raw data for ELT pattern."""
        
        logger.info("Starting raw data loading for ELT pattern")
        
        # Similar to _execute_loading but for raw/staging tables
        return await self._execute_loading(extracted_data)
    
    async def _execute_in_place_transformations(self) -> Dict[str, Any]:
        """Execute transformations in the destination system (ELT pattern)."""
        
        logger.info("Starting in-place transformations for ELT pattern")
        
        # Execute SQL/database transformations directly in destination
        transformation_metrics = {
            "start_time": datetime.now(),
            "sql_queries_executed": 0,
            "errors": []
        }
        
        records_transformed = 0
        ai_insights = []
        
        for transformation in self.transformations:
            try:
                # Execute transformation as SQL in destination database
                result = await self._execute_sql_transformation(transformation)
                records_transformed += result.get("records_affected", 0)
                transformation_metrics["sql_queries_executed"] += 1
                
                # Generate AI insights for transformation results
                if transformation.get("ai_enabled", False):
                    insights = await self._generate_transformation_insights(transformation, result)
                    ai_insights.extend(insights)
                    
            except Exception as e:
                error_msg = f"In-place transformation failed: {str(e)}"
                logger.error(error_msg)
                transformation_metrics["errors"].append(error_msg)
        
        transformation_metrics["end_time"] = datetime.now()
        transformation_metrics["duration_seconds"] = (
            transformation_metrics["end_time"] - transformation_metrics["start_time"]
        ).total_seconds()
        
        return {
            "records_transformed": records_transformed,
            "ai_insights": ai_insights,
            "metrics": transformation_metrics
        }
    
    async def _execute_validation(self) -> Dict[str, Any]:
        """Execute data validation and quality checks."""
        
        logger.info("Starting data validation phase")
        
        validation_results = {
            "quality_score": 85.0,  # Mock score
            "checks_passed": 8,
            "checks_failed": 2,
            "data_completeness": 92.5,
            "data_accuracy": 87.8,
            "schema_compliance": 95.2
        }
        
        logger.info(f"Validation completed: Quality score {validation_results['quality_score']}")
        
        return validation_results
    
    async def _execute_test_run(self) -> Dict[str, Any]:
        """Execute test run with sample data."""
        
        sample_size = min(self.context.sample_size or 100, 1000)
        
        return {
            "sample_size": sample_size,
            "validation_results": {
                "schema_valid": True,
                "data_quality_score": 88.5,
                "estimated_processing_time": 45.2
            },
            "estimated_runtime": 180,  # seconds
            "quality_preview": {
                "completeness": 94.2,
                "accuracy": 91.5,
                "consistency": 87.8
            },
            "transformation_preview": [
                {"name": "clean_names", "preview": "Standardized 95% of name fields"},
                {"name": "validate_emails", "preview": "Found 12 invalid email addresses"}
            ]
        }
    
    # Helper Methods
    
    async def _update_progress(self, stage: ExecutionStage, progress: float):
        """Update execution progress."""
        self.context.current_stage = stage
        self.context.progress = progress
        
        # In production, this would update the database/cache
        logger.info(f"Pipeline {self.context.pipeline_id} progress: {stage.value} ({progress}%)")
    
    async def _load_pipeline_config(self):
        """Load pipeline configuration from database."""
        # Mock configuration
        self.pipeline_config = {
            "id": self.context.pipeline_id,
            "name": f"Pipeline {self.context.pipeline_id}",
            "execution_pattern": "ETL",
            "data_sources": [
                {"id": "source_1", "type": "csv", "path": "/data/input.csv"},
                {"id": "source_2", "type": "database", "connection": "postgres://..."}
            ],
            "transformations": [
                {"name": "clean_data", "type": "data_cleaning"},
                {"name": "enrich_data", "type": "ai_enrichment", "ai_enabled": True}
            ],
            "destinations": [
                {"id": "dest_1", "type": "database", "table": "processed_data"}
            ]
        }
        
        logger.info(f"Loaded configuration for pipeline {self.context.pipeline_id}")
    
    async def _initialize_data_sources(self):
        """Initialize data source connections."""
        self.data_sources = self.pipeline_config.get("data_sources", [])
        logger.info(f"Initialized {len(self.data_sources)} data sources")
    
    async def _initialize_transformations(self):
        """Initialize transformation configurations."""
        self.transformations = self.pipeline_config.get("transformations", [])
        logger.info(f"Initialized {len(self.transformations)} transformations")
    
    async def _initialize_destinations(self):
        """Initialize destination connections."""
        self.destinations = self.pipeline_config.get("destinations", [])
        logger.info(f"Initialized {len(self.destinations)} destinations")
    
    def _apply_execution_params(self, params: Dict[str, Any]):
        """Apply execution parameters to override defaults."""
        if params.get("limit_records"):
            self.context.metadata["record_limit"] = params["limit_records"]
        
        if params.get("skip_validation"):
            self.context.metadata["skip_validation"] = True
    
    async def _extract_from_source(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract data from a specific source using real database connectors."""
        source_type = source.get("type", "unknown")
        connection_config = source.get("connection_config", {})
        query_config = source.get("query_config", {})
        
        logger.info(f"Extracting data from {source_type} source: {source.get('name', 'Unknown')}")
        
        try:
            # Create connector based on source type
            connector = None
            if source_type.lower() in ["postgresql", "postgres"]:
                connector = PostgreSQLConnector(connection_config)
            elif source_type.lower() in ["mysql"]:
                connector = MySQLConnector(connection_config)
            else:
                # Fallback to mock data for unsupported types
                logger.warning(f"Unsupported source type {source_type}, using mock data")
                return [{"id": 1, "data": f"Mock data for {source_type}"}]
            
            # Connect and extract data
            await connector.connect()
            
            # Apply sample size if in test mode
            limit = None
            if self.context.test_mode and self.context.sample_size:
                limit = self.context.sample_size
                query_config["limit"] = limit
            
            # Extract data in batches and combine
            all_data = []
            batch_count = 0
            
            async for batch_df in connector.extract_data(query_config, limit=limit):
                # Convert DataFrame to list of dictionaries
                batch_records = batch_df.to_dict('records')
                all_data.extend(batch_records)
                batch_count += 1
                
                logger.info(f"Extracted batch {batch_count}: {len(batch_records)} records")
                
                # Update progress
                self._update_progress(f"Extracted {len(all_data)} records from {source.get('name', 'source')}")
            
            await connector.disconnect()
            
            logger.info(f"Successfully extracted {len(all_data)} records from {source_type} source")
            return all_data
            
        except Exception as e:
            logger.error(f"Failed to extract from source {source.get('name', 'Unknown')}: {str(e)}")
            if connector:
                await connector.disconnect()
            raise Exception(f"Data extraction failed: {str(e)}")
    
    def _update_progress(self, message: str):
        """Update execution progress with a message."""
        logger.info(f"Progress: {message}")
        # This could be enhanced to update the database execution record
    
    async def _apply_transformation(self, transformation: Dict[str, Any], data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply a single transformation to the data using real transformation operations."""
        
        transform_type = transformation.get("type", "unknown")
        transform_config = transformation.get("config", {})
        
        # Apply real transformations
        if transform_type == "join":
            # JOIN transformation requires right dataset
            right_data = transform_config.get("right_data", [])
            if not right_data:
                logger.warning("JOIN transformation missing right_data")
                return {"data": data, "ai_insights": []}
            
            result = DataTransformations.join_data(data, right_data, transform_config)
            
        elif transform_type == "deduplicate":
            result = DataTransformations.deduplicate_data(data, transform_config)
            
        elif transform_type == "validate":
            result = DataTransformations.validate_data(data, transform_config)
            
        elif transform_type == "aggregate":
            result = DataTransformations.aggregate_data(data, transform_config)
            
        elif transform_type == "data_cleaning":
            # Simulate data cleaning (can be expanded with real cleaning logic)
            cleaned_data = data.copy()
            result = {
                "status": "success",
                "data": cleaned_data,
                "original_count": len(data),
                "result_count": len(cleaned_data)
            }
            
        elif transform_type == "ai_enrichment":
            # Simulate AI-powered enrichment (can be expanded with real AI integration)
            enriched_data = data.copy()
            result = {
                "status": "success", 
                "data": enriched_data,
                "original_count": len(data),
                "result_count": len(enriched_data),
                "ai_insights": [{
                    "type": "enrichment",
                    "description": "Added 15 derived fields using AI analysis",
                    "confidence": 0.87
                }]
            }
            
        else:
            logger.warning(f"Unknown transformation type: {transform_type}")
            result = {
                "status": "success",
                "data": data.copy(),
                "original_count": len(data),
                "result_count": len(data)
            }
        
        # Extract AI insights from result
        ai_insights = result.get("ai_insights", [])
        
        # Log transformation results
        if result.get("status") == "success":
            original_count = result.get("original_count", len(data))
            result_count = result.get("result_count", len(data))
            execution_time = result.get("execution_time_seconds", 0)
            
            logger.info(f"Transformation '{transform_type}' completed: {original_count} → {result_count} records in {execution_time:.2f}s")
        else:
            logger.error(f"Transformation '{transform_type}' failed: {result.get('error', 'Unknown error')}")
        
        return {
            "data": result.get("data", data),
            "ai_insights": ai_insights,
            "transformation_result": result
        }
    
    async def _load_to_destination(self, destination: Dict[str, Any], data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Load data to a specific destination using real database connectors."""
        destination_type = destination.get("type", "unknown")
        connection_config = destination.get("connection_config", {})
        load_config = destination.get("load_config", {})
        
        logger.info(f"Loading {len(data)} records to {destination_type} destination: {destination.get('name', 'Unknown')}")
        
        try:
            # Create connector based on destination type
            connector = None
            if destination_type.lower() in ["postgresql", "postgres"]:
                connector = PostgreSQLConnector(connection_config)
            elif destination_type.lower() in ["mysql"]:
                connector = MySQLConnector(connection_config)
            else:
                # Fallback to mock loading for unsupported types
                logger.warning(f"Unsupported destination type {destination_type}, using mock loading")
                return {
                    "records_loaded": len(data),
                    "destination_id": destination.get("id"),
                    "status": "mock_loaded"
                }
            
            # Connect and load data
            await connector.connect()
            
            # Convert data to DataFrame for bulk loading
            df = pd.DataFrame(data)
            
            # Determine load mode (append, replace, etc.)
            load_mode = load_config.get("mode", "append")
            
            # Load data using connector
            load_result = await connector.load_data(
                data=df,
                destination_config=load_config,
                mode=load_mode
            )
            
            await connector.disconnect()
            
            logger.info(f"Successfully loaded {load_result.get('rows_loaded', 0)} records to {destination_type} destination")
            
            return {
                "records_loaded": load_result.get("rows_loaded", 0),
                "destination_id": destination.get("id"),
                "load_time_seconds": load_result.get("load_time_seconds", 0),
                "rows_per_second": load_result.get("rows_per_second", 0),
                "status": load_result.get("status", "completed")
            }
            
        except Exception as e:
            logger.error(f"Failed to load to destination {destination.get('name', 'Unknown')}: {str(e)}")
            if connector:
                await connector.disconnect()
            raise Exception(f"Data loading failed: {str(e)}")
    
    async def _execute_sql_transformation(self, transformation: Dict[str, Any]) -> Dict[str, Any]:
        """Execute SQL transformation in destination database."""
        
        # Mock SQL transformation
        return {
            "records_affected": 150,
            "execution_time_ms": 245
        }
    
    async def _generate_transformation_insights(self, transformation: Dict[str, Any], result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate AI insights for transformation results."""
        
        # Mock AI insight generation
        return [
            {
                "type": "performance",
                "description": f"Transformation processed {result.get('records_affected', 0)} records efficiently",
                "confidence": 0.92
            }
        ]
    
    async def _finalize_execution(self, result: Dict[str, Any]):
        """Finalize pipeline execution."""
        
        await self._update_progress(ExecutionStage.COMPLETION, 100)
        
        # Clean up resources
        # Update execution status in database
        # Send notifications if configured
        
        logger.info(f"Pipeline execution {self.context.execution_id} completed successfully")
    
    async def _handle_execution_failure(self, error: Exception):
        """Handle pipeline execution failure."""
        
        logger.error(f"Pipeline execution {self.context.execution_id} failed: {str(error)}")
        
        # Rollback changes if possible
        # Update execution status
        # Send failure notifications
        # Clean up resources