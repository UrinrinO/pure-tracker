import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pure White Tracker',
  description: 'Project tracker for the Pure White Phase 1 build — progress, milestones, and stakeholder communication.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
