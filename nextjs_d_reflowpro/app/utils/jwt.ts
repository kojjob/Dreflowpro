/**
 * JWT Utility Functions
 * Provides JWT token decoding and validation functionality
 */

export interface JWTPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  email?: string;
  [key: string]: any;
}

/**
 * Decode JWT token without verification
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * @param token JWT token string
 * @returns true if token is expired or invalid
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

/**
 * Get token expiration time in milliseconds
 * @param token JWT token string
 * @returns Expiration timestamp or null if invalid
 */
export function getTokenExpiration(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return null;
  
  return payload.exp * 1000; // Convert to milliseconds
}

/**
 * Check if token will expire within specified minutes
 * @param token JWT token string
 * @param minutes Minutes before expiration to check
 * @returns true if token expires within the specified time
 */
export function isTokenExpiringWithin(token: string, minutes: number = 5): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  
  const now = Date.now();
  const warningTime = minutes * 60 * 1000; // Convert minutes to milliseconds
  
  return (expiration - now) <= warningTime;
}

/**
 * Get time remaining until token expires
 * @param token JWT token string
 * @returns Time remaining in milliseconds, or 0 if expired/invalid
 */
export function getTokenTimeRemaining(token: string): number {
  const expiration = getTokenExpiration(token);
  if (!expiration) return 0;
  
  const remaining = expiration - Date.now();
  return Math.max(0, remaining);
}

/**
 * Format time remaining in a human-readable format
 * @param milliseconds Time remaining in milliseconds
 * @returns Formatted time string
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return 'Expired';
  
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return 'Less than a minute';
}

/**
 * Check if token is valid (not expired and properly formatted)
 * @param token JWT token string
 * @returns true if token is valid
 */
export function isTokenValid(token: string): boolean {
  if (!token) return false;
  return !isTokenExpired(token);
}