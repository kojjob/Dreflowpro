"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

import { Button } from "@/app/components/ui/Button"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = () => {
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        setStatus('error')
        setMessage(errorDescription || 'Authentication failed')
        toast.error('Authentication failed')
        return
      }

      if (accessToken && refreshToken) {
        // Store tokens
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        
        setStatus('success')
        setMessage('Authentication successful!')
        toast.success('Welcome! Redirecting to dashboard...')
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setStatus('error')
        setMessage('Invalid authentication response')
        toast.error('Authentication failed')
      }
    }

    handleCallback()
  }, [searchParams, router])

  const handleRetry = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          {/* Status Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            {status === 'loading' && (
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
          </motion.div>

          {/* Status Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              {status === 'loading' && 'Processing authentication...'}
              {status === 'success' && 'Authentication successful!'}
              {status === 'error' && 'Authentication failed'}
            </h2>
            <p className="text-gray-600 text-sm">
              {status === 'loading' && 'Please wait while we complete your sign-in process.'}
              {status === 'success' && 'You will be redirected to your dashboard shortly.'}
              {status === 'error' && message}
            </p>
          </motion.div>

          {/* Action Buttons */}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-3"
            >
              <Button onClick={handleRetry} className="w-full">
                Try again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/signup')}
                className="w-full"
              >
                Create new account
              </Button>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                Go to dashboard
              </Button>
            </motion.div>
          )}

          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xs text-gray-500"
            >
              This may take a few seconds...
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}