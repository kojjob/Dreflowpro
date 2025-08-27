"""
Enhanced Session Security Management
Provides session fingerprinting, concurrent session limits, and hijacking prevention
"""

import hashlib
import hmac
import json
import secrets
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
import uuid
from user_agents import parse
import geoip2.database
from pathlib import Path

from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete, and_, or_, func

from ..core.config import settings
from ..core.redis import redis_manager
from ..models.user import User


class SessionFingerprint:
    """Session fingerprint for detecting session hijacking"""
    
    def __init__(
        self,
        user_agent: str,
        ip_address: str,
        accept_language: Optional[str] = None,
        accept_encoding: Optional[str] = None,
        screen_resolution: Optional[str] = None,
        timezone: Optional[str] = None
    ):
        self.user_agent = user_agent
        self.ip_address = ip_address
        self.accept_language = accept_language
        self.accept_encoding = accept_encoding
        self.screen_resolution = screen_resolution
        self.timezone = timezone
        
        # Parse user agent
        self.ua_parsed = parse(user_agent)
        self.browser = f"{self.ua_parsed.browser.family}:{self.ua_parsed.browser.version_string}"
        self.os = f"{self.ua_parsed.os.family}:{self.ua_parsed.os.version_string}"
        self.device = self.ua_parsed.device.family
    
    def generate_fingerprint(self) -> str:
        """Generate a unique fingerprint hash"""
        components = [
            self.browser,
            self.os,
            self.device,
            self.accept_language or "",
            self.accept_encoding or "",
            self.screen_resolution or "",
            self.timezone or "",
        ]
        
        fingerprint_string = "|".join(components)
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()
    
    def get_risk_score(self, previous_fingerprint: Optional['SessionFingerprint']) -> float:
        """
        Calculate risk score when fingerprint changes
        
        Args:
            previous_fingerprint: Previous session fingerprint
            
        Returns:
            Risk score between 0.0 (low) and 1.0 (high)
        """
        if not previous_fingerprint:
            return 0.0
        
        risk_score = 0.0
        
        # Browser change (high risk)
        if self.browser != previous_fingerprint.browser:
            risk_score += 0.3
        
        # OS change (high risk)
        if self.os != previous_fingerprint.os:
            risk_score += 0.3
        
        # Device change (medium risk)
        if self.device != previous_fingerprint.device:
            risk_score += 0.2
        
        # Language change (low risk)
        if self.accept_language != previous_fingerprint.accept_language:
            risk_score += 0.1
        
        # Timezone change (low risk)
        if self.timezone != previous_fingerprint.timezone:
            risk_score += 0.1
        
        return min(risk_score, 1.0)


class SessionSecurityManager:
    """
    Manages enhanced session security including:
    - Session fingerprinting
    - Concurrent session limits
    - Session activity monitoring
    - Geographic anomaly detection
    - Session hijacking prevention
    """
    
    def __init__(self):
        self.session_timeout = settings.SESSION_TIMEOUT_MINUTES * 60  # Convert to seconds
        self.max_concurrent_sessions = settings.MAX_CONCURRENT_SESSIONS or 5
        self.suspicious_risk_threshold = 0.5
        self.session_prefix = "session"
        self.geoip_db_path = Path("data/GeoLite2-City.mmdb")
        
        # Initialize GeoIP database if available
        self.geoip_reader = None
        if self.geoip_db_path.exists():
            try:
                self.geoip_reader = geoip2.database.Reader(str(self.geoip_db_path))
            except Exception:
                pass
    
    def generate_session_id(self) -> str:
        """Generate a secure session ID"""
        return f"{self.session_prefix}_{uuid.uuid4().hex}_{secrets.token_urlsafe(16)}"
    
    def create_session_token(self, session_id: str, user_id: str) -> str:
        """
        Create a signed session token
        
        Args:
            session_id: Session ID
            user_id: User ID
            
        Returns:
            Signed session token
        """
        data = f"{session_id}:{user_id}:{int(datetime.utcnow().timestamp())}"
        signature = hmac.new(
            settings.SECRET_KEY.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{data}:{signature}"
    
    def verify_session_token(
        self,
        token: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Verify a session token
        
        Args:
            token: Session token to verify
            
        Returns:
            Tuple of (is_valid, session_id, user_id)
        """
        try:
            parts = token.split(":")
            if len(parts) != 4:
                return False, None, None
            
            session_id, user_id, timestamp, signature = parts
            
            # Verify signature
            data = f"{session_id}:{user_id}:{timestamp}"
            expected_signature = hmac.new(
                settings.SECRET_KEY.encode(),
                data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                return False, None, None
            
            # Check token age
            token_age = datetime.utcnow().timestamp() - int(timestamp)
            if token_age > self.session_timeout:
                return False, None, None
            
            return True, session_id, user_id
            
        except Exception:
            return False, None, None
    
    async def create_session(
        self,
        user_id: str,
        fingerprint: SessionFingerprint,
        metadata: Optional[Dict[str, Any]] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """
        Create a new session with security features
        
        Args:
            user_id: User ID
            fingerprint: Session fingerprint
            metadata: Optional session metadata
            db: Database session
            
        Returns:
            Session details dictionary
        """
        try:
            # Check concurrent session limit
            existing_sessions = await self.get_active_sessions(user_id)
            
            if len(existing_sessions) >= self.max_concurrent_sessions:
                # Revoke oldest session
                oldest_session = min(
                    existing_sessions,
                    key=lambda s: s.get('created_at', datetime.utcnow())
                )
                await self.revoke_session(oldest_session['session_id'])
            
            # Generate session details
            session_id = self.generate_session_id()
            session_token = self.create_session_token(session_id, user_id)
            
            # Get geographic location if available
            location_data = self.get_location_from_ip(fingerprint.ip_address)
            
            # Create session data
            session_data = {
                'session_id': session_id,
                'user_id': user_id,
                'fingerprint_hash': fingerprint.generate_fingerprint(),
                'fingerprint_data': {
                    'user_agent': fingerprint.user_agent,
                    'browser': fingerprint.browser,
                    'os': fingerprint.os,
                    'device': fingerprint.device,
                    'accept_language': fingerprint.accept_language,
                    'timezone': fingerprint.timezone,
                },
                'ip_address': fingerprint.ip_address,
                'location': location_data,
                'created_at': datetime.utcnow().isoformat(),
                'last_activity': datetime.utcnow().isoformat(),
                'metadata': metadata or {},
                'risk_score': 0.0,
                'is_suspicious': False,
            }
            
            # Store session in Redis if available
            if redis_manager.redis_client:
                session_key = f"session:{session_id}"
                await redis_manager.redis_client.setex(
                    session_key,
                    self.session_timeout,
                    json.dumps(session_data, default=str)
                )
                
                # Add to user's session set
                user_sessions_key = f"user_sessions:{user_id}"
                await redis_manager.redis_client.sadd(user_sessions_key, session_id)
                await redis_manager.redis_client.expire(user_sessions_key, self.session_timeout)
            
            # Store session in database for persistence
            if db:
                from ..models.session import UserSession
                
                db_session = UserSession(
                    id=session_id,
                    user_id=user_id,
                    fingerprint_hash=session_data['fingerprint_hash'],
                    ip_address=fingerprint.ip_address,
                    user_agent=fingerprint.user_agent,
                    location=location_data,
                    created_at=datetime.utcnow(),
                    last_activity=datetime.utcnow(),
                    expires_at=datetime.utcnow() + timedelta(seconds=self.session_timeout),
                    is_active=True
                )
                
                db.add(db_session)
                await db.commit()
            
            return {
                'success': True,
                'session_id': session_id,
                'session_token': session_token,
                'expires_in': self.session_timeout,
                'fingerprint': fingerprint.generate_fingerprint(),
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f"Failed to create session: {str(e)}"
            }
    
    async def validate_session(
        self,
        session_id: str,
        fingerprint: SessionFingerprint,
        update_activity: bool = True
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Validate a session and check for hijacking
        
        Args:
            session_id: Session ID
            fingerprint: Current request fingerprint
            update_activity: Whether to update last activity
            
        Returns:
            Tuple of (is_valid, session_data, error_message)
        """
        try:
            # Get session from Redis or database
            session_data = await self.get_session(session_id)
            
            if not session_data:
                return False, None, "Session not found"
            
            # Check if session is expired
            if 'expires_at' in session_data:
                expires_at = datetime.fromisoformat(session_data['expires_at'])
                if expires_at < datetime.utcnow():
                    return False, None, "Session expired"
            
            # Validate fingerprint
            current_fingerprint_hash = fingerprint.generate_fingerprint()
            stored_fingerprint_hash = session_data.get('fingerprint_hash')
            
            if current_fingerprint_hash != stored_fingerprint_hash:
                # Calculate risk score
                risk_score = self.calculate_session_risk(
                    session_data,
                    fingerprint
                )
                
                if risk_score > self.suspicious_risk_threshold:
                    # Mark session as suspicious
                    await self.mark_session_suspicious(
                        session_id,
                        risk_score,
                        "Fingerprint mismatch"
                    )
                    
                    return False, None, "Session security violation detected"
                
                # Update fingerprint if risk is acceptable
                session_data['fingerprint_hash'] = current_fingerprint_hash
                session_data['risk_score'] = risk_score
            
            # Check for geographic anomaly
            if self.detect_geographic_anomaly(
                session_data.get('ip_address'),
                fingerprint.ip_address,
                session_data.get('last_activity')
            ):
                await self.mark_session_suspicious(
                    session_id,
                    0.8,
                    "Geographic anomaly detected"
                )
                return False, None, "Suspicious location change detected"
            
            # Update session activity
            if update_activity:
                await self.update_session_activity(session_id)
            
            return True, session_data, None
            
        except Exception as e:
            return False, None, f"Session validation error: {str(e)}"
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data from Redis or database"""
        # Try Redis first
        if redis_manager.redis_client:
            session_key = f"session:{session_id}"
            session_data = await redis_manager.redis_client.get(session_key)
            
            if session_data:
                return json.loads(session_data)
        
        # Fall back to database
        # Implementation depends on your session model
        return None
    
    async def get_active_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all active sessions for a user"""
        sessions = []
        
        if redis_manager.redis_client:
            user_sessions_key = f"user_sessions:{user_id}"
            session_ids = await redis_manager.redis_client.smembers(user_sessions_key)
            
            for session_id in session_ids:
                session_data = await self.get_session(session_id)
                if session_data:
                    sessions.append(session_data)
        
        return sessions
    
    async def update_session_activity(self, session_id: str) -> bool:
        """Update session last activity timestamp"""
        try:
            if redis_manager.redis_client:
                session_key = f"session:{session_id}"
                session_data = await redis_manager.redis_client.get(session_key)
                
                if session_data:
                    data = json.loads(session_data)
                    data['last_activity'] = datetime.utcnow().isoformat()
                    
                    await redis_manager.redis_client.setex(
                        session_key,
                        self.session_timeout,
                        json.dumps(data, default=str)
                    )
                    
                    return True
            
            return False
            
        except Exception:
            return False
    
    async def revoke_session(self, session_id: str, reason: Optional[str] = None) -> bool:
        """Revoke a session"""
        try:
            # Remove from Redis
            if redis_manager.redis_client:
                session_key = f"session:{session_id}"
                session_data = await redis_manager.redis_client.get(session_key)
                
                if session_data:
                    data = json.loads(session_data)
                    user_id = data.get('user_id')
                    
                    # Remove from Redis
                    await redis_manager.redis_client.delete(session_key)
                    
                    # Remove from user's session set
                    if user_id:
                        user_sessions_key = f"user_sessions:{user_id}"
                        await redis_manager.redis_client.srem(user_sessions_key, session_id)
            
            # Update database
            # Implementation depends on your session model
            
            return True
            
        except Exception:
            return False
    
    async def revoke_all_sessions(self, user_id: str, except_current: Optional[str] = None) -> int:
        """Revoke all sessions for a user"""
        revoked_count = 0
        
        sessions = await self.get_active_sessions(user_id)
        
        for session in sessions:
            session_id = session.get('session_id')
            if session_id and session_id != except_current:
                if await self.revoke_session(session_id, "Bulk revocation"):
                    revoked_count += 1
        
        return revoked_count
    
    def calculate_session_risk(
        self,
        session_data: Dict[str, Any],
        current_fingerprint: SessionFingerprint
    ) -> float:
        """Calculate risk score for session changes"""
        risk_score = 0.0
        
        # Compare fingerprint components
        stored_fp = session_data.get('fingerprint_data', {})
        
        # Browser change
        if stored_fp.get('browser') != current_fingerprint.browser:
            risk_score += 0.3
        
        # OS change
        if stored_fp.get('os') != current_fingerprint.os:
            risk_score += 0.3
        
        # Device change
        if stored_fp.get('device') != current_fingerprint.device:
            risk_score += 0.2
        
        # IP address change
        if session_data.get('ip_address') != current_fingerprint.ip_address:
            risk_score += 0.2
        
        return min(risk_score, 1.0)
    
    async def mark_session_suspicious(
        self,
        session_id: str,
        risk_score: float,
        reason: str
    ) -> None:
        """Mark a session as suspicious"""
        try:
            if redis_manager.redis_client:
                session_key = f"session:{session_id}"
                session_data = await redis_manager.redis_client.get(session_key)
                
                if session_data:
                    data = json.loads(session_data)
                    data['is_suspicious'] = True
                    data['risk_score'] = risk_score
                    data['suspicious_reason'] = reason
                    data['marked_suspicious_at'] = datetime.utcnow().isoformat()
                    
                    await redis_manager.redis_client.setex(
                        session_key,
                        300,  # Reduce timeout for suspicious sessions
                        json.dumps(data, default=str)
                    )
            
            # Log suspicious activity
            # Implementation depends on your logging system
            
        except Exception:
            pass
    
    def get_location_from_ip(self, ip_address: str) -> Optional[Dict[str, Any]]:
        """Get geographic location from IP address"""
        if not self.geoip_reader:
            return None
        
        try:
            response = self.geoip_reader.city(ip_address)
            return {
                'country': response.country.name,
                'city': response.city.name,
                'latitude': response.location.latitude,
                'longitude': response.location.longitude,
                'timezone': response.location.time_zone,
            }
        except Exception:
            return None
    
    def detect_geographic_anomaly(
        self,
        previous_ip: str,
        current_ip: str,
        last_activity: Optional[str]
    ) -> bool:
        """Detect impossible travel scenarios"""
        if not self.geoip_reader or not previous_ip or not current_ip:
            return False
        
        if previous_ip == current_ip:
            return False
        
        try:
            # Get locations
            prev_location = self.get_location_from_ip(previous_ip)
            curr_location = self.get_location_from_ip(current_ip)
            
            if not prev_location or not curr_location:
                return False
            
            # Calculate distance (simplified)
            from math import radians, sin, cos, sqrt, atan2
            
            lat1 = radians(prev_location['latitude'])
            lat2 = radians(curr_location['latitude'])
            lon1 = radians(prev_location['longitude'])
            lon2 = radians(curr_location['longitude'])
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            
            # Earth radius in km
            distance_km = 6371 * c
            
            # Check time difference
            if last_activity:
                last_time = datetime.fromisoformat(last_activity)
                time_diff_hours = (datetime.utcnow() - last_time).total_seconds() / 3600
                
                # Maximum travel speed (km/h)
                max_speed = 1000  # Approximate commercial flight speed
                
                if time_diff_hours > 0:
                    apparent_speed = distance_km / time_diff_hours
                    
                    if apparent_speed > max_speed:
                        return True  # Impossible travel detected
            
            return False
            
        except Exception:
            return False


# Export singleton instance
session_security = SessionSecurityManager()