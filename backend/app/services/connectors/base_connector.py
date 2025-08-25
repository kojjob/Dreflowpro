"""Base connector interface for all data sources."""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, AsyncGenerator, Optional
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class BaseConnector(ABC):
    """Abstract base class for all data connectors."""
    
    def __init__(self, connection_config: Dict[str, Any]):
        self.connection_config = connection_config
        self.is_connected = False
        self._connection = None
    
    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the data source."""
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to the data source."""
        pass
    
    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection and return status."""
        pass
    
    @abstractmethod
    async def get_schema_info(self, table_name: Optional[str] = None) -> Dict[str, Any]:
        """Get schema information for tables/collections."""
        pass
    
    @abstractmethod
    async def extract_data(
        self, 
        query_config: Dict[str, Any],
        batch_size: int = 1000,
        limit: Optional[int] = None
    ) -> AsyncGenerator[pd.DataFrame, None]:
        """Extract data in batches."""
        pass
    
    @abstractmethod
    async def load_data(
        self,
        data: pd.DataFrame,
        destination_config: Dict[str, Any],
        mode: str = "append"  # "append", "replace", "upsert"
    ) -> Dict[str, Any]:
        """Load data to destination."""
        pass
    
    @abstractmethod
    async def execute_query(self, query: str) -> pd.DataFrame:
        """Execute a query and return results."""
        pass
    
    def get_connector_type(self) -> str:
        """Get the connector type identifier."""
        return self.__class__.__name__.replace("Connector", "").lower()
    
    async def validate_config(self) -> Dict[str, Any]:
        """Validate connection configuration."""
        required_fields = self.get_required_config_fields()
        errors = []
        warnings = []
        
        for field in required_fields:
            if field not in self.connection_config:
                errors.append(f"Missing required field: {field}")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    @abstractmethod
    def get_required_config_fields(self) -> List[str]:
        """Get list of required configuration fields."""
        pass
    
    async def __aenter__(self):
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()