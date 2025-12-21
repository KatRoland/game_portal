import React from 'react';

import { Game, GameFN, Score, Scoreboard } from '@/types';
import { getUserAvatar } from '@/lib/api';

interface CrossGameProps {
  GameData: Game;
  GameFN: GameFN;
  isHost: boolean;
}

export default function CrossGame({ GameData, GameFN, isHost }: CrossGameProps) {
  const { nextGameMode } = GameFN;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-900 to-black text-gray-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Hero */}
        <div className="flex items-center gap-4 mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-indigo-900/30">
            {/* game controller icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M6.5 8A1.5 1.5 0 1 1 5 9.5 1.5 1.5 0 0 1 6.5 8zm0 4A1.5 1.5 0 1 1 5 13.5 1.5 1.5 0 0 1 6.5 12zm4-4h3a3 3 0 0 1 3 3v2.25a.75.75 0 0 1-1.5 0V11a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 8 11v2.25a.75.75 0 0 1-1.5 0V11a3 3 0 0 1 3-3z"/>
            </svg>
          </span>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Cross Challenge</span>
            </h1>
            <p className="mt-1 text-sm text-gray-400">Fast-paced scoring. Clean dark UI. Glass morphism.</p>
          </div>
        </div>

        {/* Host Controls */}
        {isHost && (
          <div className="mb-8">
            <button
              onClick={() => nextGameMode()}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-2 text-white shadow hover:opacity-95 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1z" />
              </svg>
              Next Game Mode
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Gamemode Scoreboard */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-xl font-semibold">Current Mode Scoreboard</h2>
            </div>
            <div className="px-6 py-6">
              {GameData.currentGameModeData?.Scoreboard && GameData.currentGameModeData.Scoreboard.scores.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-300">
                      <th className="px-3 py-2 text-left font-medium">Player</th>
                      <th className="px-3 py-2 text-left font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(GameData.currentGameModeData.Scoreboard as Scoreboard).scores.map((score: Score) => (
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

          {/* Overall Scoreboard */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-xl font-semibold">Overall Scoreboard</h2>
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
    </div>
  );
}