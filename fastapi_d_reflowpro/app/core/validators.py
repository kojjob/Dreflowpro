"""
Advanced input validation utilities and custom validators.
"""
import re
import json
import ipaddress
from typing import Any, Dict, List, Optional, Union, Type
from datetime import datetime, timezone
from pydantic import BaseModel, validator, Field
# from pydantic.validators import strict_str_validator  # Not available in Pydantic v2
from email_validator import validate_email, EmailNotValidError
from uuid import UUID
# import croniter  # Optional dependency for cron validation


class ValidationError(Exception):
    """Custom validation error with detailed context."""
    
    def __init__(self, message: str, field: str = None, code: str = None, context: Dict[str, Any] = None):
        self.message = message
        self.field = field
        self.code = code
        self.context = context or {}
        super().__init__(self.message)


class ValidatorMixin:
    """Mixin class providing common validation methods."""
    
    @classmethod
    def validate_password_strength(cls, password: str) -> str:
        """Validate password strength requirements."""
        if len(password) < 8:
            raise ValidationError(
                "Password must be at least 8 characters long",
                field="password",
                code="PASSWORD_TOO_SHORT"
            )
        
        if len(password) > 128:
            raise ValidationError(
                "Password must be less than 128 characters",
                field="password", 
                code="PASSWORD_TOO_LONG"
            )
        
        # Check for at least one lowercase letter
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                "Password must contain at least one lowercase letter",
                field="password",
                code="PASSWORD_MISSING_LOWERCASE"
            )
        
        # Check for at least one uppercase letter
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                "Password must contain at least one uppercase letter", 
                field="password",
                code="PASSWORD_MISSING_UPPERCASE"
            )
        
        # Check for at least one digit
        if not re.search(r'\d', password):
            raise ValidationError(
                "Password must contain at least one digit",
                field="password",
                code="PASSWORD_MISSING_DIGIT"
            )
        
        # Check for at least one special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(
                "Password must contain at least one special character",
                field="password",
                code="PASSWORD_MISSING_SPECIAL"
            )
        
        # Check for common weak passwords
        weak_patterns = [
            r'(.)\1{2,}',  # 3+ repeated characters
            r'123456|password|qwerty|admin|letmein',  # Common passwords
            r'([a-z]+)\1+',  # Repeated words
        ]
        
        for pattern in weak_patterns:
            if re.search(pattern, password.lower()):
                raise ValidationError(
                    "Password contains common patterns and is too weak",
                    field="password",
                    code="PASSWORD_TOO_WEAK"
                )
        
        return password
    
    @classmethod
    def validate_email_format(cls, email: str) -> str:
        """Validate email format and deliverability."""
        try:
            # Basic format validation
            valid = validate_email(email, check_deliverability=False)
            email = valid.email
            
            # Additional custom validations
            if len(email) > 254:
                raise ValidationError(
                    "Email address is too long",
                    field="email",
                    code="EMAIL_TOO_LONG"
                )
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'^[0-9]+@',  # Starts with numbers only
                r'@[0-9]+\.',  # Domain starts with numbers
                r'\+.*\+.*@',  # Multiple + signs
                r'\.{2,}',  # Multiple consecutive dots
            ]
            
            for pattern in suspicious_patterns:
                if re.search(pattern, email):
                    raise ValidationError(
                        "Email format appears suspicious",
                        field="email",
                        code="EMAIL_SUSPICIOUS_FORMAT"
                    )
            
            return email.lower().strip()
            
        except EmailNotValidError as e:
            raise ValidationError(
                f"Invalid email format: {str(e)}",
                field="email",
                code="EMAIL_INVALID_FORMAT"
            )
    
    @classmethod
    def validate_cron_expression(cls, cron: str) -> str:
        """Validate cron expression format and syntax."""
        if not cron or not cron.strip():
            return cron
        
        cron = cron.strip()
        
        try:
            # Use croniter to validate the expression
            croniter.croniter(cron)
            
            # Additional validation for reasonable ranges
            parts = cron.split()
            if len(parts) < 5 or len(parts) > 6:
                raise ValidationError(
                    "Cron expression must have 5 or 6 parts",
                    field="cron",
                    code="CRON_INVALID_PARTS"
                )
            
            # Check for overly frequent schedules (less than 1 minute)
            if parts[0] == '*' and all(part in ['*', '?'] for part in parts[1:4]):
                raise ValidationError(
                    "Cron expression too frequent (less than 1 minute intervals not allowed)",
                    field="cron", 
                    code="CRON_TOO_FREQUENT"
                )
            
            return cron
            
        except Exception as e:
            raise ValidationError(
                f"Invalid cron expression: {str(e)}",
                field="cron",
                code="CRON_INVALID_SYNTAX"
            )
    
    @classmethod
    def validate_json_data(cls, data: Any, schema: Dict[str, Any] = None) -> Any:
        """Validate JSON data structure and content."""
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError as e:
                raise ValidationError(
                    f"Invalid JSON format: {str(e)}",
                    field="json_data",
                    code="JSON_INVALID_FORMAT"
                )
        
        # Size validation (prevent excessive payloads)
        json_str = json.dumps(data)
        if len(json_str) > 10 * 1024 * 1024:  # 10MB limit
            raise ValidationError(
                "JSON data exceeds maximum size limit (10MB)",
                field="json_data",
                code="JSON_TOO_LARGE"
            )
        
        # Depth validation (prevent deeply nested structures)
        def check_depth(obj, current_depth=0, max_depth=20):
            if current_depth > max_depth:
                raise ValidationError(
                    f"JSON structure too deeply nested (max depth: {max_depth})",
                    field="json_data",
                    code="JSON_TOO_DEEP"
                )
            
            if isinstance(obj, dict):
                for value in obj.values():
                    check_depth(value, current_depth + 1, max_depth)
            elif isinstance(obj, list):
                for item in obj:
                    check_depth(item, current_depth + 1, max_depth)
        
        check_depth(data)
        
        return data
    
    @classmethod
    def validate_url_format(cls, url: str, allowed_schemes: List[str] = None) -> str:
        """Validate URL format and scheme."""
        if not url or not url.strip():
            return url
        
        url = url.strip()
        allowed_schemes = allowed_schemes or ['http', 'https']
        
        # Basic URL pattern validation
        url_pattern = re.compile(
            r'^(https?)://'  # scheme
            r'(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?'  # domain
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE
        )
        
        if not url_pattern.match(url):
            raise ValidationError(
                "Invalid URL format",
                field="url",
                code="URL_INVALID_FORMAT"
            )
        
        # Scheme validation
        scheme = url.split('://')[0].lower()
        if scheme not in allowed_schemes:
            raise ValidationError(
                f"URL scheme must be one of: {allowed_schemes}",
                field="url",
                code="URL_INVALID_SCHEME"
            )
        
        # Length validation
        if len(url) > 2048:
            raise ValidationError(
                "URL is too long (maximum 2048 characters)",
                field="url",
                code="URL_TOO_LONG"
            )
        
        return url
    
    @classmethod
    def validate_ip_address(cls, ip: str, allow_private: bool = True) -> str:
        """Validate IP address format and type."""
        if not ip or not ip.strip():
            return ip
        
        ip = ip.strip()
        
        try:
            ip_obj = ipaddress.ip_address(ip)
            
            if not allow_private and ip_obj.is_private:
                raise ValidationError(
                    "Private IP addresses are not allowed",
                    field="ip_address",
                    code="IP_PRIVATE_NOT_ALLOWED"
                )
            
            # Block loopback and reserved addresses in production contexts
            if ip_obj.is_loopback:
                raise ValidationError(
                    "Loopback addresses are not allowed",
                    field="ip_address", 
                    code="IP_LOOPBACK_NOT_ALLOWED"
                )
            
            return str(ip_obj)
            
        except ipaddress.AddressValueError:
            raise ValidationError(
                "Invalid IP address format",
                field="ip_address",
                code="IP_INVALID_FORMAT"
            )
    
    @classmethod 
    def validate_database_connection(cls, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate database connection configuration."""
        required_fields = ['host', 'port', 'database', 'username']
        
        for field in required_fields:
            if field not in config or not config[field]:
                raise ValidationError(
                    f"Database configuration missing required field: {field}",
                    field=f"db_config.{field}",
                    code="DB_CONFIG_MISSING_FIELD"
                )
        
        # Port validation
        port = config.get('port')
        if not isinstance(port, int) or port < 1 or port > 65535:
            raise ValidationError(
                "Database port must be between 1 and 65535",
                field="db_config.port",
                code="DB_CONFIG_INVALID_PORT"
            )
        
        # Host validation (can be hostname or IP)
        host = config.get('host', '').strip()
        if not host:
            raise ValidationError(
                "Database host cannot be empty",
                field="db_config.host",
                code="DB_CONFIG_EMPTY_HOST"
            )
        
        # Validate connection pool settings
        min_conn = config.get('min_connections', 1)
        max_conn = config.get('max_connections', 10)
        
        if not isinstance(min_conn, int) or min_conn < 1:
            raise ValidationError(
                "Minimum connections must be at least 1",
                field="db_config.min_connections",
                code="DB_CONFIG_INVALID_MIN_CONN"
            )
        
        if not isinstance(max_conn, int) or max_conn < min_conn or max_conn > 100:
            raise ValidationError(
                "Maximum connections must be between minimum connections and 100",
                field="db_config.max_connections", 
                code="DB_CONFIG_INVALID_MAX_CONN"
            )
        
        return config
    
    @classmethod
    def validate_file_upload(cls, file_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate file upload configuration and constraints."""
        # File size validation
        max_size = 100 * 1024 * 1024  # 100MB
        file_size = file_data.get('file_size', 0)
        
        if file_size > max_size:
            raise ValidationError(
                f"File size {file_size} bytes exceeds maximum allowed size of {max_size} bytes",
                field="file_size",
                code="FILE_TOO_LARGE"
            )
        
        # File type validation
        allowed_types = [
            'text/csv', 'application/json', 'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'application/xml'
        ]
        
        file_type = file_data.get('file_type', '').lower()
        if file_type and file_type not in allowed_types:
            raise ValidationError(
                f"File type {file_type} not allowed. Allowed types: {allowed_types}",
                field="file_type",
                code="FILE_TYPE_NOT_ALLOWED"
            )
        
        # File name validation
        file_name = file_data.get('file_name', '')
        if file_name:
            # Check for path traversal attempts
            if '..' in file_name or '/' in file_name or '\\' in file_name:
                raise ValidationError(
                    "File name contains invalid characters",
                    field="file_name",
                    code="FILE_NAME_INVALID_CHARS"
                )
            
            # Check file extension
            allowed_extensions = ['.csv', '.json', '.xls', '.xlsx', '.txt', '.xml']
            file_ext = '.' + file_name.split('.')[-1].lower() if '.' in file_name else ''
            
            if file_ext and file_ext not in allowed_extensions:
                raise ValidationError(
                    f"File extension {file_ext} not allowed",
                    field="file_name",
                    code="FILE_EXTENSION_NOT_ALLOWED"
                )
        
        return file_data
    
    @classmethod
    def sanitize_string_input(cls, value: str, max_length: int = 255, allow_html: bool = False) -> str:
        """Sanitize string input to prevent XSS and other attacks."""
        if not isinstance(value, str):
            value = str(value)
        
        # Basic length check
        if len(value) > max_length:
            raise ValidationError(
                f"Input string too long (max {max_length} characters)",
                field="string_input",
                code="STRING_TOO_LONG"
            )
        
        # Remove null bytes and control characters
        value = ''.join(char for char in value if ord(char) >= 32 or char in '\t\n\r')
        
        if not allow_html:
            # Remove HTML/XML tags
            value = re.sub(r'<[^>]*>', '', value)
            
            # Remove script content
            value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
            
            # Remove dangerous attributes
            dangerous_patterns = [
                r'javascript:', r'vbscript:', r'data:', r'on\w+\s*=',
                r'expression\s*\(', r'@import', r'behavior:'
            ]
            
            for pattern in dangerous_patterns:
                if re.search(pattern, value, re.IGNORECASE):
                    raise ValidationError(
                        "Input contains potentially dangerous content",
                        field="string_input",
                        code="STRING_DANGEROUS_CONTENT"
                    )
        
        return value.strip()


def create_string_validator(min_length: int = 0, max_length: int = 255, pattern: str = None):
    """Create a custom string validator with specified constraints."""
    
    def validate_string(cls, v):
        if not isinstance(v, str):
            v = str(v)
        
        v = v.strip()
        
        if len(v) < min_length:
            raise ValidationError(
                f"String must be at least {min_length} characters long",
                code="STRING_TOO_SHORT"
            )
        
        if len(v) > max_length:
            raise ValidationError(
                f"String must be less than {max_length} characters long", 
                code="STRING_TOO_LONG"
            )
        
        if pattern and not re.match(pattern, v):
            raise ValidationError(
                "String does not match required pattern",
                code="STRING_PATTERN_MISMATCH"
            )
        
        return ValidatorMixin.sanitize_string_input(v, max_length)
    
    return validator('*', pre=True, allow_reuse=True)(validate_string)


def create_numeric_validator(min_value: Union[int, float] = None, max_value: Union[int, float] = None):
    """Create a custom numeric validator with specified constraints."""
    
    def validate_number(cls, v):
        if min_value is not None and v < min_value:
            raise ValidationError(
                f"Value must be at least {min_value}",
                code="NUMBER_TOO_SMALL" 
            )
        
        if max_value is not None and v > max_value:
            raise ValidationError(
                f"Value must be at most {max_value}",
                code="NUMBER_TOO_LARGE"
            )
        
        return v
    
    return validator('*', pre=True, allow_reuse=True)(validate_number)