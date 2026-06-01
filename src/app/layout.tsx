import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pure White Tracker — Phase 1',
  description: 'Project tracker for the Pure White Sanctuary Phase 1 build — progress, milestones, and stakeholder communication.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
