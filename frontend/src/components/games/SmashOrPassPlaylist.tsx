'use client';

import { useState } from 'react';
import { Game, SOPPL_DATA, SOPPL_FN, GameFN, Scoreboard, SOPPLItem } from '@/types';
import { getUserAvatar } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

type Props = {
  isHost: boolean
  GameData: Game
  SOPPLFN: SOPPL_FN
  GameFN: GameFN
}

export default function SmashOrPassPlaylist({ isHost, GameData, SOPPLFN, GameFN }: Props) {
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const current = GameData.currentGameModeData as SOPPL_DATA;

  const currentItem = current.items[current.currentIndex];
  console.log(`currentItem:`, currentItem);
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  const url = currentItem ? `${base}/uploads/${currentItem.fileUrl}` : '';


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className={`max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6 ${isHost ? '' : 'md:grid-cols-1'}`}>
        {isHost && (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Playlist</h2>
            <div className="space-y-2 max-h-64 overflow-auto">
              {current.items.map((it, idx) => (
                <div key={it.id} className={`p-3 rounded-lg border ${idx === current.currentIndex ? 'border-blue-400/40 bg-blue-900/20' : 'border-gray-700/40 bg-gray-800/30'} text-white`}>{it.title}</div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Now Showing</h2>
          {currentItem ? (
            <div className="space-y-3">
              <img src={url} alt={currentItem.title} className="max-h-72 rounded-lg border border-gray-700" />
              <div className="text-white font-semibold text-lg">{currentItem.title}</div>
              {current.pickerId && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
                  <div className="flex items-center gap-4">
                    <img src={getUserAvatar(String(current.pickerId))} className="w-16 h-16 rounded-xl ring-2 ring-white/10" />
                    <div>
                      <div className="text-white text-xl font-bold">{GameData.lobby.players?.find(p => String(p.id) === String(current.pickerId))?.username || current.pickerId}</div>
                      <div className="text-gray-300 text-sm">Selected to judge</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white ${current.currentVotes.find(v => String(v.voterId) === String(current.pickerId))?.value === 1 ? 'bg-emerald-500/20 border border-emerald-400/30' : current.currentVotes.find(v => String(v.voterId) === String(current.pickerId))?.value === -1 ? 'bg-rose-500/20 border border-rose-400/30' : 'bg-blue-500/20 border border-blue-400/30'}`}>
                      <span className="text-sm">Thinks:</span>
                      <span className="text-lg font-semibold">{current.currentVotes.find(v => String(v.voterId) === String(current.pickerId)) ? (current.currentVotes.find(v => String(v.voterId) === String(current.pickerId))!.value === 1 ? 'Smash' : 'Pass') : 'Waiting for decision...'}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <button onClick={() => SOPPLFN.vote(1)} className="px-8 py-4 rounded-2xl text-white text-lg font-semibold bg-gradient-to-r from-emerald-400/20 to-emerald-600/20 hover:from-emerald-400/30 hover:to-emerald-600/30 border border-emerald-300/25 backdrop-blur-md shadow-xl shadow-emerald-500/20 ring-1 ring-white/10 transition">Smash</button>
                <button onClick={() => SOPPLFN.vote(-1)} className="px-8 py-4 rounded-2xl text-white text-lg font-semibold bg-gradient-to-r from-rose-400/20 to-rose-600/20 hover:from-rose-400/30 hover:to-rose-600/30 border border-rose-300/25 backdrop-blur-md shadow-xl shadow-rose-500/20 ring-1 ring-white/10 transition">Pass</button>
              </div>
              {current.pickerId && (
                <div className="text-sm text-gray-300">Picker: {GameData.lobby.players?.find(p => String(p.id) === String(current.pickerId))?.username || current.pickerId}</div>
              )}
              <div className="text-gray-300 text-sm">Votes: Smash {current.currentVotes.filter(v => v.value === 1).length} | Pass {current.currentVotes.filter(v => v.value === -1).length}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-green-900/30 border border-green-700/30">
                  <div className="text-green-400 font-medium mb-2">Smash</div>
                  <div className="flex flex-wrap gap-2">
                    {current.currentVotes.filter(v => v.value === 1).map(v => (
                      <div key={v.voterId} className="flex items-center gap-2 bg-green-800/40 rounded-full px-2 py-1">
                        <img src={getUserAvatar(v.voterId)} className="w-6 h-6 rounded-full" />
                        <span className="text-white text-sm">{GameData.lobby.players?.find(p => String(p.id) === String(v.voterId))?.username || v.voterId}</span>
                      </div>
                    ))}
                    {current.currentVotes.filter(v => v.value === 1).length === 0 && <span className="text-gray-400 text-sm">No votes</span>}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-red-900/30 border border-red-700/30">
                  <div className="text-red-400 font-medium mb-2">Pass</div>
                  <div className="flex flex-wrap gap-2">
                    {current.currentVotes.filter(v => v.value === -1).map(v => (
                      <div key={v.voterId} className="flex items-center gap-2 bg-red-800/40 rounded-full px-2 py-1">
                        <img src={getUserAvatar(v.voterId)} className="w-6 h-6 rounded-full" />
                        <span className="text-white text-sm">{GameData.lobby.players?.find(p => String(p.id) === String(v.voterId))?.username || v.voterId}</span>
                      </div>
                    ))}
                    {current.currentVotes.filter(v => v.value === -1).length === 0 && <span className="text-gray-400 text-sm">No votes</span>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">No items yet</div>
          )}
        </div>

        {isHost && (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Controls</h2>
            <div className="space-y-2">
              <button onClick={SOPPLFN.start} className="w-full px-4 py-2 bg-green-600 text-white rounded">Start</button>
              <button onClick={SOPPLFN.next} className="w-full px-4 py-2 bg-blue-600 text-white rounded">Next Item</button>
              <button onClick={GameFN.endGameMode} className="w-full px-4 py-2 bg-red-600 text-white rounded">End Mode</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
