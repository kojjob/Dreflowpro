#!/usr/bin/env python3
"""
DreflowPro FastAPI Demo Server
Simple demo server to showcase the performance optimizations
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import time
import random

# Create FastAPI app
app = FastAPI(
    title="DreflowPro API",
    description="Advanced Data Pipeline Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Pipeline(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    status: str = "draft"
    is_scheduled: bool = False
    schedule_cron: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class PipelineStep(BaseModel):
    id: str
    step_order: int
    step_type: str
    step_name: str
    step_config: dict = {}

class DashboardStats(BaseModel):
    total_pipelines: int
    active_pipelines: int
    total_executions: int
    success_rate: float

# Mock data
mock_pipelines = [
    {
        "id": "1",
        "name": "Customer Data ETL",
        "description": "Extract customer data from CRM and load into data warehouse",
        "status": "active",
        "is_scheduled": True,
        "schedule_cron": "0 2 * * *",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-20T14:45:00Z"
    },
    {
        "id": "2", 
        "name": "Sales Analytics Pipeline",
        "description": "Process sales data for analytics dashboard",
        "status": "active",
        "is_scheduled": True,
        "schedule_cron": "0 */6 * * *",
        "created_at": "2024-01-10T09:15:00Z",
        "updated_at": "2024-01-18T16:20:00Z"
    },
    {
        "id": "3",
        "name": "Log Processing Pipeline", 
        "description": "Process application logs for monitoring",
        "status": "inactive",
        "is_scheduled": False,
        "created_at": "2024-01-05T11:00:00Z",
        "updated_at": "2024-01-12T13:30:00Z"
    }
]

# Routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "DreflowPro API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": time.time()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "uptime": "running"
    }

@app.get("/api/v1/pipelines", response_model=List[Pipeline])
async def get_pipelines():
    """Get all pipelines"""
    # Simulate some processing time
    await asyncio.sleep(0.1)
    return mock_pipelines

@app.get("/api/v1/pipelines/{pipeline_id}", response_model=Pipeline)
async def get_pipeline(pipeline_id: str):
    """Get a specific pipeline"""
    pipeline = next((p for p in mock_pipelines if p["id"] == pipeline_id), None)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline

@app.post("/api/v1/pipelines", response_model=Pipeline)
async def create_pipeline(pipeline: Pipeline):
    """Create a new pipeline"""
    # Generate ID and timestamps
    new_pipeline = pipeline.dict()
    new_pipeline["id"] = str(len(mock_pipelines) + 1)
    new_pipeline["created_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    new_pipeline["updated_at"] = new_pipeline["created_at"]
    
    mock_pipelines.append(new_pipeline)
    return new_pipeline

@app.put("/api/v1/pipelines/{pipeline_id}", response_model=Pipeline)
async def update_pipeline(pipeline_id: str, pipeline: Pipeline):
    """Update a pipeline"""
    existing_pipeline = next((p for p in mock_pipelines if p["id"] == pipeline_id), None)
    if not existing_pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Update the pipeline
    updated_pipeline = pipeline.dict()
    updated_pipeline["id"] = pipeline_id
    updated_pipeline["created_at"] = existing_pipeline["created_at"]
    updated_pipeline["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # Replace in mock data
    for i, p in enumerate(mock_pipelines):
        if p["id"] == pipeline_id:
            mock_pipelines[i] = updated_pipeline
            break
    
    return updated_pipeline

@app.delete("/api/v1/pipelines/{pipeline_id}")
async def delete_pipeline(pipeline_id: str):
    """Delete a pipeline"""
    global mock_pipelines
    mock_pipelines = [p for p in mock_pipelines if p["id"] != pipeline_id]
    return {"message": "Pipeline deleted successfully"}

@app.get("/api/v1/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    # Simulate some processing
    await asyncio.sleep(0.05)
    
    total_pipelines = len(mock_pipelines)
    active_pipelines = len([p for p in mock_pipelines if p["status"] == "active"])
    
    return {
        "total_pipelines": total_pipelines,
        "active_pipelines": active_pipelines,
        "total_executions": random.randint(100, 1000),
        "success_rate": round(random.uniform(0.85, 0.98), 2)
    }

@app.get("/api/v1/pipelines/{pipeline_id}/executions")
async def get_pipeline_executions(pipeline_id: str):
    """Get pipeline execution history"""
    # Check if pipeline exists
    pipeline = next((p for p in mock_pipelines if p["id"] == pipeline_id), None)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Generate mock execution data
    executions = []
    for i in range(5):
        status = random.choice(["success", "failed", "running"])
        execution = {
            "id": f"exec_{pipeline_id}_{i}",
            "status": status,
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", 
                                      time.gmtime(time.time() - (i * 3600))),
            "duration": random.randint(30, 300) if status != "running" else None,
            "error_message": "Connection timeout" if status == "failed" else None
        }
        if status != "running":
            execution["completed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                                    time.gmtime(time.time() - (i * 3600) + execution["duration"]))
        executions.append(execution)
    
    return executions

@app.post("/api/v1/pipelines/{pipeline_id}/execute")
async def execute_pipeline(pipeline_id: str):
    """Execute a pipeline"""
    pipeline = next((p for p in mock_pipelines if p["id"] == pipeline_id), None)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Simulate execution
    execution_id = f"exec_{pipeline_id}_{int(time.time())}"
    
    return {
        "execution_id": execution_id,
        "status": "started",
        "message": f"Pipeline {pipeline['name']} execution started"
    }

# Performance monitoring endpoint
@app.get("/api/v1/performance/metrics")
async def get_performance_metrics():
    """Get performance metrics"""
    return {
        "bundle_size": 1.88 * 1024 * 1024,  # 1.88MB
        "load_time": random.randint(800, 1500),  # 800-1500ms
        "render_time": random.randint(20, 80),   # 20-80ms
        "memory_usage": random.randint(20, 40),  # 20-40MB
        "core_web_vitals": {
            "lcp": random.randint(1200, 2000),   # 1.2-2.0s
            "fid": random.randint(5, 50),        # 5-50ms
            "cls": round(random.uniform(0.01, 0.08), 3)  # 0.01-0.08
        },
        "lighthouse": {
            "performance": random.randint(85, 98),
            "accessibility": random.randint(90, 100),
            "best_practices": random.randint(88, 96),
            "seo": random.randint(92, 100)
        }
    }

# Import asyncio for sleep
import asyncio

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
