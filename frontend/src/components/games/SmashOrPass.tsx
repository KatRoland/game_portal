'use client';

import React, { useState } from 'react';
import { Game, SMASH_OR_PASS, SOP_FN, GameFN, Scoreboard } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { getUserAvatar } from '@/lib/api';

type Props = {
  isHost: boolean
  GameData: Game
  IMGRFN: SOP_FN
  GameFN: GameFN
}

export default function SmashOrPass({ isHost, GameData, IMGRFN, GameFN }: Props) {
  const { user } = useUser();
  const current = GameData.currentGameModeData as SMASH_OR_PASS;
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const currentPlayerId = current.order[current.currentIndex];
  const currentPlayer = GameData.lobby.players?.find(p => p.id === currentPlayerId);
  const isMyTurn = !!user && String(user.id) === String(currentPlayerId);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null; setFile(f);
  }

  const doUpload = async () => {
    if (!file || !title.trim()) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${base}/imgr/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } as any : undefined,
        body: form,
        credentials: 'include'
      });
      if (!res.ok) throw new Error('upload failed');
      const data = await res.json();
      IMGRFN.submit(title.trim(), data.fileUrl);
      setTitle(''); setFile(null);
    } finally {
      setUploading(false);
    }
  }

  const renderSubmission = (playerId: string) => {
    const sub = current.submissions.find(s => s.playerId === playerId);
    if (!sub) return <div className="text-gray-400">No submission yet</div>;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    const url = `${base}/uploads/${sub.fileUrl}`;
    const smashers = sub.votes.filter(v => v.value === 1).map(v => v.voterId);
    const passers = sub.votes.filter(v => v.value === -1).map(v => v.voterId);
    return (
      <div className="space-y-3">
        <div className="text-white font-semibold text-lg">{sub.title}</div>
        <img src={url} alt={sub.title} className="max-h-[80vh] rounded-lg border border-gray-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-green-900/30 border border-green-700/30">
            <div className="text-green-400 font-medium mb-2">Smash</div>
            <div className="flex flex-wrap gap-2">
              {smashers.map(uid => (
                <div key={uid} className="flex items-center gap-2 bg-green-800/40 rounded-full px-2 py-1">
                  <img src={getUserAvatar(uid)} className="w-6 h-6 rounded-full" />
                  <span className="text-white text-sm">{GameData.lobby.players?.find(p => p.id === uid)?.username || uid}</span>
                </div>
              ))}
              {smashers.length === 0 && <span className="text-gray-400 text-sm">No votes</span>}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-red-900/30 border border-red-700/30">
            <div className="text-red-400 font-medium mb-2">Pass</div>
            <div className="flex flex-wrap gap-2">
              {passers.map(uid => (
                <div key={uid} className="flex items-center gap-2 bg-red-800/40 rounded-full px-2 py-1">
                  <img src={getUserAvatar(uid)} className="w-6 h-6 rounded-full" />
                  <span className="text-white text-sm">{GameData.lobby.players?.find(p => p.id === uid)?.username || uid}</span>
                </div>
              ))}
              {passers.length === 0 && <span className="text-gray-400 text-sm">No votes</span>}
            </div>
          </div>
        </div>
        {current.isVotingOpen && (!user || String(user.id) !== String(playerId)) && (
          <div className="flex gap-4">
            <button
              onClick={() => IMGRFN.vote(sub.playerId, 1)}
              className="px-8 py-4 rounded-2xl text-white text-lg font-semibold bg-gradient-to-r from-emerald-400/20 to-emerald-600/20 hover:from-emerald-400/30 hover:to-emerald-600/30 border border-emerald-300/25 backdrop-blur-md shadow-xl shadow-emerald-500/20 ring-1 ring-white/10 transition"
            >
              Smash
            </button>
            <button
              onClick={() => IMGRFN.vote(sub.playerId, -1)}
              className="px-8 py-4 rounded-2xl text-white text-lg font-semibold bg-gradient-to-r from-rose-400/20 to-rose-600/20 hover:from-rose-400/30 hover:to-rose-600/30 border border-rose-300/25 backdrop-blur-md shadow-xl shadow-rose-500/20 ring-1 ring-white/10 transition"
            >
              Pass
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full px-4 py-8 grid md:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Players</h2>
          <div className="space-y-3">
            {(current.Scoreboard as Scoreboard).scores.map((p) => (
              <div key={p.playerId} className="flex items-center justify-between p-3 bg-gray-700/40 rounded-lg">
                <div className="flex items-center gap-3">
                  <img src={getUserAvatar(p.playerId)} className="w-8 h-8 rounded-full" />
                  <div className="text-white">{p.playerName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Smash or Pass</h2>
          <div className="text-gray-300 mb-4">Turn {current.currentIndex + 1} / {current.order.length}</div>
          {currentPlayer && (
            <div className="mb-4 flex items-center gap-3">
              <img src={getUserAvatar(currentPlayer.id)} className="w-10 h-10 rounded-full" />
              <div className="text-white font-medium">{currentPlayer.username}</div>
            </div>
          )}
          {renderSubmission(current.order[current.currentIndex])}
        </div>

        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>
          {isMyTurn && !current.submissions.find(s => String(s.playerId) === String(user?.id)) && (
            <div className="space-y-2">
              <input className="w-full px-3 py-2 rounded bg-gray-700 text-white" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="w-full text-gray-200" type="file" accept="image/*" onChange={onFile} />
              <button disabled={uploading || !file || !title} onClick={doUpload} className="w-full px-4 py-2 bg-blue-600 disabled:bg-gray-600 text-white rounded">Upload</button>
            </div>
          )}

          {isHost && (
            <div className="space-y-2 mt-4">
              <button onClick={IMGRFN.openVoting} className="w-full px-4 py-2 bg-purple-600 text-white rounded">Open Voting</button>
              <button onClick={IMGRFN.next} className="w-full px-4 py-2 bg-blue-600 text-white rounded">Next Player</button>
              <button onClick={GameFN.endGameMode} className="w-full px-4 py-2 bg-red-600 text-white rounded">End Game Mode</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
