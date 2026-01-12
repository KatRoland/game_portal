"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createWS, getWSClient, WSClient } from '@/lib/ws'
import { useUser } from '@/contexts/UserContext'
import { User, Lobby, Game, NextGameMode, GameMode } from '@/types'
import { getUserAvatar, getAccessToken } from '@/lib/api'


export default function LobbyRoomPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user, loading } = useUser()
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [lobby, setLobby] = useState<Lobby | null>(null)
  const [gameModeOrder, setGameModeOrder] = useState<Array<NextGameMode>>([])
  const [connecting, setConnecting] = useState(true)
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null)
  const [playlists, setPlaylists] = useState<Array<{ id: string, name: string }>>([])
  const wsRef = useRef<WSClient | null>(getWSClient())

  useEffect(() => {
    const init = async () => {
      if (loading) return
      if (!user) {
        router.push('/auth/login')
        return
      }

      const token = typeof window !== 'undefined' ? getAccessToken() : null
      if (!token) {
        router.push('/auth/login')
        return
      }

      wsRef.current = createWS(token, 'lobby')

      wsRef.current.on('lobby:welcome', (payload: { lobbyId: string }) => {
        console.log('Lobby welcome', payload);
        try { wsRef.current?.send({ type: 'lobby:join', payload: { lobbyId: id } }) } catch (e) { console.error(e) }
      })

      wsRef.current.on('lobby:join:success:started', (payload: { lobbyId: string }) => {
        console.log('Lobby already started, redirecting to game', payload);
        router.push(`/game/${id}`);
      })

      wsRef.current.on('lobby:join:success', (payload: Lobby) => {
        setLobby(payload)
        setGameModeOrder(payload.gameModeOrder || [])
        setConnecting(false)
      })

      wsRef.current.on('lobby:join:error', (payload: any) => {
        try { router.push('/lobby') } catch (e) { console.error(e) }
      })

      wsRef.current.on('lobby:player_joined', (payload: { lobbyId: string; player: User }) => {
        if (payload.lobbyId !== id) return
        setLobby((prev) => {
          if (!prev) return prev
          const exists = prev.players?.some(p => p.id === payload.player.id)
          return { ...prev, players: exists ? prev.players : [...(prev.players || []), payload.player] }
        })
      })

      wsRef.current.on('lobby:player_left', (payload: { lobbyId: string; playerId: string }) => {
        if (payload.lobbyId !== id) return
        setLobby((prev) => {
          if (!prev) return prev
          return { ...prev, players: (prev.players || []).filter(p => p.id !== payload.playerId) }
        })
      })

      wsRef.current.on('lobby:update', (payload: Lobby) => {
        if (payload.id !== id) return
        setLobby(payload)
      })


      wsRef.current.on('lobby:dissolved', (payload: { lobbyId: string }) => {
        if (payload.lobbyId !== id) return
        try { router.push('/lobby') } catch (e) { console.error(e) }
      })

      wsRef.current.on('lobby:started', (payload: { lobbyId: string; startedAt: string }) => {
        if (payload.lobbyId !== id) return
        console.log('Lobby started', payload)
        try { router.push(`/game/${payload.lobbyId}`) } catch (e) { console.error(e) }
      })


      wsRef.current.on('game:started', (payload: { game: Game }) => {
        if (payload.game.id !== id) return
        console.log('Lobby started', payload)
        try { router.push(`/game/${payload.game.id}`) } catch (e) { console.error(e) }
      })

      setConnecting(false)
    }

    init()

    return () => {
      wsRef.current?.disconnect()
    }
  }, [loading, user, id])

  const leaveLobby = () => {
    try {
      wsRef.current?.send({ type: 'lobby:leave', payload: { lobbyId: id } })

      router.push('/lobby')
    } catch (e) { console.error(e) }
    wsRef.current?.disconnect()
  }

  const getGameModeList = () => {
    return [
      { id: 'gm1', type: GameMode.QA, title: "QA", createdAt: new Date().toISOString(), hasPlaylist: false },
      { id: 'gm2', type: GameMode.BTN, title: "Btn clicker", createdAt: new Date().toISOString(), hasPlaylist: false },
      { id: 'gm3', type: GameMode.MUSIC_QUIZ, title: "Music quiz", createdAt: new Date().toISOString(), hasPlaylist: true },
      { id: 'gm4', type: GameMode.Karaoke_Solo, title: "Karaoke (solo)", createdAt: new Date().toISOString(), hasPlaylist: true },
      { id: 'gm5', type: GameMode.Karaoke_Duett, title: "Karaoke (duett)", createdAt: new Date().toISOString(), hasPlaylist: true },
      { id: 'gm6', type: GameMode.SMASH_OR_PASS, title: "Smash or Pass", createdAt: new Date().toISOString(), hasPlaylist: false },
      { id: 'gm7', type: GameMode.SMASH_OR_PASS_PLAYLIST, title: "Smash or Pass (Playlist)", createdAt: new Date().toISOString(), hasPlaylist: true },
    ]
  }

  const addGameMode = (gmType: string) => {
    const newGameMode: NextGameMode = {
      id: `gm_${Date.now()}`,
      type: gmType as GameMode,
      createdAt: new Date().toISOString(),
    }
    setLobby((prev) => {
      if (!prev) return prev
      const updatedOrder = prev.gameModeOrder ? [...prev.gameModeOrder, newGameMode] : [newGameMode]
      const updatedLobby = { ...prev, gameModeOrder: updatedOrder }
      try {
        wsRef.current?.send({ type: 'lobby:update_gameOrder', payload: { lobbyId: lobby?.id, gameModeOrder: updatedLobby.gameModeOrder } })
      } catch (e) { console.error(e) }
      return updatedLobby
    })
    setModalIsOpen(false)
  }

  const removeGameMode = (id: string) => {
    if (!id) return
    if (!lobby?.gameModeOrder || !lobby?.gameModeOrder.find(g => g.id == id)) {
      return
    }

    setLobby((prev) => {
      if (!prev) return prev
      const updatedOrder = prev.gameModeOrder ? [...prev.gameModeOrder.filter(g => g.id != id)] : []
      const updatedLobby = { ...prev, gameModeOrder: updatedOrder }
      try {
        wsRef.current?.send({ type: 'lobby:update_gameOrder', payload: { lobbyId: lobby?.id, gameModeOrder: updatedLobby.gameModeOrder } })
      } catch (e) { console.error(e) }
      return updatedLobby
    })

  }

  const selectGameMode = (gmType: string) => {
    const selected = getGameModeList().find(gm => gm.type === gmType)
    console.log(`${selected?.type} | ${selectedGameMode} ${selected?.type == selectedGameMode}`)
    if (!selected || selected.type == selectedGameMode) return
    setSelectedGameMode(selected.type)

    if (selected.type == GameMode.Karaoke_Solo || selected.type == GameMode.Karaoke_Duett) {
      fetch('https://gameapi.katroland.hu/karaoke/playlists')
        .then(res => res.json())
        .then(data => {
          setPlaylists(data.playlists)
        })
    } else if (selected.type == GameMode.MUSIC_QUIZ) {
      fetch('https://gameapi.katroland.hu/musicquiz/playlists')
        .then(res => res.json())
        .then(data => {
          setPlaylists(data.playlists)
        })
    } else if (selected.type == GameMode.SMASH_OR_PASS_PLAYLIST) {
      fetch('https://gameapi.katroland.hu/sop/playlists', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      })
        .then(res => res.json())
        .then(data => setPlaylists(data.playlists || []))
    }
  }

  const playlistSelected = (pl: { id: string, name: string }) => {
    if (!selectedGameMode) return
    const newGameMode: NextGameMode = {
      id: `gm_${Date.now()}`,
      type: selectedGameMode,
      createdAt: new Date().toISOString(),
      playlist: pl.id,
    }
    setLobby((prev) => {
      if (!prev) return prev
      const updatedOrder = prev.gameModeOrder ? [...prev.gameModeOrder, newGameMode] : [newGameMode]
      const updatedLobby = { ...prev, gameModeOrder: updatedOrder }
      try {
        wsRef.current?.send({ type: 'lobby:update_gameOrder', payload: { lobbyId: lobby?.id, gameModeOrder: updatedLobby.gameModeOrder } })
      } catch (e) { console.error(e) }
      return updatedLobby
    })
    setModalIsOpen(false)
    setSelectedGameMode(null)
    setPlaylists([])
  }

  const renderModal = () => {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800/90 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 max-w-4xl w-full mx-4 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Game Mode Configuration
            </h2>
            <button
              onClick={() => setModalIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Game Modes */}
            <div className='bg-gray-700/50 rounded-xl p-6 border border-gray-600/30'>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
                </svg>
                Available Game Modes
              </h3>
              <div className="space-y-3">
                {getGameModeList().map(gm => (
                  <div key={gm.id} className="flex items-center justify-between p-4 bg-gray-600/40 rounded-lg border border-gray-500/30 hover:border-gray-400 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-white font-medium">{gm.type}</span>
                    </div>
                    {!gm.hasPlaylist ? (
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
                        onClick={addGameMode.bind(null, gm.type)}
                      >
                        Add
                      </button>
                    ) : (
                      <button
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
                        onClick={selectGameMode.bind(null, gm.type)}
                      >
                        Select
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Playlists */}
            <div className='bg-gray-700/50 rounded-xl p-6 border border-gray-600/30'>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                Playlists
              </h3>
              <div className='space-y-3 max-h-80 overflow-y-auto'>
                {playlists.length > 0 ? (
                  playlists.map((pl) => (
                    <div
                      key={pl.id}
                      className="p-4 bg-gray-600/40 rounded-lg border border-gray-500/30 hover:border-green-400 hover:bg-gray-500/40 cursor-pointer transition-all duration-200 group"
                      onClick={() => playlistSelected(pl)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium group-hover:text-green-400 transition-colors duration-200">{pl.name}</p>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-green-400 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-600/40 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-lg">No playlists available</p>
                    <p className="text-gray-500 text-sm">Select a game mode to view playlists</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (connecting || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-blue-500 opacity-30 animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connecting to Lobby</h2>
          <p className="text-gray-400">Preparing your gaming experience...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {modalIsOpen && (renderModal())}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{lobby?.name ?? `Lobby ${id}`}</h1>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-gray-400">Lobby ID: {id}</p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-8 mb-8">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {lobby?.host?.username?.[0]?.toUpperCase() || 'H'}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Host: {lobby?.host?.username ?? 'Unknown'}</h2>
                <p className="text-gray-400 text-sm"></p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {lobby && lobby.host && user && lobby.host.id == user.id && (
                <button
                  onClick={() => {
                    try { wsRef.current?.send({ type: 'lobby:start', payload: { lobbyId: id } }) } catch (e) { console.error(e) }
                    try { wsRef.current?.send({ type: 'game:init', payload: { gameId: id, lobby: lobby } }) } catch (e) { console.error(e) }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  🚀 Start Game
                </button>
              )}
              <button
                onClick={leaveLobby}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg transition-all duration-200"
              >
                Leave Lobby
              </button>
            </div>
          </div>

          {/* Game Modes Section */}
          {lobby && lobby.host && user && lobby.host.id == user.id && (
            <div className="mb-8 p-6 bg-gray-800/30 rounded-xl border border-gray-700/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Game Modes
                </h3>
                <button
                  onClick={() => setModalIsOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Game Mode
                </button>
              </div>
              <div className="space-y-3">
                {lobby.gameModeOrder && lobby.gameModeOrder.length > 0 ? (
                  lobby.gameModeOrder.map((gm) => (
                    <div key={gm.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600/50 hover:border-gray-500 transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div>
                          <h4 className="text-white font-medium">{gm.type}</h4>
                          <p className="text-gray-400 text-sm">Created: {new Date(gm.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { removeGameMode(gm.id) }}
                        className="px-3 py-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-md transition-all duration-200 transform hover:scale-105"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-lg">No game modes selected</p>
                    <p className="text-gray-500 text-sm">Add game modes to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Players Section */}
          <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-700/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Players ({lobby?.players?.length || 0})
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-400 text-sm">{lobby?.players?.length || 0} connected</span>
              </div>
            </div>

            {(!lobby || (lobby.players || []).length === 0) ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-lg">No players yet</p>
                <p className="text-gray-500 text-sm">Waiting for players to join the lobby</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(lobby.players || []).map(p => (
                  <div key={p.id} className="flex items-center space-x-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600/50 hover:border-gray-500 transition-all duration-200">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {/* {p.username ? p.username[0]?.toUpperCase() : 'U'} */}
                        <img src={getUserAvatar(p.id)} alt="" className="w-full h-full rounded-full" onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const textSpan = document.createElement('span');
                          textSpan.textContent = p.username.charAt(0).toUpperCase();
                          textSpan.className = 'text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full w-8 h-8 flex items-center justify-center';
                          e.currentTarget.parentElement?.appendChild(textSpan);
                        }} />
                      </div>
                      {p.id === user?.id && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{p.username}</h4>
                      {p.id === user?.id && (
                        <span className="text-green-400 text-sm font-medium">You</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-400 text-sm">Online</span>
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
