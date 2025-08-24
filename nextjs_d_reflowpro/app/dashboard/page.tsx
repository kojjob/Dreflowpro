"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "../contexts/AuthContext"
import MainDashboard from "../components/dashboard/MainDashboard"

export default function DashboardPage() {
  const { user, loading } = useAuth()

  console.log('🏠 Dashboard Page - Loading:', loading, 'User:', !!user)

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

  return <MainDashboard />
}