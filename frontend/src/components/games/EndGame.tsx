import React from 'react';

import { Game, GameFN, Score, Scoreboard } from '@/types';
import { getUserAvatar } from '@/lib/api';

interface EndGameProps {
  GameData: Game;
  GameFN: GameFN;
  isHost: boolean;
}

export default function EndGame({ GameData, GameFN, isHost }: EndGameProps) {
  const { finishGameAsHost } = GameFN;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-900 to-black text-gray-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Hero */}
        <div className="flex items-center gap-4 mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-900/30">
            {/* trophy icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M4 7a1 1 0 0 1 1-1h2V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h2a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5h-1v1a3 3 0 0 1-3 3v1h3a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h3v-1a3 3 0 0 1-3-3v-1H8a5 5 0 0 1-5-5zm2 2a3 3 0 0 0 3 3h1V6H7a3 3 0 0 0-1 .17zm11-1h-3v6h1a3 3 0 0 0 3-3z" />
            </svg>
          </span>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">Game Finished</span>
            </h1>
            <p className="mt-1 text-sm text-gray-400">Summary, scores, and graceful exit.</p>
          </div>
        </div>

        {/* Host Action */}
        {isHost && (
          <div className="mb-8">
            <button
              onClick={() => finishGameAsHost()}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-2 text-white shadow hover:opacity-95 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M5 4a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7v14h5a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1zM17.293 8.293a1 1 0 0 1 1.414 0L22 11.586a1 1 0 0 1 0 1.414l-3.293 3.293a1 1 0 0 1-1.414-1.414L18.586 13H12a1 1 0 1 1 0-2h6.586l-1.293-1.293a1 1 0 0 1 0-1.414z" />
              </svg>
              Finish Game
            </button>
          </div>
        )}

        {/* Scoreboard Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-semibold">Final Scoreboard</h2>
          </div>
          <div className="px-6 py-6">
            {GameData.Scoreboard && GameData.Scoreboard.scores.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-300">
                    <th className="px-3 py-2 text-left font-medium">Player</th>
                    <th className="px-3 py-2 text-left font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(GameData.Scoreboard as Scoreboard).scores.map((score: Score) => (
                      <tr key={score.playerId} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-3 py-2 flex items-center gap-3">
                          <div>
                          <img
                            src={getUserAvatar(score.playerId)}
                            alt={`${score.playerName}'s avatar`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const textSpan = document.createElement('span');
                              textSpan.textContent = score.playerName.charAt(0).toUpperCase();
                              textSpan.className = 'text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 border border-white/20 px-1 rounded-full w-8 h-8 flex items-center justify-center';
                              e.currentTarget.parentElement?.appendChild(textSpan);
                            }}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                          </div>
                          {score.playerName}
                        </td>
                        <td className="px-3 py-2">{score.score}</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center gap-3 text-gray-400">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 15a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm1-4h-2V7h2z" />
                  </svg>
                </span>
                No scores available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}