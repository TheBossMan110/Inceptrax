'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        style: {
          background: "#111827",
          border: "1px solid #1E2A3A",
          color: "#F1F5F9",
          borderRadius: "10px",
          fontSize: "13px",
        },
        classNames: {
          toast: "group-[.toaster]:shadow-xl",
          title: "font-medium text-[#F1F5F9]",
          description: "text-[#94A3B8] text-xs",
          actionButton: "bg-indigo-600 text-white text-xs rounded-md px-3 py-1.5 hover:bg-indigo-500 transition-colors",
          cancelButton: "bg-[#1E2A3A] text-[#94A3B8] text-xs rounded-md px-3 py-1.5",
          success: "border-l-2 border-l-emerald-500",
          error: "border-l-2 border-l-red-500",
          warning: "border-l-2 border-l-amber-500",
          info: "border-l-2 border-l-indigo-500",
        },
      }}
      richColors
      {...props}
    />
  )
}

export { Toaster }
