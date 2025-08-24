"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { authService, AuthState } from "../services/auth"
import MainDashboard from "../components/dashboard/MainDashboard"

export default function DashboardPage() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    tokens: null,
    isLoading: true,
    error: null,
  })
  const router = useRouter()

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((newAuthState) => {
      setAuthState(newAuthState)
      
      // Redirect to login if not authenticated
      if (!newAuthState.isLoading && !newAuthState.isAuthenticated) {
        router.push('/login')
      }
    })

    return unsubscribe
  }, [router])

  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    )
  }

  if (!authState.isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <MainDashboard />
}