from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_connectors():
    """List available data connectors."""
    return {
        "message": "Data connectors endpoint",
        "available_connectors": [
            "CSV File Upload",
            "Excel File Upload", 
            "JSON File Upload",
            "Database Connection",
            "API Endpoint"
        ],
        "status": "Coming soon"
    }