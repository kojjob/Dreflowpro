"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "../contexts/AuthContext"
import { LazyMainDashboard } from "../components/routing/LazyRoutes"
import Logger from "../utils/logger"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  Logger.log('🏠 Dashboard Page - Loading:', loading, 'User:', !!user)

  useEffect(() => {
    // Redirect to login if not authenticated after loading
    if (!loading && !user) {
      Logger.log('User not authenticated, redirecting to login')
      router.push('/login')
    }
  }, [loading, user, router])

  // Show simple loading for minimal delay
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show loading while redirecting
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <LazyMainDashboard />
}