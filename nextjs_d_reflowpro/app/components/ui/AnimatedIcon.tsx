"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/app/lib/utils"

interface AnimatedIconProps {
  icon: LucideIcon
  animation?: "bounce" | "spin" | "pulse" | "scale" | "rotate" | "shake" | "none"
  trigger?: "hover" | "click" | "always" | "none"
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  color?: string
  duration?: number
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8"
}

const animations = {
  bounce: {
    y: [0, -10, 0],
    transition: { duration: 0.6, ease: "easeInOut" }
  },
  spin: {
    rotate: 360,
    transition: { duration: 1, ease: "linear", repeat: Infinity }
  },
  pulse: {
    scale: [1, 1.2, 1],
    transition: { duration: 0.8, ease: "easeInOut", repeat: Infinity }
  },
  scale: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.3, ease: "easeInOut" }
  },
  rotate: {
    rotate: [0, 15, -15, 0],
    transition: { duration: 0.5, ease: "easeInOut" }
  },
  shake: {
    x: [0, -5, 5, -5, 5, 0],
    transition: { duration: 0.5, ease: "easeInOut" }
  },
  none: {}
}

export function AnimatedIcon({
  icon: Icon,
  animation = "none",
  trigger = "none",
  size = "md",
  className,
  color,
  duration = 0.3,
  ...props
}: AnimatedIconProps) {
  const [isTriggered, setIsTriggered] = React.useState(false)

  const getAnimation = () => {
    if (animation === "none") return {}
    if (trigger === "always") return animations[animation]
    if (trigger !== "none" && isTriggered) return animations[animation]
    return {}
  }

  const handleTrigger = () => {
    if (trigger === "click" || trigger === "hover") {
      setIsTriggered(true)
      setTimeout(() => setIsTriggered(false), duration * 1000)
    }
  }

  const eventHandlers = trigger === "hover" 
    ? { onMouseEnter: handleTrigger }
    : trigger === "click"
    ? { onClick: handleTrigger }
    : {}

  return (
    <motion.div
      className={cn("inline-flex items-center justify-center", className)}
      animate={getAnimation()}
      {...eventHandlers}
      {...props}
    >
      <Icon 
        className={cn(sizeClasses[size], color)} 
      />
    </motion.div>
  )
}

// Predefined animated icons for common use cases
export function LoadingIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <motion.div
      className={cn("inline-flex items-center justify-center", className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, ease: "linear", repeat: Infinity }}
    >
      <div className={cn(
        "border-2 border-current border-t-transparent rounded-full",
        sizeClasses[size]
      )} />
    </motion.div>
  )
}

export function SuccessIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <motion.div
      className={cn("inline-flex items-center justify-center text-green-500", className)}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.svg
        className={sizeClasses[size]}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <motion.path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </motion.svg>
    </motion.div>
  )
}

export function ErrorIcon({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <motion.div
      className={cn("inline-flex items-center justify-center text-red-500", className)}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.svg
        className={sizeClasses[size]}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <motion.path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </motion.svg>
    </motion.div>
  )
}

export function PulsingDot({ 
  className, 
  color = "bg-blue-500",
  size = "md" 
}: { 
  className?: string
  color?: string
  size?: "sm" | "md" | "lg" | "xl" 
}) {
  const dotSizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
    xl: "w-6 h-6"
  }

  return (
    <div className={cn("relative inline-flex", className)}>
      <motion.div
        className={cn("rounded-full", color, dotSizes[size])}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1]
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity
        }}
      />
      <motion.div
        className={cn("absolute rounded-full", color, dotSizes[size])}
        animate={{
          scale: [1, 2, 1],
          opacity: [0.7, 0, 0.7]
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity
        }}
      />
    </div>
  )
}

export function FloatingIcon({ 
  icon: Icon, 
  className,
  size = "md"
}: { 
  icon: LucideIcon
  className?: string
  size?: "sm" | "md" | "lg" | "xl" 
}) {
  return (
    <motion.div
      className={cn("inline-flex items-center justify-center", className)}
      animate={{
        y: [0, -5, 0],
      }}
      transition={{
        duration: 3,
        ease: "easeInOut",
        repeat: Infinity
      }}
    >
      <Icon className={sizeClasses[size]} />
    </motion.div>
  )
}

// Progress indicator with animation
export function ProgressRing({ 
  progress, 
  size = 40, 
  strokeWidth = 4,
  className 
}: { 
  progress: number
  size?: number
  strokeWidth?: number
  className?: string 
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          className="text-blue-500"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}
