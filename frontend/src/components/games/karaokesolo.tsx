'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { Game, GameFN, Scoreboard, Score, Karaoke_Solo, KaraokeCurrentSong, KaraokeSongSegment, KaraokeSongLyrics, KSFN } from '@/types';
import AudioRecorder from '../AudioRecorder';
import { getUserAvatar } from '@/lib/api';

interface KaraokeSoloProps {
  isHost: boolean;
  GameData: Game;
  KSFN: KSFN;
  GameFN: GameFN;
  currentSong: string | null;
  autoPlay: boolean
  RTP: number | null
}

class DynamicTimer {
  private getCurrentInterval: () => number;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private callback: () => void;
  private running: boolean = false;

  constructor(callback: () => void, getCurrentInterval: () => number) {
    this.callback = callback;
    this.getCurrentInterval = getCurrentInterval;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  private scheduleNext() {
    if (!this.running) return;

    const interval = this.getCurrentInterval();
    console.log(this.getCurrentInterval())
    this.timerId = setTimeout(() => {
      this.callback();
      this.scheduleNext();
    }, interval);
  }

  stop() {
    if (this.timerId) clearTimeout(this.timerId);
    this.running = false;
    this.timerId = null;
  }
}

class LyricsPlayer {
  private lyrics: KaraokeSongLyrics[];
  private currentIndex: number = 0;
  private timer: DynamicTimer;
  private setState: (v: number) => void;

  constructor(lyrics: KaraokeSongLyrics[], setState: (v: number) => void) {
    this.lyrics = lyrics;
    this.setState = setState;

    this.timer = new DynamicTimer(() => this.tick(), () => this.getInterval());
  }

  private getInterval(): number {
    if (this.currentIndex + 1 < this.lyrics.length) {
      return this.lyrics[this.currentIndex + 1].time;
    }
    return 1000;
  }

  private tick() {
    if (this.currentIndex >= this.lyrics.length) {
      this.timer.stop();
      console.log("Lyrics ended");
      return;
    }

    const currentLyric = this.lyrics[this.currentIndex];
    console.log(`Current lyric (${currentLyric.index}): ${currentLyric.lyrics}`);

    this.currentIndex++;
    this.setState(this.currentIndex);
  }

  start() {
    this.currentIndex = 0;
    this.timer.start();
  }

  stop() {
    this.timer.stop();
  }
}

export default function KaraokeSolo({ isHost, GameData, KSFN, GameFN, currentSong, autoPlay, RTP }: KaraokeSoloProps) {
  const { user } = useUser();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(0.5);
  const [recording, setRecording] = useState<boolean>(false)
  const [answer, setAnswer] = useState('');
  const { RecordCallBack, setAutoPlayState, startPlayback, resetRTP, startRound, openVote, voteToPlayer, nextSong } = KSFN
  const { endGameMode, incrementScore, decrementScore } = GameFN
  const [currentRowIndex, setCurrentRowIndex] = useState<number>(0)
  const [currentRow, setCurrentRow] = useState<string>('')
  const [showControls, setShowControls] = useState(true)
  const [lyricsStarted, setLyricsStarted] = useState(false)

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    playSong();
    setAutoPlayState(false);
  }, [autoPlay])

  useEffect(() => {
    if (!RTP) return;
    const ap = document.getElementById(`RTP-${RTP}`) as HTMLAudioElement;
    if (!ap) return;

    ap.volume = volume
    ap.play();
    ap.onended = () => {
      resetRTP();

    }

  }, [RTP])

  const playSong = () => {
    console.log("PLAY SONG")
    if (GameData && GameData.currentGameModeData && GameData.currentGameModeData.currentSong) {
      const element = document.getElementById("current-song-audio") as HTMLAudioElement
      if (!element) return;
      if (!element.paused) return;
      console.log("not paused")
      try {
        element.volume = volume;
        setRecording(true)
        startLyrics();
        element.play();

        element.onended = () => {
          setRecording(false)
          setLyricsStarted(true);

        }
      } catch (error) {
        console.log(error)
      }
    }
  }

  const getSegmentFileUrl = () => {
    if (!GameData || !GameData.currentGameModeData) return "";

    let segmentId = (GameData.currentGameModeData as Karaoke_Solo).currentSong.pSegments.find(s => s.playerId == Number(user?.id))?.segmentId;
    if (!segmentId) { segmentId = 0; }

    const currentSong: KaraokeCurrentSong = (GameData.currentGameModeData as Karaoke_Solo).currentSong;
    return `https://gameapi.katroland.hu/karaoke/tracks/${currentSong.Song.id}/${segmentId}`
  }

  const getCurrentSongName = () => {
    const currentSong: KaraokeCurrentSong = (GameData.currentGameModeData as Karaoke_Solo).currentSong;
    return currentSong.Song.title;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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

    if (!RTP) return;
    const ap = document.getElementById(`RTP-${RTP}`) as HTMLAudioElement;
    if (!ap) return;
    ap.volume = parseFloat(e.target.value);

  };


  const getSegmentId = () => {
    let segmentId = (GameData.currentGameModeData as Karaoke_Solo).currentSong.pSegments.find(s => s.playerId == Number(user?.id))?.segmentId;
    if (!segmentId) { segmentId = 0; }

    return segmentId;
  }

  const startLyrics = () => {
    const currentSong: KaraokeCurrentSong = (GameData.currentGameModeData as Karaoke_Solo).currentSong;
    if (!currentSong.Song.Segments || !currentSong.Song.Segments[getSegmentId()]) return;
    const currentSegment: KaraokeSongSegment = currentSong.Song.Segments[getSegmentId()]
    if (!currentSegment.Rows) return;

    const player = new LyricsPlayer(currentSegment.Rows, setCurrentRowIndex)
    player.start();
    setLyricsStarted(true);
  }


  const renderOutputs = () => {
    const outputs = (GameData.currentGameModeData as Karaoke_Solo).outputs

    return (
      outputs.map(output => (
        <div key={output.playerId} className='space-y-4 flex flex-col gap-4'>
          <div>
            <p id={`PTAG-${output.playerId}`}>player: {GameData.lobby.players?.find(p => p.id == output.playerId).username}</p>
            <audio id={`RTP-${output.playerId}`} hidden src={`https://gameapi.katroland.hu/karaoke/output/${output.file}`} controls={true} />
            {isHost && (
              <button
                onClick={() => { startPlayback(output.playerId) }}
              >Play</button>
            )}
          </div>
        </div>
      ))
    )
  }

  const sumVotesForPlayer = (playerId: number) => {
    if (!playerId) return;
    const sum = (GameData.currentGameModeData as Karaoke_Solo).votes.filter(v => v.votedPlayerId == playerId).length
    console.log(sum);
    return sum;
  }

  const renderPlayerCard = (player: Score) => {
    const playerData = GameData.lobby.players?.find(p => p.id === player.playerId);
    const voteCount = sumVotesForPlayer(+player.playerId);
    const isCurrentUser = user?.id === player.playerId;

    return (
      <div key={player.playerId} className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 border transition-all duration-300 hover:bg-white/20 hover:scale-105 ${isCurrentUser ? 'border-purple-400/50 shadow-lg shadow-purple-500/20' : 'border-white/20'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-gradient-to-br rounded-full flex items-center justify-center text-white font-bold shadow-lg ${isCurrentUser
              ? 'from-purple-500 to-pink-500 animate-pulse'
              : 'from-blue-500 to-purple-500'
              }`}>
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
              <h3 className={`font-semibold ${isCurrentUser ? 'text-purple-300' : 'text-white'
                }`}>
                {player.playerName}
                {isCurrentUser && <span className="ml-2 text-xs">(You)</span>}
              </h3>
              <p className="text-sm text-gray-300">Score: {player.score}</p>
            </div>
          </div>

          {isHost && (
            <div className="flex space-x-2">
              <button
                onClick={() => incrementScore(player.playerId, 1)}
                className="w-8 h-8 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white font-bold transition-all duration-200 hover:scale-110 active:scale-95"
              >
                +
              </button>
              <button
                onClick={() => decrementScore(player.playerId, 1)}
                className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white font-bold transition-all duration-200 hover:scale-110 active:scale-95"
              >
                -
              </button>
            </div>
          )}
        </div>

        {GameData.currentGameModeData.isVoteOpen && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-300">Votes:</span>
                <span className="text-sm font-bold text-purple-300">{voteCount}</span>
              </div>
              <button
                onClick={() => voteToPlayer(+player.playerId)}
                className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-full text-xs text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Vote 🗳
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLyricsDisplay = () => {
    const currentSong: KaraokeCurrentSong = (GameData.currentGameModeData as Karaoke_Solo).currentSong;
    if (!currentSong.Song.Segments || !currentSong.Song.Segments[getSegmentId()]) return null;

    const currentSegment: KaraokeSongSegment = currentSong.Song.Segments[getSegmentId()];
    if (!currentSegment.Rows || !currentSegment.Rows[currentRowIndex]) return null;

    const currentRowText = currentSegment.Rows[currentRowIndex].lyrics;
    const nextRowText = currentSegment.Rows[currentRowIndex + 1]?.lyrics || "";

    return (
      <div className="text-center space-y-6">
        <div className="bg-gradient-to-br from-black/60 via-black/30 to-purple-900/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl relative overflow-hidden">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 animate-pulse"></div>

          <div className="relative z-10 mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                🎵
              </div>
              <h3 className="text-3xl font-bold text-white">{currentSong.Song.title}</h3>
            </div>
            <p className="text-gray-300 text-lg">Follow the lyrics and sing along!</p>
          </div>

          <div className="relative z-10 space-y-8 min-h-[250px] flex flex-col justify-center">
            <p className="text-4xl sm:text-xl lg:text-2xl font-bold text-white leading-relaxed drop-shadow-lg">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
                {currentRowText}
              </span>
            </p>
            {nextRowText && (
              <div className="pt-6 border-t border-white/20">
                <div className="text-xs text-gray-400 mb-2">Next Line</div>
                <p className="text-l text-gray-300 opacity-70 italic">
                  {nextRowText}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPlaybackOutput = () => {
    const outputs = (GameData.currentGameModeData as Karaoke_Solo).outputs;

    return (
      <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-lg rounded-3xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
        </div>

        {/* hidden audio player for all output */}
        {outputs.map((output) => (
          <audio key={output.playerId} id={`RTP-${output.playerId}`} src={`https://gameapi.katroland.hu/karaoke/output/${output.file}`} className="hidden"></audio>
        ))}

        {/* Audio Player */}
        {isHost ? (
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-green-300 text-sm font-medium">Playback Control</span>
            </div>

            {outputs.map((output) => (
              <div key={output.playerId} className="w-full h-16 rounded-xl bg-gray-800/50 text-white border border-white/20 flex items-center justify-around">
                <div className="w-10 h-10 rounded-full bg-gray-600/50 flex items-center justify-center">
                  <span className="text-l font-medium">{output.playerId}</span>
                </div>
                {GameData && GameData.lobby && GameData.lobby.players && GameData.lobby.players.find(player => player.id === output.playerId).username && (
                  <span className="text-l font-medium">{GameData.lobby.players.find(player => player.id === output.playerId).username}</span>
                )}
                <button
                  onClick={() => startPlayback(output.playerId)}
                  className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-full text-xs text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Request Playback
                </button>
              </div>
            ))}

          </div>
        ) : (
          <div className='w-full h-72 rounded-xl bg-gray-800/50 text-white border border-white/20 flex flex-col items-center justify-center'>
            <div className="w-20 h-20 rounded-full bg-gray-600/50 flex items-center justify-center">
              <span className="text-4xl font-medium">⏳</span>
            </div>
            <span className="text-sm font-medium text-center">Waiting for host to start playback</span>
          </div>
        )

        }

        {/* Recording Status */}
        {recording && (
          <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-sm font-medium">Recording...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getLyrics = () => {
    return null;
  };

  const renderGameControls = () => {
    const currentState = GameData.currentGameModeData.state;
    const currentSongName = getCurrentSongName();
    const songProgress = `${GameData.currentGameModeData.currentTrackIndex + 1} / ${GameData.currentGameModeData.trackLength}`;

    return (
      <div className="bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-lg rounded-3xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            🎮
          </div>
          <h2 className="text-2xl font-bold text-white">Game Controls</h2>
        </div>

        {/* Song Info */}
        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-purple-300">🎵</span>
            <p className="text-purple-300 text-sm font-medium">Now Playing</p>
          </div>
          <h3 className="text-lg font-bold text-white mb-1 truncate">{currentSongName}</h3>
        </div>

        {/* Recording Status */}
        {recording && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-xl animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-red-300 font-medium">🎤 Recording in progress...</span>
            </div>
          </div>
        )}

        {/* State-based Controls */}
        <div className="space-y-3">
          {currentState === "pending" && isHost && (
            <button
              onClick={startRound}
              className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg active:scale-95"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>🎤</span>
                <span>Start Round</span>
              </span>
            </button>
          )}

          {currentState === "reviewing" && isHost && (
            <button
              onClick={openVote}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg active:scale-95"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>🗳</span>
                <span>Open Voting</span>
              </span>
            </button>
          )}

          {isHost && (
            <>

              <button
                onClick={endGameMode}
                className="w-full bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 hover:from-red-600 hover:via-pink-600 hover:to-rose-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>🏁</span>
                  <span>End Game Mode</span>
                </span>
              </button>

              <button
                onClick={nextSong}
                className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>⏭️</span>
                  <span>Next Song</span>
                </span>
              </button></>

          )}
        </div>

        {/* Volume Control */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-purple-300">🔊</span>
              <span className="text-purple-300 text-sm font-medium">Volume Control</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">🔇</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 h-3 bg-gray-700 rounded-full appearance-none cursor-pointer accent-gradient"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${volume * 100}%, #374151 ${volume * 100}%, #374151 100%)`
                }}
              />
              <span className="text-gray-400 text-sm">🔊</span>
              <div className="bg-gray-700 px-3 py-1 rounded-full min-w-[3rem] text-center">
                <span className="text-white text-sm font-bold">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)] animate-pulse"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(139,92,246,0.1)_90deg,transparent_180deg,rgba(236,72,153,0.1)_270deg,transparent_360deg)] animate-spin" style={{ animationDuration: '20s' }}></div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      {/* Mobile Menu Toggle */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowControls(!showControls)}
          className="bg-black/50 backdrop-blur-sm p-3 rounded-full border border-white/20 text-white hover:bg-black/70 transition-all duration-200 transform hover:scale-110"
        >
          ⚙️
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            🎤 Karaoke Solo
          </h1>
          <p className="text-gray-300 text-base sm:text-lg">Sing your heart out!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Sidebar - Players */}
          <div className="lg:col-span-6 space-y-4 order-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                👥
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">🎭 Players</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {(GameData.currentGameModeData.Scoreboard as Scoreboard).scores.map(renderPlayerCard)}
            </div>
          </div>

          {/* Center Stage - Lyrics & Audio */}
          <div className="lg:col-span-12 space-y-6 order-1">
            {/* Lyrics Display */}
            {lyricsStarted && renderLyricsDisplay()}

            {/* Audio Elements */}
            <div className="hidden">
              <AudioRecorder recording={recording} recordCallBack={RecordCallBack} hidden={true} />
              <audio
                id='current-song-audio'
                ref={audioRef}
                src={getSegmentFileUrl()}
                hidden
              />
            </div>

            {/* Reviewing State */}
            {GameData.currentGameModeData.state === "reviewing" && renderPlaybackOutput()}

            {/* Pending State */}
            {GameData.currentGameModeData.state === "pending" && !lyricsStarted && (
              <div className="text-center">
                <div className="bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-lg rounded-3xl p-6 sm:p-8 lg:p-12 border border-white/20 shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <div className="text-4xl sm:text-5xl lg:text-6xl mb-4 animate-bounce">🎵</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Ready to Sing!</h3>
                  <p className="text-gray-300 text-sm sm:text-base">{getCurrentSongName()}</p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-2">Waiting for host to start the round</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Controls */}
          <div className={`lg:col-span-6 space-y-4 order-3 ${showControls ? 'block' : 'hidden lg:block'}`}>
            <div className="lg:hidden flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">🎮 Controls</h2>
              <button
                onClick={() => setShowControls(false)}
                className="text-white lg:hidden hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>
            {renderGameControls()}
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}