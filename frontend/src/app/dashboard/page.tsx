'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { uploadAvatar, getProfile } from '@/lib/api'

export default function DashboardPage() {
  const { user, loading, setUser } = useUser()
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) return null

  const handleSelectFile = () => {
    setError(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) {
      setError('Please upload a valid image file (png, jpg, gif, webp).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Max 5MB.')
      return
    }
    try {
      setIsUploading(true)
      const resp = await uploadAvatar(file)
      const uploadedName = (resp as any)?.user?.customavatarurl || (resp as any)?.customavatarurl
      if (uploadedName && user) {
        setUser({ ...(user as any), customAvatarUrl: uploadedName })
      }
      const preview = URL.createObjectURL(file)
      setLocalPreviewUrl(preview)
      try {
        const refreshed = await getProfile()
        const refreshedUser = (refreshed && (refreshed.user ?? refreshed))
        setUser(refreshedUser)
      } catch { console.error('failed to refresh') }
      setError(null)
    } catch (err: any) {
      setError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const renderAvatar = () => {
    const hasDiscordAvatar = !!user.avatar
    const discordUrl = hasDiscordAvatar
      ? `https://cdn.discordapp.com/avatars/${(user as any).discordId ?? user.id}/${user.avatar}.png`
      : null

    const customAvatarUrl = (user as any).customAvatarUrl
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/uploads/avatars/${(user as any).customAvatarUrl}`
      : null

    const src = localPreviewUrl || customAvatarUrl || discordUrl || null

    if (src) {
      return (
        <img
          src={src}
          alt={user.username ?? user.id ?? ''}
          className="h-24 w-24 rounded-full object-cover border"
        />
      )
    }

    return (
      <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border">
        <span className="text-2xl font-semibold text-gray-500">
          {(user.username?.[0]?.toUpperCase() || user.id?.[0]?.toUpperCase() || '?')}
        </span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white shadow sm:rounded-xl p-6">
        <div className="flex items-center gap-6">
          {renderAvatar()}
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">{user.username ?? user.id}</h1>
            <p className="text-sm text-gray-500">Manage your profile picture</p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSelectFile}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploading ? 'Uploading…' : 'Upload new avatar'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </div>

        <div className="mt-8 border-t pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Username</h3>
            <p className="mt-1 text-gray-900">{user.username ?? user.id}</p>
          </div>
          {user.email && (
            <div>
              <h3 className="text-sm font-medium text-gray-700">Email</h3>
              <p className="mt-1 text-gray-900">{user.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
