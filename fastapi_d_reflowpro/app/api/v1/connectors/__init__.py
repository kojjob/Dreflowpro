# Data connectors endpoints
from fastapi import APIRouter

# Create a basic router for now
router = APIRouter()

@router.get("/")
async def list_connectors():
    """List available data connectors."""
    return {
        "message": "Data connectors endpoint - Coming soon!",
        "supported_types": [
            "CSV files",
            "Excel files", 
            "JSON files",
            "Databases",
            "APIs",
            "Webhooks"
        ]
    }

__all__ = ["router"]