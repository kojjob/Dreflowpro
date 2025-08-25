import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/app/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3 text-sm backdrop-blur-sm transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-white/80 border-gray-200 text-gray-900 shadow-sm",
        destructive:
          "bg-red-50/80 border-red-200 text-red-800 shadow-sm",
        success:
          "bg-green-50/80 border-green-200 text-green-800 shadow-sm",
        warning:
          "bg-yellow-50/80 border-yellow-200 text-yellow-800 shadow-sm",
        info:
          "bg-blue-50/80 border-blue-200 text-blue-800 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

export { Alert, AlertTitle, AlertDescription }