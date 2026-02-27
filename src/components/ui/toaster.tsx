"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  CheckCircle2,
  AlertCircle,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Determine icon based on variant
        const Icon = variant === "success" 
          ? CheckCircle2 
          : variant === "destructive" 
          ? AlertCircle 
          : null

        return (
          <Toast key={id} variant={variant} {...props}>
            {Icon && (
              <div className={`flex-shrink-0 ${
                variant === "success" 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : variant === "destructive"
                  ? "text-rose-600 dark:text-rose-400"
                  : ""
              }`}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 grid gap-1 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
