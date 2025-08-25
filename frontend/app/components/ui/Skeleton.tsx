import * as React from "react"
import { cn } from "@/app/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "card" | "text" | "avatar" | "button"
  animation?: "pulse" | "wave" | "none"
}

const skeletonVariants = {
  default: "bg-gray-200 rounded",
  card: "bg-gray-200 rounded-xl",
  text: "bg-gray-200 rounded h-4",
  avatar: "bg-gray-200 rounded-full",
  button: "bg-gray-200 rounded-lg h-10"
}

const animationClasses = {
  pulse: "animate-pulse",
  wave: "animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
  none: ""
}

function Skeleton({
  className,
  variant = "default",
  animation = "pulse",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        skeletonVariants[variant],
        animationClasses[animation],
        className
      )}
      {...props}
    />
  )
}

// Skeleton components for common use cases
export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20", className)} {...props}>
      <div className="space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="flex space-x-2 pt-4">
          <Skeleton variant="button" className="w-20" />
          <Skeleton variant="button" className="w-16" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonStats({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-4 gap-6", className)} {...props}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-white/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton variant="avatar" className="w-10 h-10" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, className, ...props }: { rows?: number } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20", className)} {...props}>
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton variant="button" className="w-24" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border border-gray-100 rounded-lg">
                <Skeleton variant="avatar" className="w-8 h-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton variant="button" className="w-16 h-8" />
                  <Skeleton variant="button" className="w-16 h-8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonChart({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20", className)} {...props}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="h-64 flex items-end space-x-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
        <div className="flex justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonModal({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", className)} {...props}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-white/20 w-full max-w-lg">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton variant="avatar" className="w-6 h-6" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Skeleton variant="button" className="w-20" />
            <Skeleton variant="button" className="w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}

export { Skeleton }
