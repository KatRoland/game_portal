"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types'
import { getProfile, refreshToken, handleDiscordCallback, setAccessToken as apiSetAccessToken, logout as apiLogout } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface UserContextValue {
  user: User | null
  loading: boolean
  setUser: (u: User | null) => void
  logout: () => Promise<void>
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadProfile = async () => {
    try {
      const data = await getProfile()
      const profile = (data && (data.user ?? data)) as User
      setUser(profile)
    } catch (e) {
      setUser(null)
    }
  }

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && window.location.hash) {
        try {
          const token = await handleDiscordCallback(window.location.hash)
          if (token) {
            await loadProfile()
            setLoading(false)
            return
          }
        } catch (e) { console.error(e) }
      }

      try {
        const ok = await refreshToken()
        if (ok) {
          await loadProfile()
        } else {
          setUser(null)
        }
      } catch (e) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const handleLogout = async () => {
    try {
      await apiLogout()
    } catch (e) {
      console.error('logout error', e)
    }
    apiSetAccessToken(null)
    setUser(null)
    try {
      router.push('/auth/login')
    } catch (e) { console.error(e) }
  }

  return (
    <UserContext.Provider value={{ user, loading, setUser, logout: handleLogout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
