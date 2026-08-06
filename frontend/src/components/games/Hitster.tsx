'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Game, GameFN, HTFN, Hitster, HitsterTeam } from '@/types';
import { Users, Crown, Play, Pause, Settings, Volume2 } from 'lucide-react';

interface HitsterProps {
  isHost: boolean;
  GameData: Game;
  GameFN: GameFN;
  HTFN: HTFN;
}

export default function HitsterGame({ isHost, GameData, GameFN, HTFN }: HitsterProps) {
  const { user } = useUser();
  const hitsterData = GameData.currentGameModeData as Hitster;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    if (hitsterData?.state === 'PLAYING' && hitsterData.currentSong) {
      if (audioRef.current) {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const fileName = hitsterData.currentSong.previewUrl.split('/').pop();
        audioRef.current.src = `${base}/previews/${fileName}`;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      }
    }
  }, [hitsterData?.currentSong?.id, hitsterData?.state]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  if (!hitsterData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading Hitster...</div>;

  if (hitsterData.state === 'WAITING') {
    return <LobbyView hitsterData={hitsterData} isHost={isHost} user={user} HTFN={HTFN} GameFN={GameFN} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-gray-100 flex flex-col">
      <audio ref={audioRef} className="hidden" loop />

      {/* Top Bar */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4 flex justify-between items-center shadow-lg relative z-20">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">HitsTheR</h1>
        </div>

        {hitsterData.state === 'PLAYING' && (
          <div className="flex gap-4 items-center">
            <button onClick={() => audioRef.current?.play()} className="bg-pink-600 p-3 rounded-full hover:bg-pink-500 transition shadow-lg shadow-pink-500/20">
              <Play size={20} fill="currentColor" />
            </button>
            <button onClick={() => audioRef.current?.pause()} className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition">
              <Pause size={20} fill="currentColor" />
            </button>
            <div className="flex items-center gap-2 ml-4">
              <Volume2 size={20} className="text-gray-300" />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24 accent-pink-500"
              />
            </div>
          </div>
        )}

        <div>
          {hitsterData.turnState && hitsterData.currentTurnTeamId && hitsterData.state === 'PLAYING' && (
            <div className="text-right">
              <span className="text-sm text-gray-300 uppercase tracking-wider block">Current Turn</span>
              <span className="text-xl font-bold text-pink-400">{hitsterData.teams[hitsterData.currentTurnTeamId]?.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden relative z-10 flex flex-col">
        {hitsterData.state === 'GAME_OVER' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-white/5 backdrop-blur-xl border border-white/10 p-16 rounded-3xl shadow-2xl">
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-4">Game Over!</h2>
              <p className="text-gray-400 text-xl">The music has stopped.</p>
            </div>
          </div>
        ) : (
          <ActiveTurnView hitsterData={hitsterData} isHost={isHost} user={user} HTFN={HTFN} />
        )}
      </div>
    </div>
  );
}

function LobbyView({ hitsterData, isHost, user, HTFN, GameFN }: any) {
  const me = hitsterData.players[String(user?.id)];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400 drop-shadow-sm mb-2">HitsTheR Lobby</h1>
            <p className="text-xl text-gray-300">Join a team to begin the music timeline challenge!</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => GameFN.endGameMode()}
              className="px-6 py-3 bg-red-600/80 hover:bg-red-500 rounded-xl font-bold transition shadow-lg"
            >
              Leave Game
            </button>
            {isHost && (
              <button
                onClick={() => HTFN.startGame()}
                className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-xl font-bold text-lg shadow-lg shadow-pink-500/30 transition transform hover:scale-105"
              >
                Start Game
              </button>
            )}
          </div>
        </div>

        {isHost && (
          <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10 flex flex-wrap gap-6 items-center shadow-lg">
            <div className="flex items-center gap-3">
              <Settings className="text-gray-400" />
              <span className="font-semibold text-gray-200">Steal Rule:</span>
              <select
                className="bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-500"
                value={hitsterData.stealRule}
                onChange={(e) => HTFN.updateSettings(e.target.value)}
              >
                <option value="BAD_GUESS">Bad Guess (Simple)</option>
                <option value="LOWER_HIGHER">Older / Newer</option>
              </select>
            </div>

            <div className="flex gap-3 ml-auto">
              <button onClick={() => HTFN.addTeam()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition font-medium text-sm">
                + Add Team
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hitsterData.teamOrder.map((teamId: string) => {
            const team = hitsterData.teams[teamId];
            return (
              <div key={teamId} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>

                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    {team.name}
                  </h3>
                  {isHost && hitsterData.teamOrder.length > 2 && (
                    <button onClick={() => HTFN.removeTeam(teamId)} className="text-gray-400 hover:text-red-400 transition text-sm font-medium">Remove</button>
                  )}
                </div>

                <div className="space-y-3 min-h-[150px]">
                  {team.playerIds.map((pid: string) => {
                    const p = hitsterData.players[pid];
                    const isLeader = team.leaderId === pid;
                    return (
                      <div key={pid} className="flex items-center justify-between bg-black/30 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-3">
                          {isLeader && <Crown size={18} className="text-yellow-400 drop-shadow-md" />}
                          <span className="font-medium text-gray-200">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${p.isReady ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            {p.isReady ? 'Ready' : 'Not Ready'}
                          </span>
                          {(me?.playerId === pid || isHost) && !isLeader && (
                            <button onClick={() => HTFN.changeLeader(pid)} className="text-xs text-gray-400 hover:text-white transition">Make Leader</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {team.playerIds.length === 0 && (
                    <div className="text-center text-gray-500 py-6 text-sm italic">Empty Team</div>
                  )}
                </div>

                <button
                  onClick={() => HTFN.joinTeam(teamId)}
                  className={`w-full mt-6 py-3 rounded-xl font-bold transition shadow-lg ${me?.teamId === teamId ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border border-pink-400/50' : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10'}`}
                >
                  {me?.teamId === teamId ? 'Your Team' : 'Join Team'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => HTFN.toggleReady()}
            className={`px-12 py-4 rounded-full font-bold text-xl transition transform hover:scale-105 shadow-xl ${me?.isReady ? 'bg-green-500 text-black shadow-green-500/30' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
          >
            {me?.isReady ? 'READY!' : 'Click to Ready Up'}
          </button>
        </div>

      </div>
    </div>
  );
}

function ActiveTurnView({ hitsterData, isHost, user, HTFN }: any) {
  const me = hitsterData.players[String(user?.id)];
  const myTeamId = me?.teamId;
  const isActiveTeam = myTeamId === hitsterData.currentTurnTeamId;
  const activeTeam = hitsterData.teams[hitsterData.currentTurnTeamId!];
  const phase = hitsterData.turnState?.phase;

  const [guessInput, setGuessInput] = useState("");

  const handleGuessSubmit = () => {
    if (guessInput.trim()) {
      HTFN.guessName(guessInput);
      setGuessInput("");
    }
  };

  const isMyTeamGuessingName =
    (phase === 'NAME_GUESS_ACTIVE' && isActiveTeam) ||
    (phase === 'POSITION_GUESS' && hitsterData.turnState?.nameCallQueue[0] === myTeamId);

  const myTeamFailedName = hitsterData.turnState?.nameGuessHistory.some((h: any) => h.teamId === myTeamId);
  const myTeamInQueue = hitsterData.turnState?.nameCallQueue.includes(myTeamId);

  const queueActive = hitsterData.turnState?.nameCallQueue.length > 0;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top Section: Instructions & Interactions Side-by-Side */}
      <div className="flex flex-col lg:flex-row gap-4 shrink-0">
        
        {/* Instruction / Top Banner */}
        <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl p-6 text-center border border-white/10 shadow-xl flex flex-col justify-center items-center min-h-[160px]">
          {phase === 'NAME_GUESS_ACTIVE' && (
            <>
              <h2 className="text-3xl font-bold mb-2">Guess the Name!</h2>
              <p className="text-gray-300">
                {isActiveTeam ? "It's your turn! Guess the exact Artist and Song Title to win a token." : `Waiting for ${activeTeam?.name} to guess the name...`}
              </p>
            </>
          )}
          {phase === 'POSITION_GUESS' && (
            <>
              <h2 className="text-3xl font-bold mb-2">Place the Card!</h2>
              <p className="text-gray-300">
                {isActiveTeam
                  ? (queueActive ? `Blocked! Another team is trying to steal the name!` : "Place the song chronologically in your timeline.")
                  : "Watch closely! Hit 'Call' if you know the name to steal the token."}
              </p>
            </>
          )}
          {phase === 'POSITION_CHALLENGE' && (
            <>
              <h2 className="text-3xl font-bold mb-2 text-yellow-400 animate-pulse">Challenge Phase!</h2>
              <p className="text-gray-300">
                {isActiveTeam ? "You locked your guess. Watch out for challengers!" : "Do you think they are wrong? Spend a token to challenge!"}
              </p>
            </>
          )}
          {phase === 'REVEAL' && (
            <>
              <h2 className="text-4xl font-extrabold mb-2 text-green-400">Reveal!</h2>
              <p className="text-xl">The song was <span className="font-bold text-white">{hitsterData.currentSong?.artist} - {hitsterData.currentSong?.title}</span> ({hitsterData.currentSong?.year})</p>
            </>
          )}
        </div>

        {/* Interaction Panel */}
        <div className="flex-[1.5] bg-black/20 rounded-2xl p-6 border border-white/5 flex flex-col justify-center relative overflow-hidden min-h-[160px]">
          {phase !== 'REVEAL' ? (
            <>
              {isMyTeamGuessingName ? (
                <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
                  <input
                    type="text"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGuessSubmit()}
                    placeholder="Artist - Song Title"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-lg text-white focus:outline-none focus:border-pink-500 text-center shadow-inner"
                  />
                  <div className="flex gap-4 w-full">
                    <button onClick={handleGuessSubmit} className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 py-3 rounded-xl font-bold hover:scale-[1.02] transition shadow-lg">Submit Guess</button>
                    {phase === 'NAME_GUESS_ACTIVE' && isActiveTeam && (
                      <button onClick={() => HTFN.passName()} className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-xl font-bold transition">Pass</button>
                    )}
                  </div>
                </div>
              ) : phase === 'POSITION_GUESS' && !isActiveTeam && !myTeamFailedName && !hitsterData.turnState?.nameGuessedCorrectly && !myTeamInQueue ? (
                <div className="text-center">
                  <button onClick={() => HTFN.callName()} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-10 py-3 rounded-full font-black text-xl hover:scale-105 transition shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                    CALL! I KNOW IT!
                  </button>
                </div>
              ) : phase === 'POSITION_CHALLENGE' && !isActiveTeam ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Cost: 1 Token</span>
                  {hitsterData.stealRule === 'BAD_GUESS' ? (
                    <button onClick={() => HTFN.challengePosition('BAD_GUESS')} className="bg-red-600/90 px-8 py-3 rounded-xl font-bold hover:bg-red-500 transition shadow-lg">
                      Challenge: They are wrong!
                    </button>
                  ) : (
                    <div className="flex gap-4">
                      <button onClick={() => HTFN.challengePosition('LOWER')} className="bg-blue-600/90 px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg">Challenge: Older</button>
                      <button onClick={() => HTFN.challengePosition('HIGHER')} className="bg-green-600/90 px-8 py-3 rounded-xl font-bold hover:bg-green-500 transition shadow-lg">Challenge: Newer</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 italic">No actions available for you right now.</div>
              )}
            </>
          ) : (
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Guess Logs</h3>
                {isHost && (
                  <button onClick={() => HTFN.nextTurn()} className="bg-gradient-to-r from-pink-600 to-purple-600 px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition">
                    Start Next Turn
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {hitsterData.turnState?.nameGuessHistory.map((h: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                    <div className="text-sm">
                      <span className="font-bold text-gray-300">{hitsterData.teams[h.teamId]?.name}:</span>
                      <span className="ml-2 line-through text-red-400">{h.guessText}</span>
                    </div>
                    {isHost && (
                      <button onClick={() => HTFN.hostOverrideName(h.teamId)} className="bg-green-600/80 hover:bg-green-500 text-[10px] uppercase font-bold px-2 py-1 rounded transition">
                        Override
                      </button>
                    )}
                  </div>
                ))}
                {hitsterData.turnState?.nameGuessHistory.length === 0 && (
                  <div className="text-gray-500 italic text-sm">No incorrect guesses made.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Timelines Grid */}
      <div className="flex-1 min-h-0 bg-black/10 rounded-3xl border border-white/5 p-4 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
          {hitsterData.teamOrder.map((teamId: string) => (
            <TimelineView
              key={teamId}
              team={hitsterData.teams[teamId]}
              hitsterData={hitsterData}
              isActiveTeam={teamId === hitsterData.currentTurnTeamId}
              isMyTeam={teamId === myTeamId}
              HTFN={HTFN}
              user={user}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineView({ team, hitsterData, isActiveTeam, isMyTeam, HTFN, user }: any) {
  const [confirmLockIndex, setConfirmLockIndex] = useState<number | null>(null);
  const phase = hitsterData.turnState?.phase;
  const isLeader = team.leaderId === String(user?.id);
  const isPositionGuessingPhase = phase === 'POSITION_GUESS' && isActiveTeam && isMyTeam;
  const isBlocked = hitsterData.turnState?.nameCallQueue.length > 0;
  const proposedIndex = hitsterData.turnState?.activeTeamProposedIndex;

  const canInteract = isPositionGuessingPhase && !isBlocked;
  const canLock = canInteract && isLeader;
  const canSuggest = canInteract && !isLeader;

  const insertPoints = Array.from({ length: team.timeline.length + 1 }, (_, i) => i);

  return (
    <div className={`bg-white/5 rounded-2xl p-4 border flex flex-col h-full ${isActiveTeam ? 'border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.15)] bg-pink-900/10' : 'border-white/5'}`}>
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h3 className="text-lg font-bold flex items-center gap-2">
          {team.name}
          {isActiveTeam && <span className="text-[10px] bg-pink-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(236,72,153,0.5)]">Active</span>}
        </h3>
        <div className="text-pink-300 font-bold bg-pink-900/40 px-3 py-0.5 text-sm rounded-full border border-pink-500/30">
          Tokens: {team.tokens}
        </div>
      </div>

      <div className="relative flex-1 bg-black/40 rounded-xl p-3 flex items-center">
        {isPositionGuessingPhase && isBlocked && (
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <span className="text-sm font-bold text-white bg-red-600/90 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)]">Blocked by Caller</span>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto items-center w-full min-h-[140px] custom-scrollbar pb-2">
          {insertPoints.map((index) => {
            const suggestions = team.proposedGuesses?.filter((g: any) => g.index === index) || [];
            
            return (
            <React.Fragment key={`insert-${index}`}>
              {isPositionGuessingPhase && (
                <div className="shrink-0 flex flex-col items-center justify-center w-24 h-32 relative">
                  {suggestions.length > 0 && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center gap-1 z-10 pointer-events-none p-1">
                      {suggestions.map((s: any) => {
                        const pName = hitsterData.players[s.playerId]?.name || "Unknown";
                        return (
                          <div key={s.playerId} className="bg-blue-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap max-w-full overflow-hidden text-ellipsis border border-blue-400/50">
                            {pName}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {canLock && (
                    <button
                      onClick={() => {
                        if (confirmLockIndex === index) {
                          HTFN.lockPosition(index);
                          setConfirmLockIndex(null);
                        } else {
                          setConfirmLockIndex(index);
                        }
                      }}
                      onMouseLeave={() => {
                        if (confirmLockIndex === index) {
                          setConfirmLockIndex(null);
                        }
                      }}
                      className={`w-full h-full border-2 border-dashed rounded-lg transition flex flex-col items-center justify-center group relative z-20 ${confirmLockIndex === index ? 'border-yellow-400 bg-yellow-500/20 text-yellow-400' : suggestions.length > 0 ? 'border-blue-400 bg-blue-500/10 hover:border-pink-400 text-pink-400' : 'border-pink-500/40 hover:border-pink-400 text-pink-400'} hover:text-white`}
                    >
                      <div className={`absolute inset-0 transition pointer-events-none rounded-lg ${confirmLockIndex === index ? 'bg-black/80' : 'bg-black/0 group-hover:bg-black/70'}`} />
                      <span className={`transition text-sm font-bold uppercase tracking-wider relative z-30 drop-shadow-md text-center ${confirmLockIndex === index ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100'}`}>
                        {confirmLockIndex === index ? 'Confirm' : 'Lock'}
                      </span>
                    </button>
                  )}
                  {canSuggest && (
                    <button
                      onClick={() => HTFN.proposeGuess(index)}
                      className={`w-full h-full border-2 border-dashed rounded-lg transition flex flex-col items-center justify-center group relative z-20 ${suggestions.find((s:any)=>s.playerId === String(user?.id)) ? 'border-blue-500 bg-blue-500/20' : 'border-blue-500/40 hover:border-blue-400'} text-blue-400 hover:text-white`}
                    >
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition pointer-events-none rounded-lg" />
                      <span className="opacity-0 group-hover:opacity-100 transition text-xs font-bold uppercase tracking-wider relative z-30 drop-shadow-md">Suggest</span>
                    </button>
                  )}
                </div>
              )}

              {!isPositionGuessingPhase && isActiveTeam && proposedIndex === index && phase !== 'REVEAL' && (
                <div className="shrink-0 w-24 h-32 bg-pink-600/20 border-2 border-pink-500 rounded-lg flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                  <span className="text-pink-300 font-bold text-xs rotate-90 whitespace-nowrap uppercase tracking-widest">Locked</span>
                </div>
              )}

              {index < team.timeline.length && (
                <div className="shrink-0 w-24 h-32 bg-black rounded-lg overflow-hidden relative shadow-lg group hover:-translate-y-1 transition-transform">
                  <img src={team.timeline[index].card.albumCover} className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-1.5 text-center">
                    <span className="text-lg font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">{team.timeline[index].card.year}</span>
                    <span className="text-[9px] font-medium text-gray-300 drop-shadow-[0_1px_1px_rgba(0,0,0,1)] line-clamp-2 mt-1 leading-tight">{team.timeline[index].card.title}</span>
                  </div>
                </div>
              )}
            </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}