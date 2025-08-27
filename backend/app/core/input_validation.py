"""
Comprehensive Input Validation Framework
Provides protection against injection attacks, XSS, and malformed input
"""

import re
import html
import json
import bleach
from typing import Any, Dict, List, Optional, Union, Callable
from urllib.parse import urlparse, parse_qs
from email_validator import validate_email, EmailNotValidError
from pathlib import Path
import mimetypes
import magic
from datetime import datetime, date
import ipaddress


class ValidationError(Exception):
    """Custom validation error with details"""
    def __init__(self, message: str, field: Optional[str] = None, value: Any = None):
        self.message = message
        self.field = field
        self.value = value
        super().__init__(self.message)


class InputValidator:
    """
    Comprehensive input validation system including:
    - SQL injection prevention
    - XSS protection
    - Command injection prevention
    - Path traversal prevention
    - File upload validation
    - Data type validation
    - Format validation
    """
    
    def __init__(self):
        # SQL injection patterns
        self.sql_injection_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE|SCRIPT|JAVASCRIPT)\b)",
            r"(--)|(;)|(/\*)|(\*/)",
            r"(\bOR\b\s*\d+\s*=\s*\d+)",
            r"(\bAND\b\s*\d+\s*=\s*\d+)",
            r"(\'|\"|`)",
            r"(\bEXEC\b|\bEXECUTE\b)",
            r"(\bxp_\w+)",
            r"(\bsp_\w+)",
        ]
        
        # XSS patterns
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
            r"<object[^>]*>.*?</object>",
            r"<embed[^>]*>.*?</embed>",
            r"<img[^>]*onerror\s*=",
            r"<svg[^>]*onload\s*=",
        ]
        
        # Command injection patterns
        self.command_injection_patterns = [
            r"[;&|`$]",
            r"\$\(.*\)",
            r"`.*`",
            r"\b(wget|curl|nc|netcat|bash|sh|cmd|powershell)\b",
        ]
        
        # Path traversal patterns
        self.path_traversal_patterns = [
            r"\.\./",
            r"\.\.",
            r"%2e%2e",
            r"%252e%252e",
            r"\.\.\\",
        ]
        
        # Allowed file extensions for uploads
        self.allowed_file_extensions = {
            'image': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
            'document': ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.xls'],
            'data': ['.json', '.xml', '.csv', '.txt'],
            'archive': ['.zip', '.tar', '.gz', '.7z'],
        }
        
        # Maximum file sizes (in bytes)
        self.max_file_sizes = {
            'image': 10 * 1024 * 1024,  # 10MB
            'document': 50 * 1024 * 1024,  # 50MB
            'data': 100 * 1024 * 1024,  # 100MB
            'archive': 200 * 1024 * 1024,  # 200MB
        }
        
        # HTML sanitizer configuration
        self.allowed_tags = [
            'p', 'br', 'strong', 'em', 'u', 'i', 'b',
            'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        ]
        
        self.allowed_attributes = {
            'a': ['href', 'title', 'target'],
            'blockquote': ['cite'],
        }
        
        self.allowed_protocols = ['http', 'https', 'mailto']
    
    def validate_sql_injection(self, value: str, field_name: str = "input") -> str:
        """
        Validate input for SQL injection patterns
        
        Args:
            value: Input value to validate
            field_name: Name of the field being validated
            
        Returns:
            Cleaned value
            
        Raises:
            ValidationError: If SQL injection pattern detected
        """
        if not value:
            return value
        
        value_lower = value.lower()
        
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE):
                raise ValidationError(
                    f"Potential SQL injection detected in {field_name}",
                    field_name,
                    value
                )
        
        return value
    
    def validate_xss(self, value: str, field_name: str = "input") -> str:
        """
        Validate and sanitize input for XSS attacks
        
        Args:
            value: Input value to validate
            field_name: Name of the field being validated
            
        Returns:
            Sanitized value
        """
        if not value:
            return value
        
        # Check for XSS patterns
        for pattern in self.xss_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                # Remove dangerous content instead of rejecting
                value = re.sub(pattern, '', value, flags=re.IGNORECASE)
        
        # HTML escape special characters
        value = html.escape(value)
        
        return value
    
    def sanitize_html(self, html_content: str) -> str:
        """
        Sanitize HTML content while preserving safe tags
        
        Args:
            html_content: HTML content to sanitize
            
        Returns:
            Sanitized HTML
        """
        if not html_content:
            return html_content
        
        # Use bleach to clean HTML
        cleaned = bleach.clean(
            html_content,
            tags=self.allowed_tags,
            attributes=self.allowed_attributes,
            protocols=self.allowed_protocols,
            strip=True
        )
        
        return cleaned
    
    def validate_command_injection(self, value: str, field_name: str = "input") -> str:
        """
        Validate input for command injection patterns
        
        Args:
            value: Input value to validate
            field_name: Name of the field being validated
            
        Returns:
            Cleaned value
            
        Raises:
            ValidationError: If command injection pattern detected
        """
        if not value:
            return value
        
        for pattern in self.command_injection_patterns:
            if re.search(pattern, value):
                raise ValidationError(
                    f"Potential command injection detected in {field_name}",
                    field_name,
                    value
                )
        
        return value
    
    def validate_path_traversal(self, path: str, base_path: Optional[str] = None) -> str:
        """
        Validate path for traversal attacks
        
        Args:
            path: Path to validate
            base_path: Optional base path for validation
            
        Returns:
            Safe path
            
        Raises:
            ValidationError: If path traversal detected
        """
        if not path:
            return path
        
        # Check for path traversal patterns
        for pattern in self.path_traversal_patterns:
            if re.search(pattern, path, re.IGNORECASE):
                raise ValidationError(
                    f"Path traversal attempt detected",
                    "path",
                    path
                )
        
        # Resolve path and check if it's within base path
        if base_path:
            try:
                resolved_path = Path(path).resolve()
                base_resolved = Path(base_path).resolve()
                
                if not str(resolved_path).startswith(str(base_resolved)):
                    raise ValidationError(
                        f"Path outside allowed directory",
                        "path",
                        path
                    )
            except Exception:
                raise ValidationError(
                    f"Invalid path",
                    "path",
                    path
                )
        
        return path
    
    def validate_email_address(self, email: str) -> str:
        """
        Validate email address format
        
        Args:
            email: Email address to validate
            
        Returns:
            Normalized email
            
        Raises:
            ValidationError: If email is invalid
        """
        try:
            # Validate and normalize email
            validated = validate_email(email, check_deliverability=False)
            return validated.email
        except EmailNotValidError as e:
            raise ValidationError(str(e), "email", email)
    
    def validate_url(self, url: str, allowed_schemes: Optional[List[str]] = None) -> str:
        """
        Validate URL format and scheme
        
        Args:
            url: URL to validate
            allowed_schemes: List of allowed URL schemes
            
        Returns:
            Validated URL
            
        Raises:
            ValidationError: If URL is invalid
        """
        if not url:
            return url
        
        if allowed_schemes is None:
            allowed_schemes = ['http', 'https']
        
        try:
            parsed = urlparse(url)
            
            if not parsed.scheme:
                raise ValidationError("URL must include scheme", "url", url)
            
            if parsed.scheme not in allowed_schemes:
                raise ValidationError(
                    f"URL scheme must be one of: {', '.join(allowed_schemes)}",
                    "url",
                    url
                )
            
            if not parsed.netloc:
                raise ValidationError("Invalid URL format", "url", url)
            
            return url
            
        except Exception as e:
            raise ValidationError(f"Invalid URL: {str(e)}", "url", url)
    
    def validate_phone_number(self, phone: str, country_code: Optional[str] = None) -> str:
        """
        Validate phone number format
        
        Args:
            phone: Phone number to validate
            country_code: Optional country code
            
        Returns:
            Cleaned phone number
            
        Raises:
            ValidationError: If phone number is invalid
        """
        # Remove all non-digit characters except +
        cleaned = re.sub(r'[^\d+]', '', phone)
        
        # Basic validation patterns
        patterns = [
            r'^\+\d{10,15}$',  # International format
            r'^\d{10}$',  # 10 digits
            r'^\d{11}$',  # 11 digits
        ]
        
        for pattern in patterns:
            if re.match(pattern, cleaned):
                return cleaned
        
        raise ValidationError(
            "Invalid phone number format",
            "phone",
            phone
        )
    
    def validate_file_upload(
        self,
        filename: str,
        file_content: bytes,
        file_type: str = 'document',
        check_content: bool = True
    ) -> Dict[str, Any]:
        """
        Validate file upload for security
        
        Args:
            filename: Name of the file
            file_content: File content bytes
            file_type: Type category of file
            check_content: Whether to check file content magic bytes
            
        Returns:
            Validation result dictionary
            
        Raises:
            ValidationError: If file validation fails
        """
        result = {
            'filename': filename,
            'size': len(file_content),
            'extension': None,
            'mime_type': None,
            'is_valid': False
        }
        
        # Check filename for path traversal
        self.validate_path_traversal(filename)
        
        # Check file extension
        file_ext = Path(filename).suffix.lower()
        result['extension'] = file_ext
        
        if file_type in self.allowed_file_extensions:
            if file_ext not in self.allowed_file_extensions[file_type]:
                raise ValidationError(
                    f"File extension {file_ext} not allowed for {file_type}",
                    "filename",
                    filename
                )
        
        # Check file size
        max_size = self.max_file_sizes.get(file_type, 10 * 1024 * 1024)
        if len(file_content) > max_size:
            raise ValidationError(
                f"File size exceeds maximum of {max_size} bytes",
                "file_size",
                len(file_content)
            )
        
        # Check file content magic bytes if enabled
        if check_content:
            try:
                mime = magic.from_buffer(file_content, mime=True)
                result['mime_type'] = mime
                
                # Validate MIME type matches extension
                expected_mime = mimetypes.guess_type(filename)[0]
                if expected_mime and mime != expected_mime:
                    # Allow some flexibility for common mismatches
                    allowed_mismatches = [
                        ('application/zip', 'application/x-zip-compressed'),
                        ('text/plain', 'text/csv'),
                    ]
                    
                    if (expected_mime, mime) not in allowed_mismatches:
                        raise ValidationError(
                            f"File content type {mime} doesn't match extension",
                            "file_content",
                            filename
                        )
            except Exception as e:
                # If magic library not available, skip content check
                pass
        
        result['is_valid'] = True
        return result
    
    def validate_json(self, json_string: str) -> Dict[str, Any]:
        """
        Validate and parse JSON string
        
        Args:
            json_string: JSON string to validate
            
        Returns:
            Parsed JSON object
            
        Raises:
            ValidationError: If JSON is invalid
        """
        try:
            return json.loads(json_string)
        except json.JSONDecodeError as e:
            raise ValidationError(f"Invalid JSON: {str(e)}", "json", json_string)
    
    def validate_ip_address(self, ip: str, version: Optional[int] = None) -> str:
        """
        Validate IP address
        
        Args:
            ip: IP address to validate
            version: IP version (4 or 6)
            
        Returns:
            Validated IP address
            
        Raises:
            ValidationError: If IP is invalid
        """
        try:
            if version == 4:
                ipaddress.IPv4Address(ip)
            elif version == 6:
                ipaddress.IPv6Address(ip)
            else:
                ipaddress.ip_address(ip)
            
            return ip
        except ValueError as e:
            raise ValidationError(f"Invalid IP address: {str(e)}", "ip", ip)
    
    def validate_date(
        self,
        date_string: str,
        date_format: str = "%Y-%m-%d",
        min_date: Optional[date] = None,
        max_date: Optional[date] = None
    ) -> date:
        """
        Validate date string and range
        
        Args:
            date_string: Date string to validate
            date_format: Expected date format
            min_date: Minimum allowed date
            max_date: Maximum allowed date
            
        Returns:
            Parsed date object
            
        Raises:
            ValidationError: If date is invalid
        """
        try:
            parsed_date = datetime.strptime(date_string, date_format).date()
            
            if min_date and parsed_date < min_date:
                raise ValidationError(
                    f"Date must be after {min_date}",
                    "date",
                    date_string
                )
            
            if max_date and parsed_date > max_date:
                raise ValidationError(
                    f"Date must be before {max_date}",
                    "date",
                    date_string
                )
            
            return parsed_date
            
        except ValueError as e:
            raise ValidationError(f"Invalid date format: {str(e)}", "date", date_string)
    
    def validate_numeric(
        self,
        value: Union[str, int, float],
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
        allow_negative: bool = True
    ) -> float:
        """
        Validate numeric value and range
        
        Args:
            value: Value to validate
            min_value: Minimum allowed value
            max_value: Maximum allowed value
            allow_negative: Whether negative values are allowed
            
        Returns:
            Numeric value
            
        Raises:
            ValidationError: If value is invalid
        """
        try:
            num_value = float(value)
            
            if not allow_negative and num_value < 0:
                raise ValidationError(
                    "Negative values not allowed",
                    "value",
                    value
                )
            
            if min_value is not None and num_value < min_value:
                raise ValidationError(
                    f"Value must be at least {min_value}",
                    "value",
                    value
                )
            
            if max_value is not None and num_value > max_value:
                raise ValidationError(
                    f"Value must be at most {max_value}",
                    "value",
                    value
                )
            
            return num_value
            
        except (ValueError, TypeError) as e:
            raise ValidationError(f"Invalid numeric value: {str(e)}", "value", value)
    
    def create_validator_chain(self, *validators: Callable) -> Callable:
        """
        Create a chain of validators
        
        Args:
            validators: Validator functions to chain
            
        Returns:
            Chained validator function
        """
        def chained_validator(value: Any) -> Any:
            result = value
            for validator in validators:
                result = validator(result)
            return result
        
        return chained_validator


# Export singleton instance
input_validator = InputValidator()