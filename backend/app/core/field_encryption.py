"""
Field-Level Encryption Service
Provides encryption for sensitive data fields with key management
"""

import base64
import json
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.backends import default_backend
import os

from ..core.config import settings


class FieldEncryption:
    """
    Field-level encryption service for sensitive data
    Supports encryption of specific fields in models and JSON data
    """
    
    def __init__(self):
        """Initialize encryption service with key derivation"""
        self.encryption_key = self._get_or_generate_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Define sensitive fields that should be encrypted
        self.sensitive_fields = {
            # User model fields
            "ssn", "social_security_number",
            "credit_card", "card_number", "cvv",
            "bank_account", "account_number", "routing_number",
            "tax_id", "ein", "tin",
            "passport_number", "license_number",
            "medical_record", "health_data",
            
            # API and authentication fields
            "api_secret", "client_secret", "private_key",
            "access_token", "refresh_token",
            "mfa_secret", "totp_secret",
            
            # Personal information
            "date_of_birth", "dob",
            "salary", "income", "compensation",
            "personal_email", "personal_phone",
            
            # Business sensitive data
            "revenue", "profit", "financial_data",
            "trade_secret", "proprietary_data",
            "customer_list", "vendor_list"
        }
    
    def _get_or_generate_key(self) -> bytes:
        """
        Get encryption key from environment or generate new one
        
        Returns:
            Encryption key bytes
        """
        # Try to get key from environment
        if hasattr(settings, 'FIELD_ENCRYPTION_KEY') and settings.FIELD_ENCRYPTION_KEY:
            return settings.FIELD_ENCRYPTION_KEY.encode()
        
        # Generate key from secret key and salt
        password = settings.SECRET_KEY.encode()
        salt = b'dreflowpro_field_encryption_salt_2024'  # Static salt for field encryption
        
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def encrypt_value(self, value: Any) -> str:
        """
        Encrypt a single value
        
        Args:
            value: Value to encrypt (will be converted to string)
            
        Returns:
            Base64 encoded encrypted string
        """
        if value is None:
            return None
        
        # Convert value to string if needed
        if not isinstance(value, str):
            value = json.dumps(value)
        
        # Encrypt the value
        encrypted_bytes = self.cipher_suite.encrypt(value.encode())
        
        # Return base64 encoded string
        return base64.b64encode(encrypted_bytes).decode('utf-8')
    
    def decrypt_value(self, encrypted_value: str) -> Any:
        """
        Decrypt a single value
        
        Args:
            encrypted_value: Base64 encoded encrypted string
            
        Returns:
            Decrypted value
        """
        if encrypted_value is None:
            return None
        
        try:
            # Decode from base64
            encrypted_bytes = base64.b64decode(encrypted_value.encode('utf-8'))
            
            # Decrypt
            decrypted_bytes = self.cipher_suite.decrypt(encrypted_bytes)
            decrypted_str = decrypted_bytes.decode('utf-8')
            
            # Try to parse as JSON, otherwise return as string
            try:
                return json.loads(decrypted_str)
            except json.JSONDecodeError:
                return decrypted_str
                
        except Exception as e:
            # Log error and return None or raise based on requirements
            print(f"Decryption error: {str(e)}")
            return None
    
    def encrypt_dict(
        self,
        data: Dict[str, Any],
        fields_to_encrypt: Optional[List[str]] = None,
        auto_detect: bool = True
    ) -> Dict[str, Any]:
        """
        Encrypt specific fields in a dictionary
        
        Args:
            data: Dictionary containing data
            fields_to_encrypt: List of field names to encrypt
            auto_detect: Auto-detect sensitive fields
            
        Returns:
            Dictionary with encrypted fields
        """
        encrypted_data = data.copy()
        
        # Determine which fields to encrypt
        if fields_to_encrypt:
            target_fields = fields_to_encrypt
        elif auto_detect:
            target_fields = [
                field for field in data.keys()
                if any(sensitive in field.lower() for sensitive in self.sensitive_fields)
            ]
        else:
            return encrypted_data
        
        # Encrypt target fields
        for field in target_fields:
            if field in encrypted_data and encrypted_data[field] is not None:
                encrypted_data[field] = self.encrypt_value(encrypted_data[field])
                # Mark field as encrypted
                encrypted_data[f"__{field}_encrypted"] = True
        
        return encrypted_data
    
    def decrypt_dict(
        self,
        encrypted_data: Dict[str, Any],
        fields_to_decrypt: Optional[List[str]] = None,
        auto_detect: bool = True
    ) -> Dict[str, Any]:
        """
        Decrypt specific fields in a dictionary
        
        Args:
            encrypted_data: Dictionary with encrypted fields
            fields_to_decrypt: List of field names to decrypt
            auto_detect: Auto-detect encrypted fields
            
        Returns:
            Dictionary with decrypted fields
        """
        decrypted_data = encrypted_data.copy()
        
        # Determine which fields to decrypt
        if fields_to_decrypt:
            target_fields = fields_to_decrypt
        elif auto_detect:
            # Look for encryption markers
            target_fields = [
                field.replace("__", "").replace("_encrypted", "")
                for field in encrypted_data.keys()
                if field.endswith("_encrypted") and field.startswith("__")
            ]
        else:
            return decrypted_data
        
        # Decrypt target fields
        for field in target_fields:
            if field in decrypted_data:
                decrypted_data[field] = self.decrypt_value(decrypted_data[field])
                # Remove encryption marker
                marker_field = f"__{field}_encrypted"
                if marker_field in decrypted_data:
                    del decrypted_data[marker_field]
        
        return decrypted_data
    
    def encrypt_model_fields(self, model_instance: Any, fields: List[str]) -> None:
        """
        Encrypt specific fields on a model instance in-place
        
        Args:
            model_instance: SQLAlchemy model instance
            fields: List of field names to encrypt
        """
        for field in fields:
            if hasattr(model_instance, field):
                value = getattr(model_instance, field)
                if value is not None:
                    encrypted = self.encrypt_value(value)
                    setattr(model_instance, field, encrypted)
    
    def decrypt_model_fields(self, model_instance: Any, fields: List[str]) -> None:
        """
        Decrypt specific fields on a model instance in-place
        
        Args:
            model_instance: SQLAlchemy model instance
            fields: List of field names to decrypt
        """
        for field in fields:
            if hasattr(model_instance, field):
                encrypted_value = getattr(model_instance, field)
                if encrypted_value is not None:
                    decrypted = self.decrypt_value(encrypted_value)
                    setattr(model_instance, field, decrypted)
    
    def rotate_encryption_key(
        self,
        new_key: bytes,
        data_to_rotate: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Rotate encryption key by re-encrypting data with new key
        
        Args:
            new_key: New encryption key
            data_to_rotate: List of dictionaries to re-encrypt
            
        Returns:
            Re-encrypted data with new key
        """
        # Decrypt with current key
        decrypted_data = []
        for item in data_to_rotate:
            decrypted_data.append(self.decrypt_dict(item))
        
        # Update to new key
        old_cipher = self.cipher_suite
        self.cipher_suite = Fernet(new_key)
        
        # Re-encrypt with new key
        rotated_data = []
        for item in decrypted_data:
            rotated_data.append(self.encrypt_dict(item))
        
        return rotated_data
    
    def generate_data_key(self, master_key: Optional[bytes] = None) -> Dict[str, str]:
        """
        Generate a data encryption key (for envelope encryption)
        
        Args:
            master_key: Optional master key for encrypting the data key
            
        Returns:
            Dictionary with plain and encrypted data key
        """
        # Generate new data key
        data_key = Fernet.generate_key()
        
        result = {
            "plain_data_key": data_key.decode('utf-8')
        }
        
        # Encrypt data key with master key if provided
        if master_key:
            master_cipher = Fernet(master_key)
            encrypted_data_key = master_cipher.encrypt(data_key)
            result["encrypted_data_key"] = base64.b64encode(encrypted_data_key).decode('utf-8')
        
        return result


class SecureStorage:
    """
    Secure storage wrapper for encrypted data persistence
    """
    
    def __init__(self):
        self.encryption = FieldEncryption()
    
    def store_sensitive_data(
        self,
        data: Dict[str, Any],
        storage_key: str,
        encrypt_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Store sensitive data with encryption
        
        Args:
            data: Data to store
            storage_key: Storage identifier
            encrypt_fields: Fields to encrypt
            
        Returns:
            Storage record with encrypted data
        """
        # Encrypt sensitive fields
        encrypted_data = self.encryption.encrypt_dict(
            data,
            fields_to_encrypt=encrypt_fields
        )
        
        # Create storage record
        storage_record = {
            "storage_key": storage_key,
            "data": encrypted_data,
            "encrypted": True,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return storage_record
    
    def retrieve_sensitive_data(
        self,
        storage_record: Dict[str, Any],
        decrypt_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Retrieve and decrypt sensitive data
        
        Args:
            storage_record: Storage record with encrypted data
            decrypt_fields: Fields to decrypt
            
        Returns:
            Decrypted data
        """
        if not storage_record.get("encrypted"):
            return storage_record.get("data", {})
        
        # Decrypt sensitive fields
        decrypted_data = self.encryption.decrypt_dict(
            storage_record["data"],
            fields_to_decrypt=decrypt_fields
        )
        
        return decrypted_data


# Export singleton instances
field_encryption = FieldEncryption()
secure_storage = SecureStorage()