// src/app/layout.tsx
import './globals.css'
import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh flex flex-col items-center">
        <AppHeader />
        <div className="w-full max-w-3xl p-6">{children}</div>
      </body>
    </html>
  )
}
