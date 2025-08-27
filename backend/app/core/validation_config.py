"""
Centralized validation configuration and rules.
"""
from typing import Dict, List, Any
from datetime import datetime, timedelta


class ValidationConfig:
    """Centralized validation configuration."""
    
    # Request limits
    MAX_REQUEST_SIZE_MB = 50
    MAX_JSON_DEPTH = 20
    MAX_ARRAY_ITEMS = 1000
    MAX_OBJECT_PROPERTIES = 100
    
    # String limits
    MAX_NAME_LENGTH = 255
    MAX_DESCRIPTION_LENGTH = 2000
    MAX_TAG_LENGTH = 50
    MAX_TAGS_COUNT = 50
    
    # File upload limits
    MAX_FILE_SIZE_MB = 100
    ALLOWED_FILE_TYPES = [
        'text/csv',
        'application/json',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/xml',
        'text/xml'
    ]
    ALLOWED_FILE_EXTENSIONS = ['.csv', '.json', '.xls', '.xlsx', '.txt', '.xml']
    
    # Database connection limits
    MAX_DB_CONNECTIONS = 100
    MIN_DB_CONNECTIONS = 1
    MAX_CONNECTION_TIMEOUT = 300
    DEFAULT_CONNECTION_TIMEOUT = 30
    
    # API connection limits
    MAX_API_TIMEOUT = 300
    MIN_API_TIMEOUT = 1
    MAX_RETRY_ATTEMPTS = 10
    DEFAULT_RETRY_ATTEMPTS = 3
    MAX_RATE_LIMIT_PER_SECOND = 1000
    DEFAULT_RATE_LIMIT_PER_SECOND = 10
    
    # Pipeline limits
    MAX_PIPELINE_STEPS = 50
    MAX_PIPELINE_TIMEOUT_MINUTES = 1440  # 24 hours
    MIN_PIPELINE_TIMEOUT_MINUTES = 1
    DEFAULT_PIPELINE_TIMEOUT_MINUTES = 60
    MAX_PIPELINE_PRIORITY = 10
    MIN_PIPELINE_PRIORITY = 1
    DEFAULT_PIPELINE_PRIORITY = 5
    
    # Pagination limits
    MAX_PAGE_SIZE = 100
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_NUMBER = 10000
    
    # Security patterns
    SQL_INJECTION_PATTERNS = [
        r"'.*--", r'".*--', r'/\*.*\*/', r'union\s+select', r'drop\s+table',
        r'delete\s+from', r'insert\s+into', r'update\s+.*set', r'exec\s*\(',
        r'sp_\w+', r'xp_\w+', r'<script', r'javascript:', r'vbscript:'
    ]
    
    PATH_TRAVERSAL_PATTERNS = ['../', '..\\', '%2e%2e', '%252e%252e']
    
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'vbscript:',
        r'on\w+\s*=',
        r'expression\s*\(',
        r'@import',
        r'behavior:'
    ]
    
    # Password requirements
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_MAX_LENGTH = 128
    PASSWORD_REQUIRE_LOWERCASE = True
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_DIGIT = True
    PASSWORD_REQUIRE_SPECIAL = True
    PASSWORD_SPECIAL_CHARS = "!@#$%^&*(),.?\":{}|<>"
    
    # Email validation
    MAX_EMAIL_LENGTH = 254
    
    # URL validation
    MAX_URL_LENGTH = 2048
    ALLOWED_URL_SCHEMES = ['http', 'https']
    
    # Date validation
    MAX_FUTURE_YEARS = 10
    
    # Cron validation
    CRON_MIN_INTERVAL_MINUTES = 1
    
    # Rate limiting (for middleware)
    RATE_LIMIT_REQUESTS_PER_MINUTE = 100
    RATE_LIMIT_WINDOW_SIZE = 60
    
    @classmethod
    def get_connector_validation_rules(cls, connector_type: str) -> Dict[str, Any]:
        """Get validation rules specific to connector type."""
        base_rules = {
            'name': {
                'min_length': 1,
                'max_length': cls.MAX_NAME_LENGTH,
                'pattern': r'^[a-zA-Z0-9\s_-]+$'
            },
            'description': {
                'max_length': cls.MAX_DESCRIPTION_LENGTH,
                'allow_html': False
            },
            'tags': {
                'max_count': cls.MAX_TAGS_COUNT,
                'max_length': cls.MAX_TAG_LENGTH,
                'pattern': r'^[a-z0-9-_]+$'
            }
        }
        
        connector_specific_rules = {
            'database': {
                'connection_config': {
                    'required_fields': ['host', 'port', 'database', 'username'],
                    'host': {
                        'max_length': 255,
                        'pattern': r'^[a-zA-Z0-9.-]+$'
                    },
                    'port': {
                        'min_value': 1,
                        'max_value': 65535
                    },
                    'database': {
                        'max_length': 100,
                        'pattern': r'^[a-zA-Z0-9_]+$'
                    },
                    'username': {
                        'max_length': 100,
                        'pattern': r'^[a-zA-Z0-9_]+$'
                    },
                    'password': {
                        'max_length': 255
                    },
                    'min_connections': {
                        'min_value': cls.MIN_DB_CONNECTIONS,
                        'max_value': 50
                    },
                    'max_connections': {
                        'min_value': cls.MIN_DB_CONNECTIONS,
                        'max_value': cls.MAX_DB_CONNECTIONS
                    }
                }
            },
            'file_upload': {
                'connection_config': {
                    'file_path': {
                        'max_length': 500,
                        'disallow_patterns': ['../', '..\\']
                    },
                    'encoding': {
                        'allowed_values': ['utf-8', 'utf-16', 'ascii', 'latin-1', 'iso-8859-1', 'cp1252']
                    },
                    'delimiter': {
                        'max_length': 5
                    },
                    'sheet_name': {
                        'max_length': 100,
                        'disallow_chars': ['/', '\\', '?', '*', '[', ']']
                    }
                }
            },
            'api': {
                'connection_config': {
                    'required_fields': ['base_url'],
                    'base_url': {
                        'max_length': cls.MAX_URL_LENGTH,
                        'schemes': cls.ALLOWED_URL_SCHEMES
                    },
                    'api_key': {
                        'min_length': 10,
                        'max_length': 255
                    },
                    'timeout': {
                        'min_value': cls.MIN_API_TIMEOUT,
                        'max_value': cls.MAX_API_TIMEOUT
                    },
                    'retry_attempts': {
                        'min_value': 0,
                        'max_value': cls.MAX_RETRY_ATTEMPTS
                    }
                }
            }
        }
        
        rules = base_rules.copy()
        if connector_type in connector_specific_rules:
            rules.update(connector_specific_rules[connector_type])
        
        return rules
    
    @classmethod
    def get_pipeline_validation_rules(cls) -> Dict[str, Any]:
        """Get validation rules for pipelines."""
        return {
            'name': {
                'min_length': 1,
                'max_length': cls.MAX_NAME_LENGTH,
                'pattern': r'^[a-zA-Z0-9\s_-]+$'
            },
            'description': {
                'max_length': cls.MAX_DESCRIPTION_LENGTH,
                'allow_html': False
            },
            'steps': {
                'max_count': cls.MAX_PIPELINE_STEPS,
                'min_count': 1
            },
            'priority': {
                'min_value': cls.MIN_PIPELINE_PRIORITY,
                'max_value': cls.MAX_PIPELINE_PRIORITY
            },
            'timeout_minutes': {
                'min_value': cls.MIN_PIPELINE_TIMEOUT_MINUTES,
                'max_value': cls.MAX_PIPELINE_TIMEOUT_MINUTES
            },
            'tags': {
                'max_count': cls.MAX_TAGS_COUNT,
                'max_length': cls.MAX_TAG_LENGTH,
                'pattern': r'^[a-z0-9-_]+$'
            },
            'steps': {
                'max_count': cls.MAX_PIPELINE_STEPS,
                'step_name': {
                    'min_length': 1,
                    'max_length': 100,
                    'pattern': r'^[a-zA-Z0-9\s_-]+$'
                },
                'step_order': {
                    'min_value': 1,
                    'max_value': cls.MAX_PIPELINE_STEPS
                }
            }
        }
    
    @classmethod
    def get_pagination_rules(cls) -> Dict[str, Any]:
        """Get validation rules for pagination."""
        return {
            'page': {
                'min_value': 1,
                'max_value': cls.MAX_PAGE_NUMBER
            },
            'size': {
                'min_value': 1,
                'max_value': cls.MAX_PAGE_SIZE
            }
        }
    
    @classmethod
    def get_search_rules(cls) -> Dict[str, Any]:
        """Get validation rules for search operations."""
        return {
            'search': {
                'min_length': 2,
                'max_length': 255
            },
            'sort_fields': {
                'connector': ['name', 'created_at', 'updated_at', 'type', 'status', 'last_tested'],
                'pipeline': ['name', 'created_at', 'updated_at', 'status', 'priority', 'last_execution']
            },
            'date_ranges': {
                'max_future_years': cls.MAX_FUTURE_YEARS
            }
        }
    
    @classmethod
    def get_security_rules(cls) -> Dict[str, Any]:
        """Get security validation rules."""
        return {
            'sql_injection_patterns': cls.SQL_INJECTION_PATTERNS,
            'path_traversal_patterns': cls.PATH_TRAVERSAL_PATTERNS,
            'xss_patterns': cls.XSS_PATTERNS,
            'password_requirements': {
                'min_length': cls.PASSWORD_MIN_LENGTH,
                'max_length': cls.PASSWORD_MAX_LENGTH,
                'require_lowercase': cls.PASSWORD_REQUIRE_LOWERCASE,
                'require_uppercase': cls.PASSWORD_REQUIRE_UPPERCASE,
                'require_digit': cls.PASSWORD_REQUIRE_DIGIT,
                'require_special': cls.PASSWORD_REQUIRE_SPECIAL,
                'special_chars': cls.PASSWORD_SPECIAL_CHARS
            }
        }
    
    @classmethod
    def get_file_upload_rules(cls) -> Dict[str, Any]:
        """Get file upload validation rules."""
        return {
            'max_size_mb': cls.MAX_FILE_SIZE_MB,
            'allowed_types': cls.ALLOWED_FILE_TYPES,
            'allowed_extensions': cls.ALLOWED_FILE_EXTENSIONS,
            'virus_scan': True
        }


class ValidationMessages:
    """Standardized validation error messages."""
    
    # Generic messages
    FIELD_REQUIRED = "This field is required"
    FIELD_TOO_SHORT = "Field is too short (minimum {min_length} characters)"
    FIELD_TOO_LONG = "Field is too long (maximum {max_length} characters)"
    FIELD_INVALID_FORMAT = "Field format is invalid"
    FIELD_INVALID_TYPE = "Field must be of type {expected_type}"
    
    # String validation messages
    STRING_INVALID_CHARS = "Field contains invalid characters. Only {allowed_chars} are allowed"
    STRING_PATTERN_MISMATCH = "Field does not match required pattern"
    
    # Number validation messages
    NUMBER_TOO_SMALL = "Value must be at least {min_value}"
    NUMBER_TOO_LARGE = "Value must be at most {max_value}"
    
    # Date validation messages
    DATE_IN_PAST = "Date cannot be in the past"
    DATE_TOO_FAR_FUTURE = "Date cannot be more than {max_years} years in the future"
    DATE_RANGE_INVALID = "Start date must be before end date"
    
    # Array validation messages
    ARRAY_TOO_FEW_ITEMS = "Array must contain at least {min_items} items"
    ARRAY_TOO_MANY_ITEMS = "Array must contain at most {max_items} items"
    ARRAY_DUPLICATE_ITEMS = "Array cannot contain duplicate items"
    
    # Security messages
    SECURITY_VIOLATION = "Input contains potentially dangerous content"
    SQL_INJECTION_DETECTED = "Input contains patterns that could be used for SQL injection"
    PATH_TRAVERSAL_DETECTED = "Path contains traversal patterns"
    XSS_DETECTED = "Input contains patterns that could be used for cross-site scripting"
    
    # Authentication messages
    PASSWORD_TOO_WEAK = "Password does not meet security requirements"
    EMAIL_INVALID = "Email address format is invalid"
    
    # Business logic messages
    RESOURCE_NOT_FOUND = "Requested {resource_type} not found"
    RESOURCE_ALREADY_EXISTS = "A {resource_type} with this {field} already exists"
    OPERATION_NOT_ALLOWED = "This operation is not allowed for the current resource state"
    
    @classmethod
    def format_message(cls, message_template: str, **kwargs) -> str:
        """Format a message template with provided values."""
        try:
            return message_template.format(**kwargs)
        except KeyError:
            return message_template