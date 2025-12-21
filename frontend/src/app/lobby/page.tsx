"use client"

import React, { useEffect, useRef, useState } from 'react'
import { createWS, getWSClient } from '@/lib/ws'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import { Lobby } from '@/types'

export default function LobbyPage() {
	const { user, loading } = useUser()
	const router = useRouter()
	const [lobbies, setLobbies] = useState<Lobby[]>([])
	const [name, setName] = useState('')
	const wsRef = useRef(getWSClient())
	const [connecting, setConnecting] = useState(true)

	useEffect(() => {
		const init = async () => {
			if (loading) return
			if (!user) {
				router.push('/auth/login')
				return
			}

			const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
			if (!token) {
				router.push('/auth/login')
				return
			}

			wsRef.current = createWS(token, 'lobby')

			wsRef.current.onStatus((s) => {
				if (s === 'connected') {
					try { wsRef.current?.send({ type: 'lobby:list' }) } catch (e) { console.error(e) }
				}
			})

			wsRef.current.on('lobby:created', (payload: Lobby) => {
				setLobbies(prev => {
					if (prev.find(l => l.id === payload.id)) return prev
					return [...prev, payload]
				})
			})

			wsRef.current.on('lobby:create:success', (payload: Lobby) => {
				setLobbies(prev => {
					if (prev.find(l => l.id === payload.id)) return prev
					return [...prev, payload]
				})
				try {
					wsRef.current?.send({ type: 'lobby:join', payload: { lobbyId: payload.id } })
				} catch (e) { console.error(e) }
			})

			wsRef.current.on('lobby:list:response', (payload: { lobbies: Lobby[] }) => {
				if (payload && Array.isArray(payload.lobbies)) {
					setLobbies(payload.lobbies)
				}
			})

			wsRef.current.on('lobby:list:already_joined', (payload: { lobbyId: string }) => {
				try { router.push(`/lobby/${payload.lobbyId}`) } catch (e) { console.error(e) }
			})

			wsRef.current.on('lobby:join:success', (payload: Lobby) => {
				try { router.push(`/lobby/${payload.id}`) } catch (e) { console.error(e) }
			})

			wsRef.current.on('lobby:join:success:started', (payload: { lobbyId: string }) => {
				console.log('Lobby already started, redirecting to game', payload);
				router.push(`/game/${payload.lobbyId}`);
			})



			wsRef.current.on('lobby:update_lobbies', (payload: { lobbies: Lobby[] }) => {
				console.log('Received lobby list update', payload)
				if (payload) {
					setLobbies(payload.lobbies)
				}
			})

			wsRef.current.on('lobby:dissolved', (payload: { lobbyId: string }) => {
				setLobbies(prev => prev.filter(l => l.id !== payload.lobbyId))
			})

			setConnecting(false)
		}

		init()

		return () => {
			wsRef.current?.disconnect()
		}
	}, [loading, user])

	const createLobby = () => {
		if (!wsRef.current) return
		const lobbyName = name.trim() || `Lobby ${Math.floor(Math.random() * 1000)}`
		wsRef.current.send({ type: 'lobby:create', payload: { name: lobbyName } })
		setName('')
	}

	const joinLobby = (id: string) => {
		if (!wsRef.current) return
		wsRef.current.send({ type: 'lobby:join', payload: { lobbyId: id } })
	}

	if (connecting || !user) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
				<div className="text-center">
					<div className="relative mx-auto mb-6">
						<div className="w-16 h-16 border-4 border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
						<div className="absolute inset-0 w-16 h-16 border-4 border-purple-500/20 rounded-full animate-ping"></div>
					</div>
					<h3 className="text-xl font-semibold text-white mb-2">Connecting to Game Portal</h3>
					<p className="text-gray-400">Preparing your gaming experience...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				{/* Hero Section */}
				<div className="text-center mb-12">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6">
						<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
					</div>
					<h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
						Game Lobbies
					</h1>
					<p className="text-lg text-gray-400 max-w-2xl mx-auto">
						Join existing lobbies or create your own gaming experience. Connect with players and start your adventure.
					</p>
					<div className="mt-6 text-sm text-gray-500">
						Welcome back, <span className="font-medium text-gray-300">{user.username}</span>
					</div>
				</div>

				{/* Create Lobby Section - Admin Only */}
				{user?.isAdmin && (
					<div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 mb-12">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h2 className="text-2xl font-semibold text-white mb-2">Create New Lobby</h2>
								<p className="text-gray-400">Set up a new gaming session for others to join</p>
							</div>
							<div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
							</div>
						</div>
						<div className="flex flex-col sm:flex-row gap-4">
							<input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter lobby name (e.g., 'Epic Battle Arena')"
								className="flex-1 px-6 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							/>
							<button
								onClick={createLobby}
								className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
							>
								Create Lobby
							</button>
						</div>
					</div>
				)}

				{/* Lobbies List */}
				<div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
					<div className="px-8 py-6 border-b border-gray-700/50">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-2xl font-semibold text-white">Available Lobbies</h2>
								<p className="text-gray-400 mt-1">
									{lobbies.length} {lobbies.length === 1 ? 'lobby' : 'lobbies'} waiting for players
								</p>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
								<span className="text-sm text-gray-400">Live</span>
							</div>
						</div>
					</div>

					<div className="p-8">
						{lobbies.length === 0 ? (
							<div className="text-center py-16">
								<div className="relative mx-auto mb-8">
									<div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-3xl flex items-center justify-center mx-auto">
										<svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
										</svg>
									</div>
									<div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
										<span className="text-xs font-bold text-gray-900">!</span>
									</div>
								</div>
								<h3 className="text-xl font-semibold text-white mb-2">No lobbies available</h3>
								<p className="text-gray-400 mb-6">Looks like all the action is happening elsewhere. Why not start your own lobby?</p>
								{user?.isAdmin && (
									<button
										onClick={() => document.querySelector('input')?.focus()}
										className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
									>
										Create Your Lobby
									</button>
								)}
							</div>
						) : (
							<div className="grid gap-6">
								{lobbies.map(l => (
									<div key={l.id} className="group bg-gray-700/30 border border-gray-600/30 rounded-xl p-6 hover:bg-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-5">
												<div className="relative">
													<div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
														<span className="text-white font-bold text-lg">{l.name.charAt(0).toUpperCase()}</span>
													</div>
													<div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-800">
														<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
															<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
														</svg>
													</div>
												</div>
												<div>
													<h3 className="text-xl font-semibold text-white mb-1">{l.name}</h3>
													<div className="flex items-center space-x-4 text-sm text-gray-400">
														<span className="flex items-center">
															<svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
															</svg>
															{l.players ? `${l.players.length} player${l.players.length !== 1 ? 's' : ''}` : '0 players'}
														</span>
														<span className="flex items-center">
															<div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
															Waiting for players
														</span>
													</div>
												</div>
											</div>
											<button
												onClick={() => joinLobby(l.id)}
												className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
											>
												Join Lobby
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

