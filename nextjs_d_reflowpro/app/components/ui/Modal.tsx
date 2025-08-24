"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/app/lib/utils"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  size?: "sm" | "md" | "lg" | "xl" | "full"
  className?: string
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg", 
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-7xl"
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = "md",
  className,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose, closeOnEscape])

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!mounted) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm bg-black/20"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "relative w-full bg-white rounded-2xl shadow-2xl border border-white/20 max-h-[90vh] overflow-hidden",
              sizeClasses[size],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
                <div>
                  {title && (
                    <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 group"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// Modal Context for managing multiple modals
interface ModalContextValue {
  openModal: (id: string, content: React.ReactNode, options?: Partial<ModalProps>) => void
  closeModal: (id: string) => void
  closeAllModals: () => void
}

const ModalContext = React.createContext<ModalContextValue | undefined>(undefined)

interface ModalData extends Omit<ModalProps, 'isOpen' | 'onClose' | 'children'> {
  id: string
  content: React.ReactNode
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = React.useState<ModalData[]>([])

  const openModal = React.useCallback((id: string, content: React.ReactNode, options: Partial<ModalProps> = {}) => {
    setModals(prev => [...prev.filter(m => m.id !== id), { id, content, ...options }])
  }, [])

  const closeModal = React.useCallback((id: string) => {
    setModals(prev => prev.filter(m => m.id !== id))
  }, [])

  const closeAllModals = React.useCallback(() => {
    setModals([])
  }, [])

  const value = React.useMemo(() => ({
    openModal,
    closeModal,
    closeAllModals
  }), [openModal, closeModal, closeAllModals])

  return (
    <ModalContext.Provider value={value}>
      {children}
      {modals.map(({ id, content, ...props }) => (
        <Modal
          key={id}
          isOpen={true}
          onClose={() => closeModal(id)}
          {...props}
        >
          {content}
        </Modal>
      ))}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = React.useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
