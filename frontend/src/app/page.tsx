'use client'

import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'

export default function Home() {
  const { user, loading } = useUser()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4 text-white">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Game Portal
        </h1>
        <p className="mb-8 text-lg text-gray-400">
          Your centralized hub for gaming and fun.
        </p>

        {user ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-xl">
              Welcome back, <span className="font-semibold text-blue-400">{user.username}</span>!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/lobby"
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-transform hover:scale-105 hover:bg-blue-700"
              >
                Play Games
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-gray-700 px-6 py-3 font-semibold text-white transition-transform hover:scale-105 hover:bg-gray-600"
              >
                Dashboard
              </Link>
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-transform hover:scale-105 hover:bg-red-700"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/auth/login"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-indigo-600 px-8 py-3 font-bold text-white transition-all duration-300 hover:bg-indigo-700 hover:ring-4 hover:ring-indigo-400/50"
            >
              <span className="mr-2">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 20.818 20.818 0 0 0-.85 1.743 18.418 18.418 0 0 0-5.525 0 20.941 20.941 0 0 0-.853-1.748.077.077 0 0 0-.075-.037 19.791 19.791 0 0 0-4.889 1.512.064.064 0 0 0-.031.026C1.381 9.624.606 14.852.96 20.013c.003.055.032.106.079.139a19.718 19.718 0 0 0 5.968 3.018.077.077 0 0 0 .085-.027c.459-.62.871-1.282 1.226-1.977.019-.038-.002-.083-.041-.1a16.89 16.89 0 0 1-2.4-1.129.074.074 0 0 1-.005-.124c.205-.152.404-.312.598-.475a.076.076 0 0 1 .078-.012c3.96 1.809 8.243 1.809 12.16 0a.077.077 0 0 1 .079.012c.192.163.392.323.596.472a.074.074 0 0 1-.005.124 16.96 16.96 0 0 1-2.4 1.129.043.043 0 0 0-.041.1c.355.696.768 1.356 1.229 1.977a.077.077 0 0 0 .085.027 19.714 19.714 0 0 0 5.964-3.018.074.074 0 0 0 .08-.141c-.553-6.19-3.447-10.748-6.038-14.745a.066.066 0 0 0-.032-.027ZM8.02 15.331c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.085 2.156 2.418 0 1.334-.946 2.419-2.156 2.419Zm7.975 0c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.085 2.156 2.418 0 1.334-.946 2.419-2.156 2.419Z" />
                </svg>
              </span>
              Sign in with Discord
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
