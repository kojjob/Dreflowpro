"""
Multi-Factor Authentication (MFA/2FA) Implementation
Provides TOTP-based two-factor authentication with backup codes
"""

import pyotp
import qrcode
import io
import base64
import secrets
import string
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timedelta
import hashlib
import hmac

from sqlalchemy.orm import Session
from sqlalchemy import select, update

from ..core.config import settings
from ..core.security import SecurityUtils


class MFAManager:
    """
    Manages Multi-Factor Authentication operations including:
    - TOTP secret generation and validation
    - QR code generation for authenticator apps
    - Backup codes generation and validation
    - MFA enrollment and verification
    """
    
    def __init__(self):
        self.issuer = settings.APP_NAME
        self.algorithm = "SHA256"
        self.digits = 6
        self.interval = 30
        self.backup_code_length = 8
        self.backup_code_count = 10
        
    def generate_secret(self) -> str:
        """
        Generate a new TOTP secret for a user
        
        Returns:
            Base32 encoded secret string
        """
        return pyotp.random_base32()
    
    def generate_provisioning_uri(
        self,
        email: str,
        secret: str,
        issuer_name: Optional[str] = None
    ) -> str:
        """
        Generate provisioning URI for authenticator apps
        
        Args:
            email: User's email address
            secret: TOTP secret
            issuer_name: Optional custom issuer name
            
        Returns:
            otpauth:// URI for QR code generation
        """
        totp = pyotp.TOTP(
            secret,
            issuer=issuer_name or self.issuer,
            algorithm=self.algorithm,
            digits=self.digits,
            interval=self.interval
        )
        
        return totp.provisioning_uri(
            name=email,
            issuer_name=issuer_name or self.issuer
        )
    
    def generate_qr_code(self, provisioning_uri: str) -> str:
        """
        Generate QR code image for authenticator app setup
        
        Args:
            provisioning_uri: otpauth:// URI
            
        Returns:
            Base64 encoded PNG image of QR code
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_base64}"
    
    def verify_token(
        self,
        secret: str,
        token: str,
        window: int = 1
    ) -> bool:
        """
        Verify a TOTP token
        
        Args:
            secret: User's TOTP secret
            token: 6-digit token from authenticator app
            window: Time window tolerance (default 1 = ±30 seconds)
            
        Returns:
            True if token is valid, False otherwise
        """
        if not secret or not token:
            return False
            
        try:
            totp = pyotp.TOTP(
                secret,
                algorithm=self.algorithm,
                digits=self.digits,
                interval=self.interval
            )
            
            # Verify with time window tolerance
            return totp.verify(token, valid_window=window)
            
        except Exception:
            return False
    
    def generate_backup_codes(self) -> List[str]:
        """
        Generate backup recovery codes
        
        Returns:
            List of backup codes
        """
        codes = []
        alphabet = string.ascii_uppercase + string.digits
        
        for _ in range(self.backup_code_count):
            code = ''.join(
                secrets.choice(alphabet) 
                for _ in range(self.backup_code_length)
            )
            # Format as XXXX-XXXX
            formatted_code = f"{code[:4]}-{code[4:]}"
            codes.append(formatted_code)
        
        return codes
    
    def hash_backup_code(self, code: str) -> str:
        """
        Hash a backup code for secure storage
        
        Args:
            code: Plain text backup code
            
        Returns:
            Hashed backup code
        """
        # Remove formatting
        clean_code = code.replace("-", "").upper()
        
        # Use SHA256 for hashing
        return hashlib.sha256(
            clean_code.encode()
        ).hexdigest()
    
    def verify_backup_code(
        self,
        code: str,
        hashed_codes: List[str]
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify a backup code against stored hashes
        
        Args:
            code: User-provided backup code
            hashed_codes: List of hashed backup codes
            
        Returns:
            Tuple of (is_valid, matched_hash)
        """
        if not code or not hashed_codes:
            return False, None
            
        hashed_input = self.hash_backup_code(code)
        
        if hashed_input in hashed_codes:
            return True, hashed_input
            
        return False, None
    
    async def enable_mfa(
        self,
        user_id: str,
        secret: str,
        backup_codes: List[str],
        db: Session
    ) -> Dict[str, Any]:
        """
        Enable MFA for a user
        
        Args:
            user_id: User ID
            secret: TOTP secret
            backup_codes: List of backup codes
            db: Database session
            
        Returns:
            Result dictionary with status and details
        """
        try:
            # Hash backup codes for storage
            hashed_codes = [
                self.hash_backup_code(code) 
                for code in backup_codes
            ]
            
            # Store MFA settings in user record or separate table
            # This is a simplified example - adjust based on your model
            from ..models.user import User
            
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(
                    mfa_enabled=True,
                    mfa_secret=secret,  # Should be encrypted in production
                    mfa_backup_codes=hashed_codes,
                    mfa_enabled_at=datetime.utcnow()
                )
            )
            
            await db.execute(stmt)
            await db.commit()
            
            return {
                "success": True,
                "message": "MFA enabled successfully",
                "backup_codes": backup_codes  # Return plain codes once for user to save
            }
            
        except Exception as e:
            await db.rollback()
            return {
                "success": False,
                "message": f"Failed to enable MFA: {str(e)}"
            }
    
    async def disable_mfa(
        self,
        user_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Disable MFA for a user
        
        Args:
            user_id: User ID
            db: Database session
            
        Returns:
            Result dictionary with status
        """
        try:
            from ..models.user import User
            
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(
                    mfa_enabled=False,
                    mfa_secret=None,
                    mfa_backup_codes=None,
                    mfa_enabled_at=None
                )
            )
            
            await db.execute(stmt)
            await db.commit()
            
            return {
                "success": True,
                "message": "MFA disabled successfully"
            }
            
        except Exception as e:
            await db.rollback()
            return {
                "success": False,
                "message": f"Failed to disable MFA: {str(e)}"
            }
    
    def generate_challenge(self, user_id: str) -> str:
        """
        Generate a challenge for MFA verification
        
        Args:
            user_id: User ID
            
        Returns:
            Challenge token
        """
        # Generate a unique challenge token
        timestamp = datetime.utcnow().isoformat()
        data = f"{user_id}:{timestamp}:{secrets.token_hex(16)}"
        
        # Sign the challenge
        signature = hmac.new(
            settings.SECRET_KEY.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{data}:{signature}"
    
    def verify_challenge(
        self,
        challenge: str,
        max_age_seconds: int = 300
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify a challenge token
        
        Args:
            challenge: Challenge token
            max_age_seconds: Maximum age of challenge in seconds
            
        Returns:
            Tuple of (is_valid, user_id)
        """
        try:
            parts = challenge.split(":")
            if len(parts) != 4:
                return False, None
                
            user_id, timestamp_str, nonce, signature = parts
            
            # Verify signature
            data = f"{user_id}:{timestamp_str}:{nonce}"
            expected_signature = hmac.new(
                settings.SECRET_KEY.encode(),
                data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                return False, None
            
            # Check age
            timestamp = datetime.fromisoformat(timestamp_str)
            age = (datetime.utcnow() - timestamp).total_seconds()
            
            if age > max_age_seconds:
                return False, None
                
            return True, user_id
            
        except Exception:
            return False, None
    
    async def use_backup_code(
        self,
        user_id: str,
        code: str,
        db: Session
    ) -> bool:
        """
        Use a backup code for authentication
        
        Args:
            user_id: User ID
            code: Backup code
            db: Database session
            
        Returns:
            True if code was valid and used, False otherwise
        """
        try:
            from ..models.user import User
            
            # Get user's backup codes
            stmt = select(User).where(User.id == user_id)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user or not user.mfa_backup_codes:
                return False
            
            # Verify the backup code
            is_valid, matched_hash = self.verify_backup_code(
                code,
                user.mfa_backup_codes
            )
            
            if not is_valid:
                return False
            
            # Remove the used backup code
            remaining_codes = [
                c for c in user.mfa_backup_codes 
                if c != matched_hash
            ]
            
            # Update user's backup codes
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(mfa_backup_codes=remaining_codes)
            )
            
            await db.execute(stmt)
            await db.commit()
            
            return True
            
        except Exception:
            await db.rollback()
            return False


# Export singleton instance
mfa_manager = MFAManager()