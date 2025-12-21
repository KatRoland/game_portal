'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { Game, MQFN, GameFN, Scoreboard, Score } from '@/types';
import { getUserAvatar } from '@/lib/api';

interface MusicQuizProps {
  isHost: boolean;
  GameData: Game;
  MQFN: MQFN;
  GameFN: GameFN;
  currentSong: string | null;
  autoPlay: boolean
}

export default function MusicQuiz({ isHost, GameData, MQFN, GameFN, currentSong, autoPlay }: MusicQuizProps) {
  const { user } = useUser();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(0.5);

  const [answer, setAnswer] = useState('');
  const { startQuiz, getCurrentSong, nextSong, setAutoPlayState } = MQFN
  const { endGameMode, incrementScore, decrementScore } = GameFN

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    playSong();
    setAutoPlayState(false);
  }, [autoPlay])

  const playSong = () => {
    console.log("PLAY SONG")
    if (currentSong && currentSong.length > 0) {
      const element = document.getElementById("current-song-audio") as HTMLAudioElement
      if (!element) return;
      if (!element.paused) return;
      console.log("not paused")
      if (GameData.currentGameModeData.replayLimitReached) return;
      try {
        element.volume = volume;
        element.play();
        MQFN.replaySong();
      } catch (error) {
        console.log(error)
      }
    }
  }

  const submitAnswer = () => {
    if (!isHost && answer.trim()) {
      MQFN.submitAnswer(answer.trim());
      setAnswer('');
    }
  };

  const judgeAnswer = (playerId: string, isCorrect: boolean) => {
    if (isHost) {
      if (isCorrect) {
        MQFN.acceptAnswer(playerId);
      } else {
        MQFN.rejectAnswer(playerId);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-blue-500 opacity-30 animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Music Quiz</h2>
          <p className="text-gray-400">Preparing your game experience...</p>
        </div>
      </div>
    );
  }

  const playlist = GameData.currentGameModeData?.playlist?.tracks || [];
  const songIndex = GameData.currentGameModeData?.currentSongIndex || 0;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
    if (audioRef.current) {
      audioRef.current.volume = parseFloat(e.target.value);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Music Quiz</h1>
          <p className="text-gray-400">Guess the song and climb the leaderboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Player list */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Players
            </h2>
            <div className="space-y-3 overflow-scroll max-h-72">
              {(GameData.currentGameModeData.Scoreboard as Scoreboard).scores.map((player) => (
                <div key={player.playerId} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      <img
                        src={getUserAvatar(player.playerId)}
                        className="w-full h-full rounded-full"
                        alt={player.playerName.charAt(0).toUpperCase()}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const textSpan = document.createElement('span');
                          textSpan.textContent = player.playerName.charAt(0).toUpperCase();
                          textSpan.className = 'text-xl font-bold';
                          e.currentTarget.parentElement?.appendChild(textSpan);
                        }}
                      />
                    </div>
                    <div>
                      <span className="font-medium text-white">{player.playerName}</span>
                      <div className="text-gray-400 text-sm">Score: {player.score}</div>
                    </div>
                  </div>
                  {isHost && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { incrementScore(player.playerId, 1) }}
                        className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-md"
                        aria-label={`Increase ${player.playerName}'s score`}
                      >
                        +
                      </button>
                      <button
                        onClick={() => decrementScore(player.playerId, 1)}
                        className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-md"
                        aria-label={`Decrease ${player.playerName}'s score`}
                      >
                        -
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Middle column - Current song */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Current Song
            </h2>

            {currentSong ? (
              <div className="space-y-4">
                <button
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg"
                  onClick={playSong}
                >
                  ▶ Play
                </button>

                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-400">🔇</span>
                  <input
                    type="range"
                    name="volume"
                    id="volume-slider"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-sm text-gray-400">🔊</span>
                </div>

                <div className="w-full bg-gray-700/40 rounded-lg p-4 flex justify-center border border-gray-600/40">
                  <audio
                    id='current-song-audio'
                    ref={audioRef}
                    src={currentSong}
                    hidden
                  />
                </div>

              </div>
            ) : (
              <div className="text-center">
                <div className="bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/10 inline-block">
                  <div className="text-3xl mb-2">🎧</div>
                  <p className="text-white font-medium">Not started yet</p>
                  <p className="text-gray-400 text-sm">Waiting for host to start the round</p>
                </div>
              </div>
            )}

            {!isHost && (
              <div className="mt-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter your answer"
                    className="flex-1 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded px-3 py-2"
                  />

                  <button
                    onClick={submitAnswer}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right column - Host controls */}
          {isHost && (

            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7h4m0 0V3m0 4h-4m-2 10h4m0 0v4m0-4h-4M7 7h4m0 0V3m0 4H7m-2 10h4m0 0v4m0-4H5" />
                </svg>
                Game Controls
              </h2>
              {isHost ? (

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Song: {GameData.currentGameModeData.currentTrackIndex + 1} / {GameData.currentGameModeData.trackLength}</span>
                  </div>

                  <button
                    onClick={startQuiz}
                    className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg"
                    hidden={!!(currentSong && currentSong.length > 0)}
                  >
                    Start Game
                  </button>


                  <button
                    onClick={nextSong}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg"
                  >
                    Next Song
                  </button>

                  <button
                    onClick={endGameMode}
                    className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg"
                  >
                    End Game Mode
                  </button>


                </div>
              ) : (
                <></>
              )}
            </div>
          )}


        </div>
        {((GameData.currentGameModeData.answers.length > 0 && GameData.currentGameModeData.answers.some((a: { playerId: string }) => a.playerId == user?.id)) || isHost) && (
          <div className="max-w-4xl mx-auto mt-8 bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-8 4h10M5 8h14" />
              </svg>
              Submitted Answers ({GameData.currentGameModeData.answers.length}/{(GameData.lobby.players?.length || 0) - 1})
            </h2>
            <div className="space-y-2">
              {GameData.currentGameModeData.answers
                .map((player: { playerId: string, playerName: string, answer: string, state: string }) => (
                  <div key={player.playerId} className="flex items-center justify-between border-b border-gray-700 pb-3">
                    <span className="font-medium text-white">{player.playerName}:</span>
                    <span className="text-gray-300">{player.answer}</span>
                    <div className="flex items-center gap-2 space-x-2">
                      <span className={player.state === 'correct' ? "text-green-400" : player.state === 'pending' ? "text-yellow-400" : "text-red-400"}>
                        {player.state === 'correct' ? "✓" : player.state === 'pending' ? "?" : "✗"}
                      </span>
                      {isHost && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => judgeAnswer(player.playerId, true)}
                            className="px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded text-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => judgeAnswer(player.playerId, false)}
                            className="px-3 py-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded text-sm"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>)}
      </div>
    </div>
  );
}