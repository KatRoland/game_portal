"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { useState, useEffect } from 'react'
import { subscribeToWSStatus, unsubscribeToWSStatus, getWSStatus } from '@/lib/ws'

export default function Header() {
  const { user, loading, logout } = useUser()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const [wsStatus, setWsStatus] = useState<string>(() => getWSStatus())

  useEffect(() => {
    const handler = (s: string) => setWsStatus(s)
    subscribeToWSStatus(handler)
    return () => unsubscribeToWSStatus(handler)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (e) {
      console.error('logout', e)
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Lobby', href: '/lobby' },
  ]

  return (
    <header className="bg-gray-900 shadow">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-white">
                Game Portal
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${pathname === item.href
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-300 hover:border-gray-500 hover:text-white'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {/* WebSocket status indicator */}
            <div className="mr-4 flex items-center">
              <span title={`WS: ${wsStatus}`} className={`h-3 w-3 rounded-full mr-2 ${wsStatus === 'connected' ? 'bg-green-500' : wsStatus === 'connecting' ? 'bg-yellow-400' : 'bg-gray-600'
                }`} />
              <span className="text-xs text-gray-400">{wsStatus}</span>
            </div>
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse" />
            ) : user ? (
              <div className="ml-3 relative border-2 border-white rounded-full">
                <div>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
                  >
                    {(() => {
                      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
                      const customAvatarSrc = (user as any)?.customAvatarUrl
                        ? `${apiBase}/uploads/avatars/${(user as any).customAvatarUrl}`
                        : null
                      const discordSrc = user.avatar
                        ? `https://cdn.discordapp.com/avatars/${(user as any).discordId ?? user.id}/${user.avatar}.png`
                        : null
                      const src = customAvatarSrc || discordSrc
                      if (src) {
                        return (
                          <img
                            className="h-8 w-8 rounded-full"
                            src={src}
                            alt={user.username ?? user.id ?? ''}
                          />
                        )
                      }
                      return (
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-300">
                            {(user.username?.[0]?.toUpperCase() || user.id?.[0]?.toUpperCase() || '?')}
                          </span>
                        </div>
                      )
                    })()}
                  </button>
                </div>
                {isMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
                      <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700" role="menuitem">
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/login" className="ml-8 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
