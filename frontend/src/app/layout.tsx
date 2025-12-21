import '@/styles/globals.css'
import React from 'react'
import Header from '@/components/Header'
import { UserProvider } from '@/contexts/UserContext'
import { MicProvider } from '@/contexts/MicContext'

export const metadata = {
  title: 'Game Portal',
  description: 'A gaming platform'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full">
        <div className="min-h-screen flex flex-col">
          <UserProvider>
            <MicProvider>
              <Header />
              <main className="flex-1 flex flex-col">
                {children}
              </main>
            </MicProvider>
          </UserProvider>

        </div>
      </body>
    </html>
  )
}
