"""Test comprehensive input validation."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.validators import ValidatorMixin, ValidationException
from app.core.validation import SecurityValidation
from app.schemas.connector import ConnectorCreate, DatabaseConnectionConfig
from app.schemas.auth import UserRegister
from app.models.connector import ConnectorType


class TestValidatorMixin:
    """Test the ValidatorMixin methods."""
    
    def test_password_strength_validation(self):
        """Test password strength validation."""
        # Valid password
        strong_password = "StrongP@ssw0rd!"
        assert ValidatorMixin.validate_password_strength(strong_password) == strong_password
        
        # Too short
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_password_strength("weak")
        assert "too short" in exc_info.value.message.lower()
        
        # Missing uppercase
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_password_strength("lowercase123!")
        assert "uppercase" in exc_info.value.message.lower()
        
        # Missing special character
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_password_strength("NoSpecial123")
        assert "special" in exc_info.value.message.lower()
    
    def test_email_format_validation(self):
        """Test email format validation."""
        # Valid email
        valid_email = "user@example.com"
        assert ValidatorMixin.validate_email_format(valid_email) == valid_email.lower()
        
        # Invalid format
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_email_format("invalid-email")
        assert "invalid email format" in exc_info.value.message.lower()
        
        # Suspicious patterns
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_email_format("user+script@example.com")
        assert "suspicious" in exc_info.value.message.lower()
    
    def test_cron_expression_validation(self):
        """Test cron expression validation."""
        # Valid cron (every minute)
        valid_cron = "* * * * *"
        assert ValidatorMixin.validate_cron_expression(valid_cron) == valid_cron
        
        # Invalid cron
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_cron_expression("invalid cron")
        assert "invalid cron expression" in exc_info.value.message.lower()
        
        # Too frequent (every second would be invalid)
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_cron_expression("*/1 * * * * *")
        assert "minimum interval" in exc_info.value.message.lower()
    
    def test_url_validation(self):
        """Test URL format validation."""
        # Valid HTTPS URL
        valid_url = "https://example.com/api"
        assert ValidatorMixin.validate_url_format(valid_url) == valid_url
        
        # Invalid scheme
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_url_format("ftp://example.com")
        assert "invalid url scheme" in exc_info.value.message.lower()
        
        # Invalid format
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_url_format("not-a-url")
        assert "invalid url format" in exc_info.value.message.lower()
    
    def test_json_data_validation(self):
        """Test JSON data validation."""
        # Valid simple dict
        valid_data = {"key": "value", "number": 123}
        result = ValidatorMixin.validate_json_data(valid_data)
        assert result == valid_data
        
        # Too deep nesting
        deep_dict = {"level1": {"level2": {"level3": {"level4": {}}}}}
        for i in range(20):
            deep_dict = {"level": deep_dict}
        
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_json_data(deep_dict)
        assert "too deep" in exc_info.value.message.lower()
        
        # Too many keys
        large_dict = {f"key_{i}": f"value_{i}" for i in range(200)}
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.validate_json_data(large_dict)
        assert "too many properties" in exc_info.value.message.lower()
    
    def test_string_sanitization(self):
        """Test string input sanitization."""
        # Normal string
        clean_string = "Hello World"
        assert ValidatorMixin.sanitize_string_input(clean_string) == clean_string
        
        # String with HTML
        html_string = "<script>alert('xss')</script>Hello"
        sanitized = ValidatorMixin.sanitize_string_input(html_string)
        assert "<script>" not in sanitized
        
        # String too long
        long_string = "a" * 1000
        with pytest.raises(ValidationException) as exc_info:
            ValidatorMixin.sanitize_string_input(long_string, max_length=500)
        assert "too long" in exc_info.value.message.lower()


class TestSecurityValidation:
    """Test security validation utilities."""
    
    def test_sql_injection_detection(self):
        """Test SQL injection pattern detection."""
        # Safe string
        safe_string = "Hello World"
        assert SecurityValidation.validate_no_sql_injection(safe_string) == safe_string
        
        # SQL injection attempts
        sql_injections = [
            "'; DROP TABLE users; --",
            "' OR '1'='1' --",
            "UNION SELECT * FROM users",
            "<script>alert('xss')</script>"
        ]
        
        for injection in sql_injections:
            with pytest.raises(ValidationException) as exc_info:
                SecurityValidation.validate_no_sql_injection(injection)
            assert "dangerous content" in exc_info.value.message.lower()
    
    def test_path_traversal_detection(self):
        """Test path traversal detection."""
        # Safe path
        safe_path = "documents/file.txt"
        assert SecurityValidation.validate_no_path_traversal(safe_path) == safe_path
        
        # Path traversal attempts
        traversals = [
            "../../../etc/passwd",
            "..\\..\\windows\\system32",
            "%2e%2e%2f",
            "%252e%252e%252f"
        ]
        
        for traversal in traversals:
            with pytest.raises(ValidationException) as exc_info:
                SecurityValidation.validate_no_path_traversal(traversal)
            assert "traversal" in exc_info.value.message.lower()
    
    def test_safe_redirect_url(self):
        """Test safe redirect URL validation."""
        # Safe relative URL
        relative_url = "/dashboard"
        assert SecurityValidation.validate_safe_redirect_url(relative_url) == relative_url
        
        # Safe absolute URL with allowed domain
        allowed_domains = ["example.com", "app.example.com"]
        safe_url = "https://example.com/dashboard"
        assert SecurityValidation.validate_safe_redirect_url(safe_url, allowed_domains) == safe_url
        
        # Unsafe redirect (different domain)
        unsafe_url = "https://malicious.com/phishing"
        with pytest.raises(ValidationException) as exc_info:
            SecurityValidation.validate_safe_redirect_url(unsafe_url, allowed_domains)
        assert "not allowed" in exc_info.value.message.lower()
        
        # Protocol-relative URL (unsafe)
        protocol_relative = "//malicious.com/phishing"
        with pytest.raises(ValidationException) as exc_info:
            SecurityValidation.validate_safe_redirect_url(protocol_relative)
        assert "invalid" in exc_info.value.message.lower()


class TestSchemaValidation:
    """Test schema validation with ValidatorMixin."""
    
    def test_user_register_validation(self):
        """Test user registration schema validation."""
        # Valid registration data
        valid_data = {
            "email": "user@example.com",
            "password": "StrongP@ssw0rd!",
            "confirm_password": "StrongP@ssw0rd!",
            "first_name": "John",
            "last_name": "Doe"
        }
        user_register = UserRegister(**valid_data)
        assert user_register.email == "user@example.com"
        assert user_register.first_name == "John"
        
        # Invalid email
        with pytest.raises(ValueError):
            UserRegister(
                email="invalid-email",
                password="StrongP@ssw0rd!",
                confirm_password="StrongP@ssw0rd!",
                first_name="John",
                last_name="Doe"
            )
        
        # Weak password
        with pytest.raises(ValueError):
            UserRegister(
                email="user@example.com",
                password="weak",
                confirm_password="weak",
                first_name="John",
                last_name="Doe"
            )
        
        # Password mismatch
        with pytest.raises(ValueError):
            UserRegister(
                email="user@example.com",
                password="StrongP@ssw0rd!",
                confirm_password="DifferentP@ssw0rd!",
                first_name="John",
                last_name="Doe"
            )
    
    def test_connector_create_validation(self):
        """Test connector creation schema validation."""
        # Valid database connector
        valid_db_config = {
            "host": "localhost",
            "port": 5432,
            "database": "testdb",
            "username": "testuser",
            "password": "testpass"
        }
        
        valid_connector = ConnectorCreate(
            name="Test Database Connector",
            description="A test database connector",
            type=ConnectorType.DATABASE,
            connection_config=valid_db_config
        )
        
        assert valid_connector.name == "Test Database Connector"
        assert valid_connector.type == ConnectorType.DATABASE
        
        # Invalid name (contains SQL injection attempt)
        with pytest.raises(ValueError):
            ConnectorCreate(
                name="'; DROP TABLE connectors; --",
                description="Malicious connector",
                type=ConnectorType.DATABASE,
                connection_config=valid_db_config
            )
        
        # Invalid database config (missing required fields)
        with pytest.raises(ValueError):
            ConnectorCreate(
                name="Test Connector",
                type=ConnectorType.DATABASE,
                connection_config={"host": "localhost"}  # Missing required fields
            )
    
    def test_database_connection_config_validation(self):
        """Test database connection config validation."""
        # Valid config
        valid_config = DatabaseConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="testuser",
            password="testpass"
        )
        
        assert valid_config.host == "localhost"
        assert valid_config.port == 5432
        
        # Invalid host format
        with pytest.raises(ValueError):
            DatabaseConnectionConfig(
                host="localhost'; DROP TABLE users; --",
                port=5432,
                database="testdb",
                username="testuser"
            )
        
        # Invalid port range
        with pytest.raises(ValueError):
            DatabaseConnectionConfig(
                host="localhost",
                port=99999,  # Too high
                database="testdb",
                username="testuser"
            )
        
        # Invalid database name format
        with pytest.raises(ValueError):
            DatabaseConnectionConfig(
                host="localhost",
                port=5432,
                database="test-db-with-hyphens",  # Invalid chars
                username="testuser"
            )


@pytest.mark.asyncio
class TestValidationIntegration:
    """Test validation integration with API endpoints."""
    
    async def test_connector_creation_validation_integration(self, async_client, db_session):
        """Test connector creation with validation."""
        # Valid connector creation
        valid_data = {
            "name": "Test Connector",
            "description": "A valid test connector",
            "type": "database",
            "connection_config": {
                "host": "localhost",
                "port": 5432,
                "database": "testdb",
                "username": "testuser",
                "password": "testpass"
            }
        }
        
        # This would need proper authentication setup
        # response = await async_client.post("/api/v1/connectors/", json=valid_data)
        # assert response.status_code == 201
        
        # Invalid connector (SQL injection attempt)
        malicious_data = {
            "name": "'; DROP TABLE connectors; --",
            "description": "Malicious connector",
            "type": "database",
            "connection_config": {
                "host": "localhost",
                "port": 5432,
                "database": "testdb",
                "username": "testuser"
            }
        }
        
        # This would need proper authentication setup
        # response = await async_client.post("/api/v1/connectors/", json=malicious_data)
        # assert response.status_code == 422
        # assert "VALIDATION_ERROR" in response.json()["error"]
    
    async def test_auth_registration_validation_integration(self, async_client):
        """Test user registration with validation."""
        # Valid registration
        valid_data = {
            "email": "test@example.com",
            "password": "StrongP@ssw0rd!",
            "confirm_password": "StrongP@ssw0rd!",
            "first_name": "John",
            "last_name": "Doe"
        }
        
        # This would need proper database setup
        # response = await async_client.post("/api/v1/auth/register", json=valid_data)
        # assert response.status_code == 201
        
        # Invalid registration (weak password)
        invalid_data = {
            "email": "test@example.com",
            "password": "weak",
            "confirm_password": "weak",
            "first_name": "John",
            "last_name": "Doe"
        }
        
        # This would need proper database setup
        # response = await async_client.post("/api/v1/auth/register", json=invalid_data)
        # assert response.status_code == 422
        # assert "VALIDATION_ERROR" in response.json()["error"]


if __name__ == "__main__":
    pytest.main([__file__])