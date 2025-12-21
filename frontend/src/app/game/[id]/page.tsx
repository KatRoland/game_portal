'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/contexts/UserContext';
import { createWS, getWSClient, WSClient } from '@/lib/ws'
import QA from '@/components/games/QA';
import MusicQuiz from '@/components/games/musicquiz';
import BTN from '@/components/games/BTN';
import CrossGame from '@/components/games/CrossGame';
import EndGame from '@/components/games/EndGame';
import { GameQuestion, Game, Score, Scoreboard, GameFN, MQFN, KSFN, Karaoke_Solo, KaraokeVote, KDFN, SOP_FN, SOPPL_FN, SOPPLItem } from '@/types';
import KaraokeSolo from '@/components/games/karaokesolo';
import KaraokeDuett from '@/components/games/karaokeduett';
import SmashOrPass from '@/components/games/SmashOrPass';
import SmashOrPassPlaylist from '@/components/games/SmashOrPassPlaylist';



export default function GamePage() {
  const router = useRouter()
  const { id: pid } = useParams();
  const { user, loading } = useUser()
  const [id, setId] = useState(pid);
  const [questionTitle, setQuestionTitle] = useState('');
  const [question, setQuestion] = useState<GameQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const isHost = user?.isAdmin || false;
  const wsRef = useRef<WSClient | null>(getWSClient())
  const [connecting, setConnecting] = useState(true)
  const [gameData, setGameData] = useState<Game | null>(null);
  const [currentSong, setCurrentSong] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false)
  const [userRecordToPlay, setUserRecordToPlay] = useState<number | null>(null)
  const [playFinal, setPlayFinal] = useState<boolean>(false)

  const GameFN: GameFN = {
    incrementScore: (playerId: string, increment: number = 1) => {
      console.log(playerId)
      wsRef.current?.send({ type: 'game:increment_score', payload: { gameId: id, playerId, increment } });
    },
    decrementScore: (playerId: string, decrement: number = 1) => {
      wsRef.current?.send({ type: 'game:decrement_score', payload: { gameId: id, playerId, decrement } });
    },
    endGameMode: () => {
      wsRef.current?.send({ type: 'game:end_game_mode', payload: { gameId: id } });
    },
    nextGameMode: () => {
      wsRef.current?.send({ type: 'game:next_game_mode', payload: { gameId: id } });
    },
    endGame: () => {
      wsRef.current?.send({ type: 'game:end_game', payload: { gameId: id } });
    },
    finishGameAsHost: () => {
      wsRef.current?.send({ type: 'game:finish', payload: { gameId: id } });
    }
  };

  const QAFN = {
    setQuestion: (q: string) => {
      setQuestionTitle(q);
    },
    askQuestion: (q: string) => {
      console.log("Asking question:", q);
      wsRef.current?.send({ type: 'qa:ask_question', payload: { gameId: id, question: questionTitle } });
    },
    answerQuestion: (a: string) => {
      wsRef.current?.send({ type: 'qa:answer_question', payload: { gameId: id, answer: a } });
    }
  }

  const BTNFN = {
    btnClick: () => {
      wsRef.current?.send({ type: 'btn:click', payload: { gameId: id } });
    }
  }
  const MQFN: MQFN = {
    getCurrentSong: () => {
      wsRef.current?.send({ type: 'mq:get_current_song', payload: { gameId: id } });
    },
    nextSong: () => {
      wsRef.current?.send({ type: 'mq:next_song', payload: { gameId: id } });
    },
    submitAnswer: (a: string) => {
      wsRef.current?.send({ type: 'mq:submit_answer', payload: { gameId: id, answer: a } });
    },
    replaySong: () => {
      wsRef.current?.send({ type: 'mq:replay_song', payload: { gameId: id } });
    },
    acceptAnswer: (playerId: string) => {
      wsRef.current?.send({ type: 'mq:accept_answer', payload: { gameId: id, playerId } });
    },
    rejectAnswer: (playerId: string) => {
      wsRef.current?.send({ type: 'mq:decline_answer', payload: { gameId: id, playerId } });
    },
    startQuiz: () => {
      wsRef.current?.send({ type: 'mq:start', payload: { gameId: id } })
    },
    setAutoPlayState: (state: boolean) => {
      setAutoPlay(state)
    }
  }

  const KSFN: KSFN = {
    RecordCallBack: (fileUrl: string) => {
      console.log(fileUrl)
      wsRef.current?.send({ type: "ks:record_uploaded", payload: { gameId: id, fileUrl: fileUrl } });
    },
    setAutoPlayState: (state: boolean) => {
      setAutoPlay(state)
    },
    startRound: () => {
      wsRef.current?.send({ type: "ks:start_round", payload: { gameId: id } });
    },
    startPlayback: (uid: number) => {
      wsRef.current?.send({ type: "ks:request_playback", payload: { gameId: id, targetUser: uid } });
    },
    resetRTP: () => {
      setUserRecordToPlay(null);
    },
    openVote: () => {
      wsRef.current?.send({ type: "ks:open_vote", payload: { gameId: id } });
    },
    voteToPlayer: (targetId: number) => {
      wsRef.current?.send({ type: "ks:vote", payload: { gameId: id, targetId: targetId } })
    },
    nextSong: () => {
      wsRef.current?.send({ type: "ks:next_song", payload: { gameId: id } });
    }
  }

  const KDFN: KDFN = {
    RecordCallBack: (fileUrl: string) => {
      console.log(fileUrl)
      wsRef.current?.send({ type: "kd:record_uploaded", payload: { gameId: id, fileUrl: fileUrl } });
    },
    setAutoPlayState: (state: boolean) => {
      setAutoPlay(state)
    },
    startRound: () => {
      wsRef.current?.send({ type: "kd:start_round", payload: { gameId: id } });
    },
    startPlayback: (uid: number) => {
      wsRef.current?.send({ type: "kd:request_playback", payload: { gameId: id, targetUser: uid } });
    },
    resetRTP: () => {
      setUserRecordToPlay(null);
    },
    openVote: () => {
      wsRef.current?.send({ type: "kd:open_vote", payload: { gameId: id } });
    },
    voteToPlayer: (targetId: number) => {
      wsRef.current?.send({ type: "kd:vote", payload: { gameId: id, targetId: targetId } })
    },
    setPlayFinal: (state: boolean) => {
      setPlayFinal(state)
    },
    reqPlayFinal: () => {
      wsRef.current?.send({ type: "kd:playFinal", payload: { gameId: id } });
    },
    nextSong: () => {
      wsRef.current?.send({ type: "kd:next_song", payload: { gameId: id } });
    }
  }

  const SOPFN: SOP_FN = {
    start: () => { wsRef.current?.send({ type: 'sop:start', payload: { gameId: id } }) },
    submit: (title: string, fileUrl: string) => { wsRef.current?.send({ type: 'sop:submit', payload: { gameId: id, title, fileUrl } }) },
    openVoting: () => { wsRef.current?.send({ type: 'sop:open_voting', payload: { gameId: id } }) },
    vote: (targetId: string, value: 1 | -1) => { wsRef.current?.send({ type: 'sop:vote', payload: { gameId: id, targetId, value } }) },
    next: () => { wsRef.current?.send({ type: 'sop:next', payload: { gameId: id } }) },
  }

  const SOPPLFN: SOPPL_FN = {
    start: () => { wsRef.current?.send({ type: 'soppl:start', payload: { gameId: id } }) },
    setPlaylist: (items: SOPPLItem[]) => { console.warn('Use admin to set playlist'); },
    next: () => { wsRef.current?.send({ type: 'soppl:next', payload: { gameId: id } }) },
    vote: (value: 1 | -1) => { wsRef.current?.send({ type: 'soppl:vote', payload: { gameId: id, value } }) },
  }

  useEffect(() => {
    const init = async () => {

      const loadFN = () => {
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

        wsRef.current = createWS(token, 'game')

        wsRef.current.onStatus((s) => {
          if (s === 'connected') {
            try { wsRef.current?.send({ type: 'game:load', payload: { gameId: pid } }) } catch (e) { console.error(e) }
          }
        })
      }

      const declareGAMEListeners = () => {
        if (!wsRef.current) return;
        wsRef.current.on('game:not_found', (payload: any) => {
          router.push(`/lobby/${id}`);
        });

        wsRef.current.on('game:load:response', (payload: { game: any }) => {
          setGameData(payload.game);
          setId(payload.game.id)
          if (payload.game.mode == "QA" && payload.game && payload.game.currentGameModeData) {
            setQuestion(payload.game.currentGameModeData);
          }
          if (payload.game.mode == "MUSIC_QUIZ") {
            wsRef.current?.send({ type: 'mq:get_current_song', payload: { gameId: id } });
          }
        })

        wsRef.current.on('game:score_updated', (payload: any) => {
          console.log("score update")
          setGameData((prev) => {
            if (!prev) return prev;
            return { ...prev, currentGameModeData: { ...prev.currentGameModeData, Scoreboard: payload.Scoreboard } };
          });
        });

        wsRef.current.on('game:game_mode_ended', (payload: { game: Game }) => {
          setGameData(payload.game);
        });

        wsRef.current.on('game:next_game_mode_started', (payload: { game: Game }) => {
          setGameData(payload.game);
        }
        );

        wsRef.current.on('game:game_ended', (payload: { game: Game }) => {
          setGameData(payload.game);
        });

        wsRef.current.on('game:finished_response_host', (payload: { lobbyId: string }) => {
          wsRef.current?.send({ type: 'lobby:game_finished', payload: { lobbyId: payload.lobbyId } });
        });

        wsRef.current.on('game:finished_response', (payload: { gameId: string }) => {
          router.push(`/lobby/${payload.gameId}`);
        });

        wsRef.current.on('lobby:game_finished', (payload: { lobbyId: string }) => {
          router.push(`/lobby/${payload.lobbyId}`);
        }
        );
      }

      const declareQAListeners = () => {
        if (!wsRef.current) return;

        wsRef.current.on('qa:new_question', (payload: { question: GameQuestion }) => {
          setQuestion(payload.question);
        });

        wsRef.current.on('qa:update_answers', (payload: { answers: Array<{ playerId: string; playerName: string; answer: string }> }) => {
          setQuestion((prev) => {
            if (!prev) return prev;
            return { ...prev, answers: payload.answers };
          });
        });
      }

      const declareMQListeners = () => {
        if (!wsRef.current) return;

        wsRef.current.on('mq:current_song:response', (payload: { fileUrl: string }) => {
          setCurrentSong(payload.fileUrl)
        });

        wsRef.current.on('mq:started', (payload: { gameId: string }) => {
          wsRef.current?.send({ type: 'mq:get_current_song', payload: { gameId: payload.gameId } })
          setAutoPlay(true);
        });

        wsRef.current.on('mq:next_song_started', (paylaod: { currentTrackIndex: number, currentSong: string, answers: [] }) => {
          setCurrentSong(paylaod.currentSong)
          setGameData((prev) => {
            if (!prev) return prev;
            return { ...prev, currentGameModeData: { ...prev.currentGameModeData, currentTrackIndex: paylaod.currentTrackIndex, answers: paylaod.answers, replayLimitReached: false } };
          });
          setAutoPlay(true);
        })

        wsRef.current.on('mq:update_answers', (payload: { answers: Array<{ playerId: string; playerName: string; answer: string; state: string }> }) => {
          setGameData((prev) => {
            if (!prev) return prev;
            return { ...prev, currentGameModeData: { ...prev.currentGameModeData, answers: payload.answers } };
          });
        });

        wsRef.current.on('mq:update_scoreboard', (payload: { Scoreboard: { scores: Array<{ playerId: string; playerName: string; score: number }> } }) => {
          setGameData((prev) => {
            if (!prev) return prev;
            return { ...prev, currentGameModeData: { ...prev.currentGameModeData, Scoreboard: payload.Scoreboard } };
          });
        });

        wsRef.current.on('mq:replay_limit_reached', (payload: { playerId: string }) => {
          setGameData((prev) => {
            if (!prev) return prev;
            return { ...prev, currentGameModeData: { ...prev.currentGameModeData, replayLimitReached: true } };
          });
        })

        wsRef.current.on('mq:no_more_songs', (payload: { gameId: string }) => {
          wsRef.current?.send({ type: 'game:end_game_mode', payload: { gameId: payload.gameId } })
        })
      }

      const declareKSListeners = () => {
        wsRef.current?.on('ks:round_started', () => {
          setAutoPlay(true);
        })

        wsRef.current?.on('ks:round_finished', (payload: { game: Game }) => {
          setGameData(payload.game);
        })

        wsRef.current?.on('ks:force_playback', (payload: { targetUser: number }) => {
          setUserRecordToPlay(payload.targetUser);
        })

        wsRef.current?.on('ks:vote_opened', () => {
          setGameData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentGameModeData: {
                ...prev.currentGameModeData,
                isVoteOpen: true
              }
            };
          });

        })

        wsRef.current?.on('ks:update_votes', (payload: { votes: KaraokeVote[] }) => {
          setGameData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentGameModeData: {
                ...prev.currentGameModeData,
                votes: payload.votes
              }
            };
          });

        })

        wsRef.current?.on('ks:no_more_song', () => {
          wsRef.current?.send({ type: 'game:end_game_mode', payload: { gameId: id } })
        })

        wsRef.current?.on('ks:update_gamedata', (payload: { game: Game }) => {
          setGameData(payload.game)
        })

      }

      const declareKDListeners = () => {
        wsRef.current?.on('kd:round_started', () => {
          setAutoPlay(true);
        })

        wsRef.current?.on('kd:round_finished', (payload: { game: Game }) => {
          setGameData(payload.game);
        })

        wsRef.current?.on('kd:force_playback', (payload: { targetUser: number }) => {
          setUserRecordToPlay(payload.targetUser);
        })

        wsRef.current?.on('kd:vote_opened', () => {
          setGameData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentGameModeData: {
                ...prev.currentGameModeData,
                isVoteOpen: true
              }
            };
          });

        })

        wsRef.current?.on('kd:update_votes', (payload: { votes: KaraokeVote[] }) => {
          setGameData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentGameModeData: {
                ...prev.currentGameModeData,
                votes: payload.votes
              }
            };
          });

        })

        wsRef.current?.on('kd:playback_ready', (payload: { file: string }) => {
          setGameData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentGameModeData: {
                ...prev.currentGameModeData,
                finalOutput: payload.file
              }
            };
          });
        })

        wsRef.current?.on('kd:playFinal_force', () => {
          setPlayFinal(true);
        })


        wsRef.current?.on('kd:update_gamedata', (payload: { game: Game }) => {
          setGameData(payload.game)
        })

        wsRef.current?.on('kd:no_more_song', () => {
          wsRef.current?.send({ type: 'game:end_game_mode', payload: { gameId: id } })
        })

      }

      loadFN();
      declareGAMEListeners();
      declareMQListeners();
      declareQAListeners();
      declareKSListeners();
      declareKDListeners();
      wsRef.current?.on('sop:update_submissions', (payload: any) => {
        setGameData((prev) => {
          if (!prev) return prev;
          return { ...prev, currentGameModeData: { ...prev.currentGameModeData, submissions: payload.submissions } };
        });
      })
      wsRef.current?.on('sop:update_votes', (payload: any) => {
        setGameData((prev) => {
          if (!prev) return prev;
          return { ...prev, currentGameModeData: { ...prev.currentGameModeData, submissions: payload.submissions } };
        });
      })
      wsRef.current?.on('sop:voting_opened', () => {
        setGameData((prev) => {
          if (!prev) return prev;
          return { ...prev, currentGameModeData: { ...prev.currentGameModeData, isVotingOpen: true } };
        });
      })
      wsRef.current?.on('sop:round_changed', (payload: any) => {
        setGameData((prev) => {
          if (!prev) return prev;
          return { ...prev, currentGameModeData: { ...prev.currentGameModeData, currentIndex: payload.currentIndex, isVotingOpen: false } };
        });
      })
      wsRef.current?.on('soppl:playlist_set', (payload: any) => {
        setGameData((prev) => prev ? ({ ...prev, currentGameModeData: { ...prev.currentGameModeData, playlistId: payload.playlistId } }) : prev)
      })
      wsRef.current?.on('soppl:started', () => { })
      wsRef.current?.on('soppl:changed', (payload: any) => {
        setGameData((prev) => prev ? ({ ...prev, currentGameModeData: { ...prev.currentGameModeData, currentIndex: payload.currentIndex, pickerId: payload.pickerId, currentVotes: [] } }) : prev)
      })
      wsRef.current?.on('soppl:update_votes', (payload: any) => {
        setGameData((prev) => prev ? ({ ...prev, currentGameModeData: { ...prev.currentGameModeData, currentVotes: payload.votes } }) : prev)
      })

      setConnecting(false)
    }

    init()

    return () => {
      wsRef.current?.disconnect()
    }
  }, [loading, user, id])


  const handleRender = () => {
    if (gameData) {
      console.log("Current Game Data:", gameData);
      switch (gameData.mode) {
        case 'QA':
          return (
            <QA isHost={isHost} QAFN={QAFN} GameFN={GameFN} question={question} GameData={gameData} />
          );
        case "BTN":
          return (
            <BTN isHost={isHost} BTNFN={BTNFN} GameFN={GameFN} GameData={gameData} />
          );
        case 'MUSIC_QUIZ':
          return (
            <MusicQuiz isHost={isHost} GameData={gameData} MQFN={MQFN} GameFN={GameFN} currentSong={currentSong} autoPlay={autoPlay} />
          );
        case 'Karaoke_Solo':
          return (
            <KaraokeSolo isHost={isHost} GameData={gameData} KSFN={KSFN} GameFN={GameFN} currentSong={currentSong} autoPlay={autoPlay} RTP={userRecordToPlay} />
          )
        case 'Karaoke_Duett':
          return (
            <KaraokeDuett isHost={isHost} GameData={gameData} KDFN={KDFN} GameFN={GameFN} currentSong={currentSong} autoPlay={autoPlay} RTP={userRecordToPlay} playFinal={playFinal} />
          )
        case 'SMASH_OR_PASS':
          return (
            <SmashOrPass isHost={isHost} GameData={gameData} IMGRFN={SOPFN} GameFN={GameFN} />
          )
        case 'SMASH_OR_PASS_PLAYLIST':
          return (
            <SmashOrPassPlaylist isHost={isHost} GameData={gameData} SOPPLFN={SOPPLFN} GameFN={GameFN} />
          )
        case 'Cross':
          return (
            <CrossGame isHost={isHost} GameFN={GameFN} GameData={gameData} />
          );
        case "Ended":
          return (
            <EndGame isHost={isHost} GameFN={GameFN} GameData={gameData} />
          );
        default:
          return <div>Unsupported game mode.</div>;
      }
    }
  }

  return (
    <div>

      {handleRender()}

    </div>
  );
}
