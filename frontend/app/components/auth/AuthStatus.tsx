/**
 * Auth Status Component
 * Shows current authentication status and token information for testing
 */

"use client"

import { useState, useEffect } from 'react'
import { authService, AuthState } from '@/app/services/auth'
import { formatTimeRemaining, getTokenTimeRemaining } from '@/app/utils/jwt'

export function AuthStatus() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    tokens: null,
    isLoading: false,
    error: null,
  })
  const [tokenInfo, setTokenInfo] = useState<{
    timeRemaining: string
    isExpiring: boolean
  }>({ timeRemaining: 'N/A', isExpiring: false })

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((newState) => {
      setAuthState(newState)
      
      // Update token info
      if (newState.tokens?.access_token) {
        const remaining = getTokenTimeRemaining(newState.tokens.access_token)
        setTokenInfo({
          timeRemaining: formatTimeRemaining(remaining),
          isExpiring: remaining < 5 * 60 * 1000 // Less than 5 minutes
        })
      } else {
        setTokenInfo({ timeRemaining: 'N/A', isExpiring: false })
      }
    })

    return unsubscribe
  }, [])

  // Update token time remaining every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (authState.tokens?.access_token) {
        const remaining = getTokenTimeRemaining(authState.tokens.access_token)
        setTokenInfo({
          timeRemaining: formatTimeRemaining(remaining),
          isExpiring: remaining < 5 * 60 * 1000
        })
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [authState.tokens?.access_token])

  const handleTestRefresh = async () => {
    try {
      await authService.refreshAccessToken()
    } catch (error) {
      console.error('Manual refresh failed:', error)
    }
  }

  const handleLogout = async () => {
    await authService.logout()
  }

  if (!authState.isAuthenticated) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Authentication Status</h3>
        <div className="text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Not authenticated</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Authentication Status</h3>
      
      <div className="space-y-2 text-sm">
        {/* Status */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Authenticated</span>
        </div>

        {/* User Info */}
        {authState.user && (
          <div className="text-gray-600">
            <strong>User:</strong> {authState.user.email}
          </div>
        )}

        {/* Token Info */}
        <div className="text-gray-600">
          <strong>Token expires in:</strong>{' '}
          <span className={tokenInfo.isExpiring ? 'text-orange-600 font-medium' : ''}>
            {tokenInfo.timeRemaining}
          </span>
        </div>

        {/* Loading State */}
        {authState.isLoading && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
            <span className="text-gray-600">Loading...</span>
          </div>
        )}

        {/* Error State */}
        {authState.error && (
          <div className="text-red-600">
            <strong>Error:</strong> {authState.error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <button
            onClick={handleTestRefresh}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            disabled={authState.isLoading}
          >
            Test Refresh
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            disabled={authState.isLoading}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}