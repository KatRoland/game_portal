'use client';

import React, { useState, useEffect } from 'react';
import {
  Game,
  GameFN,
  Score,
  Scoreboard,
  UNOGameRules,
  UNOCard,
  UNOCardInHand,
  UNOState,
  UNOPhaseData,
  GameMode,
  UNO_FN,
} from '@/types';
import { getUserAvatar } from '@/lib/api';
import { getUNOCardImagePath, getUNOCardBackPath } from '@/lib/unoCardHelper';
import { useUser } from '@/contexts/UserContext';

interface UNOProps {
  GameData: Game | null;
  GameFN: GameFN;
  isHost: boolean;
  UNOFN: UNO_FN;
  error: { notificationLevel: string; message: string } | null;
  clearError: () => void;
}

const DEFAULT_RULES: UNOGameRules = {
  jumpin: false,
  canPlayMultipleCards: true,
  uno: true,
  unoPenalty: 2,
  initialCards: 7,
  deckType: 'standard',
  resetCardsToDraw: false,
  drawStackingMode: 'linear',
  endCondition: 'first_to_win',
};

function groupHandCards(cards: UNOCardInHand[]) {
  const groups: { key: string; cards: UNOCardInHand[] }[] = [];
  const map = new Map<string, UNOCardInHand[]>();

  cards.forEach((card) => {
    const key = `${card.color}-${card.type}-${card.value}`;
    if (!map.has(key)) {
      map.set(key, []);
      groups.push({ key, cards: map.get(key)! });
    }
    map.get(key)!.push(card);
  });

  return groups;
}

function OtherPlayerHandDisplay({
  playerName,
  cardCount,
  hasSaidUno,
  isTurn,
}: {
  playerName: string;
  cardCount: number;
  hasSaidUno?: boolean;
  isTurn?: boolean;
}) {
  const visibleCards = Math.min(cardCount, 5);
  const extraCards = Math.max(0, cardCount - 5);

  return (
    <div
      className={`flex flex-col items-center p-4 rounded-2xl border transition-all ${isTurn
        ? 'border-yellow-400/80 bg-yellow-500/10 shadow-lg shadow-yellow-500/20 scale-105'
        : 'border-white/10 bg-white/5'
        }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold text-white text-sm">{playerName}</span>
        {hasSaidUno && (
          <span className="px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-black text-white uppercase tracking-wider shadow animate-pulse">
            UNO!
          </span>
        )}
        {isTurn && (
          <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-gray-950 text-[10px] font-extrabold uppercase">
            Turn
          </span>
        )}
      </div>

      <div className="flex items-center">
        <div className="flex items-center -space-x-4">
          {Array.from({ length: visibleCards }).map((_, i) => (
            <img
              key={i}
              src={getUNOCardBackPath()}
              alt="UNO Card Back"
              className="w-10 h-14 rounded-lg shadow-md transform hover:-translate-y-1 transition-transform object-contain pointer-events-none filter drop-shadow"
              style={{ zIndex: i + 1 }}
              title={`Card ${i + 1} of ${cardCount}`}
            />
          ))}
        </div>

        {extraCards > 0 && (
          <div className="ml-3 px-2.5 py-1 rounded-xl bg-white/15 border border-white/25 text-xs font-black text-yellow-300 shadow-md whitespace-nowrap">
            +{extraCards}
          </div>
        )}
      </div>

      <span className="mt-2 text-xs text-gray-400 font-medium">
        {cardCount} {cardCount === 1 ? 'Card' : 'Cards'}
      </span>
    </div>
  );
}

export default function UNO({ GameData, GameFN, isHost, UNOFN, error, clearError }: UNOProps) {
  const { endGame, endGameMode, nextGameMode } = GameFN;
  const { user } = useUser();
  const currentUserId = user?.id ? String(user.id) : null;

  const unoState = GameData?.currentGameModeData as UNOState | undefined;

  const [activeScreen, setActiveScreen] = useState<'lobby' | 'gameplay' | 'end'>('lobby');
  const [rules, setRules] = useState<UNOGameRules>(() => unoState?.gameRules || DEFAULT_RULES);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => clearError(), 4000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  useEffect(() => {
    if (unoState?.gameRules) {
      setRules(unoState.gameRules);
    }
  }, [unoState?.gameRules]);

  useEffect(() => {
    const phase = unoState?.state?.activePhase;
    if (phase === 'play' || phase === 'draw' || phase === 'choose_color' || phase === 'draw_pending') {
      setActiveScreen('gameplay');
    } else if (phase === 'round_ended') {
      setActiveScreen('end');
    } else {
      setActiveScreen('lobby');
    }
  }, [unoState?.state?.activePhase, GameData?.mode]);

  // const sendSettingsWS = (updatedRules: UNOGameRules) => {
  //   if (isHost && GameData?.id) {
  //     getWSClient()?.send({
  //       type: 'uno:update_settings',
  //       payload: { gameId: GameData.id, rules: updatedRules },
  //     });
  //   }
  // };

  const handleRuleToggle = (key: keyof UNOGameRules) => {
    if (!isHost) return;
    if (typeof rules[key] === 'boolean') {
      const updated = { ...rules, [key]: !rules[key] };
      setRules(updated);
      // sendSettingsWS(updated);
    }
  };

  const handleRuleChange = (key: keyof UNOGameRules, value: any) => {
    if (!isHost) return;
    const updated = { ...rules, [key]: value };
    setRules(updated);
    // sendSettingsWS(updated);
  };

  const handleStartRound = () => {
    if (isHost && GameData?.id) {
      UNOFN.start(rules)
    }
  };

  const playersMap = unoState?.players || {};
  const playerOrder = unoState?.playerOrderIds || [];
  const userPlayerData = currentUserId && playersMap[currentUserId] ? playersMap[currentUserId] : null;
  const userHand: UNOCardInHand[] = userPlayerData?.cards || [];
  const groupedUserHand = groupHandCards(userHand);

  const topCard: UNOCard | null = unoState?.topCard || null;
  const drawPileCount: number = unoState?.drawPile?.length ?? 0;
  const isClockwise = (unoState?.state?.direction ?? 1) === 1;

  const otherPlayers = playerOrder
    .filter((id) => id !== currentUserId)
    .map((id) => {
      const p = playersMap[id];
      return {
        id,
        name: p?.name || 'Player',
        cardCount: p?.cards?.length || 0,
        hasSaidUno: p?.hasSaidUno || false,
        isTurn: unoState?.currentTurnPlayerId === id,
      };
    });

  const otherPlayersList =
    otherPlayers.length > 0
      ? otherPlayers
      : (GameData?.lobby?.players || [])
        .filter((p) => String(p.id) !== currentUserId)
        .map((p) => ({
          id: String(p.id),
          name: p.username || 'Player',
          cardCount: 0,
          hasSaidUno: false,
          isTurn: false,
        }));

  const winnerId = unoState?.playersWhoOut?.[0]?.playerId;
  const winnerName = winnerId && playersMap[winnerId] ? playersMap[winnerId].name : 'Winner';

  const handlePlayCard = (cardIds: string[]) => {
    UNOFN.playCard(cardIds);
  };

  const handleDrawCard = () => {
    UNOFN.drawCard();
  };

  const handleSayUno = () => {
    UNOFN.sayUno();
  };

  const handleChooseColor = (color: 'red' | 'green' | 'blue' | 'yellow') => {
    UNOFN.chooseColor(color);
  };

  const isMyTurn = currentUserId === unoState?.currentTurnPlayerId;
  const currentPhase = unoState?.state?.activePhaseData?.phase;
  const showColorPicker = currentPhase === 'choose_color' && isMyTurn;
  const isDrawPending = currentPhase === 'draw_pending';
  const drawPendingData = isDrawPending
    ? (unoState?.state?.activePhaseData as { phase: 'draw_pending'; drawAmount: number; drawType: 'draw2' | 'draw4' })
    : null;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-900 to-black text-gray-100">
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-fadeIn">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-red-500/40 bg-red-950/90 backdrop-blur-xl shadow-2xl shadow-red-900/30">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-red-200">{error.message.replace(/_/g, ' ')}</span>
            <button onClick={clearError} className="ml-2 text-red-400 hover:text-red-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 via-yellow-500 to-blue-600 text-white shadow-lg shadow-red-900/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path d="M11.7 2.805a.75.75 0 0 1 .6 0A60.65 60.65 0 0 1 22.83 8.72a.75.75 0 0 1-.231 1.337 49.948 49.948 0 0 0-9.902 3.912l-.003.002-.34.18a.75.75 0 0 1-.707 0A50.89 50.89 0 0 0 1.37 9.873a.75.75 0 0 1-.233-1.338 60.653 60.653 0 0 1 10.563-5.73Z" />
                <path d="M11.233 15.698a.75.75 0 0 1 .792-.047l.217.11a50.89 50.89 0 0 0 10.37-4.148c.553-.298 1.189.262 .959.855a60.777 60.777 0 0 1-10.874 18.06.75.75 0 0 1-1.127-.075 60.772 60.772 0 0 1-10.835-18.172c-.23-.593.406-1.153.959-.854a50.938 50.938 0 0 0 10.539 4.271Z" />
              </svg>
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-yellow-400 to-blue-400">
                  UNO Card Game
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                {isHost ? 'Host Controls' : 'Game Controls'}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => endGameMode()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-semibold shadow-lg shadow-red-900/30 hover:shadow-red-900/50 transition-all active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
                End Gamemode
              </button>
              <button
                onClick={() => endGame()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-white/10 text-white text-sm font-semibold shadow-lg hover:border-white/20 transition-all active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 text-gray-300"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
                    clipRule="evenodd"
                  />
                </svg>
                End Game
              </button>
            </div>
          </div>
        </div>

        {activeScreen === 'lobby' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Lobby Settings
                  </h2>
                  <p className="text-sm text-gray-400">
                    {isHost ? 'Configure rules for the UNO match' : 'Host is configuring match settings'}
                  </p>
                </div>
                {isHost ? (
                  <button
                    onClick={handleStartRound}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all"
                  >
                    Start Round (Launch Gameplay) →
                  </button>
                ) : (
                  <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm font-semibold text-gray-300 animate-pulse">
                    Waiting for Host to start...
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-gray-800/50 border border-white/10">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Initial Cards: <span className="text-yellow-400">{rules.initialCards}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    disabled={!isHost}
                    value={rules.initialCards}
                    onChange={(e) =>
                      handleRuleChange('initialCards', parseInt(e.target.value))
                    }
                    className="w-full accent-yellow-400 cursor-pointer disabled:opacity-50"
                  />
                </div>

                <div className="p-4 rounded-xl bg-gray-800/50 border border-white/10">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    UNO Penalty: <span className="text-red-400">{rules.unoPenalty} cards</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    disabled={!isHost}
                    value={rules.unoPenalty}
                    onChange={(e) =>
                      handleRuleChange('unoPenalty', parseInt(e.target.value))
                    }
                    className="w-full accent-red-500 cursor-pointer disabled:opacity-50"
                  />
                </div>

                <div className="p-4 rounded-xl bg-gray-800/50 border border-white/10">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Deck Type
                  </label>
                  <select
                    disabled={!isHost}
                    value={rules.deckType}
                    onChange={(e) =>
                      handleRuleChange('deckType', e.target.value as 'standard' | 'infinite')
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-white/15 text-white text-sm disabled:opacity-50"
                  >
                    <option value="standard">Standard Deck (108 Cards)</option>
                    <option value="infinite">Infinite Deck</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-gray-800/50 border border-white/10">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Draw Stacking Mode
                  </label>
                  <select
                    disabled={!isHost}
                    value={rules.drawStackingMode}
                    onChange={(e) =>
                      handleRuleChange('drawStackingMode', e.target.value as 'linear' | 'multiply')
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-white/15 text-white text-sm disabled:opacity-50"
                  >
                    <option value="linear">Linear</option>
                    <option value="multiply">Multiply</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-gray-800/50 border border-white/10">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    End Condition
                  </label>
                  <select
                    disabled={!isHost}
                    value={rules.endCondition}
                    onChange={(e) =>
                      handleRuleChange('endCondition', e.target.value as 'first_to_win' | 'last_standing')
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-white/15 text-white text-sm disabled:opacity-50"
                  >
                    <option value="first_to_win">First to Win</option>
                    <option value="last_standing">Last Man Standing</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-gray-800/50 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-300">Jump-In Allowed</span>
                    <input
                      type="checkbox"
                      disabled={!isHost}
                      checked={rules.jumpin}
                      onChange={() => handleRuleToggle('jumpin')}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-300">Play Multiple Cards</span>
                    <input
                      type="checkbox"
                      disabled={!isHost}
                      checked={rules.canPlayMultipleCards}
                      onChange={() => handleRuleToggle('canPlayMultipleCards')}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-300">Require Say UNO</span>
                    <input
                      type="checkbox"
                      disabled={!isHost}
                      checked={rules.uno}
                      onChange={() => handleRuleToggle('uno')}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4">
                Players in Lobby
              </h3>
              <div className="flex flex-wrap gap-4">
                {GameData?.lobby?.players && GameData.lobby.players.length > 0 ? (
                  GameData.lobby.players.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-800/80 border border-white/10"
                    >
                      <img
                        src={getUserAvatar(String(p.id))}
                        alt={p.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="text-sm font-medium text-white">
                        {p.username}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">
                    Waiting for players to join the lobby...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeScreen === 'gameplay' && (
          <div className="space-y-8 animate-fadeIn">
            {showColorPicker && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="rounded-3xl border border-white/20 bg-gray-900/95 backdrop-blur-xl p-8 shadow-2xl max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold text-white text-center mb-2">
                    Choose a Color
                  </h3>
                  <p className="text-sm text-gray-400 text-center mb-6">
                    {(unoState?.state?.activePhaseData as any)?.pendingCard?.type === 'draw4'
                      ? 'Next player will draw 4 cards!'
                      : 'Pick the color for the wild card'}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { color: 'red' as const, bg: 'from-red-600 to-red-700', hover: 'hover:from-red-500 hover:to-red-600', shadow: 'shadow-red-900/50', label: 'Red' },
                      { color: 'blue' as const, bg: 'from-blue-600 to-blue-700', hover: 'hover:from-blue-500 hover:to-blue-600', shadow: 'shadow-blue-900/50', label: 'Blue' },
                      { color: 'green' as const, bg: 'from-green-600 to-green-700', hover: 'hover:from-green-500 hover:to-green-600', shadow: 'shadow-green-900/50', label: 'Green' },
                      { color: 'yellow' as const, bg: 'from-yellow-500 to-yellow-600', hover: 'hover:from-yellow-400 hover:to-yellow-500', shadow: 'shadow-yellow-900/50', label: 'Yellow' },
                    ].map(({ color, bg, hover, shadow, label }) => (
                      <button
                        key={color}
                        onClick={() => handleChooseColor(color)}
                        className={`py-6 rounded-2xl bg-gradient-to-br ${bg} ${hover} text-white font-black text-lg uppercase tracking-wider shadow-lg ${shadow} transition-all active:scale-95 hover:scale-105`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Turn & Action Indicator */}
            <div
              className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${isDrawPending && isMyTurn
                ? 'border-red-500/60 bg-gradient-to-r from-red-950/60 via-rose-900/40 to-red-950/60 shadow-xl shadow-red-900/20 animate-pulse'
                : isDrawPending && !isMyTurn
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : isMyTurn
                    ? 'border-yellow-400/60 bg-yellow-500/10 text-yellow-300 shadow-lg shadow-yellow-500/10'
                    : 'border-white/10 bg-white/5 text-gray-400'
                }`}
            >
              <div className="flex items-center gap-3 text-center sm:text-left">
                <span className="text-2xl flex-shrink-0">
                  {isDrawPending ? '⚡' : isMyTurn ? '🎯' : '⏳'}
                </span>
                <div>
                  <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2 justify-center sm:justify-start">
                    {isDrawPending && isMyTurn ? (
                      <span className="text-red-400 font-extrabold uppercase tracking-wide">
                        Draw Stack Pending: +{drawPendingData?.drawAmount} Cards!
                      </span>
                    ) : isDrawPending && !isMyTurn ? (
                      <span>
                        {unoState?.players?.[unoState?.currentTurnPlayerId]?.name || 'Player'} must draw{' '}
                        <span className="text-amber-400 font-bold">+{drawPendingData?.drawAmount}</span> or counter
                      </span>
                    ) : isMyTurn ? (
                      <span>Your Turn — Play a card or draw!</span>
                    ) : (
                      <span>Waiting for {unoState?.players?.[unoState?.currentTurnPlayerId]?.name || 'other player'}...</span>
                    )}
                  </div>
                  {isDrawPending && isMyTurn && (
                    <p className="text-xs text-gray-300 mt-0.5">
                      Play a <span className="font-bold text-yellow-300">{drawPendingData?.drawType === 'draw2' ? 'Draw 2' : 'Draw 4'}</span> from your hand to stack, or take the cards.
                    </p>
                  )}
                </div>
              </div>

              {isDrawPending && isMyTurn && (
                <button
                  onClick={handleDrawCard}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-red-900/50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  Accept & Draw +{drawPendingData?.drawAmount}
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">
                  Other Players
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {otherPlayersList.map((player) => (
                  <OtherPlayerHandDisplay
                    key={player.id}
                    playerName={player.name}
                    cardCount={player.cardCount}
                    hasSaidUno={player.hasSaidUno}
                    isTurn={player.isTurn}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/80 via-gray-900/80 to-black p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 font-black text-xl">
                    {isClockwise ? '↻' : '↺'}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">
                      {isClockwise ? 'Clockwise Order' : 'Reversed Turn Order'}
                    </h4>
                    <p className="text-xs text-gray-400">
                      Active Color:{' '}
                      <span className="font-bold uppercase text-yellow-400">
                        {topCard?.color || 'Wild'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-gray-400 mb-2">
                      Top Card
                    </span>
                    {topCard ? (
                      <img
                        src={getUNOCardImagePath(topCard)}
                        alt="Top Card"
                        className="w-24 h-36 rounded-xl shadow-2xl transform hover:scale-105 transition-transform object-contain filter drop-shadow-xl cursor-pointer"
                      />
                    ) : (
                      <div className="w-24 h-36 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-xs text-gray-500">
                        No Card
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-gray-400 mb-2">
                      Draw Pile ({drawPileCount})
                    </span>
                    <div
                      onClick={handleDrawCard}
                      className="relative cursor-pointer hover:-translate-y-1 transition-transform group"
                    >
                      <div className="absolute top-1 left-1 w-24 h-36 rounded-xl bg-gray-900 border border-white/10 opacity-60 pointer-events-none"></div>
                      <div className="absolute top-0.5 left-0.5 w-24 h-36 rounded-xl bg-gray-800 border border-white/15 opacity-80 pointer-events-none"></div>
                      <img
                        src={getUNOCardBackPath()}
                        alt="Draw Pile"
                        className="relative w-24 h-36 rounded-xl shadow-2xl object-contain filter drop-shadow-xl hover:brightness-110 active:scale-95 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {isHost && (
                    <button
                      onClick={() => setActiveScreen('end')}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-purple-900/40 transition-all"
                    >
                      End Round →
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">
                  Your Hand ({userHand.length} Cards Total)
                </h3>
                <button
                  onClick={handleSayUno}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-900/40 animate-pulse"
                >
                  Say UNO!
                </button>
              </div>

              {userHand.length > 0 ? (
                <div className="flex flex-wrap items-end gap-6 pt-4 pb-2">
                  {groupedUserHand.map((group) => {
                    const stackCount = group.cards.length;
                    const offsetPx = 14;
                    const baseWidth = 84;
                    const baseHeight = 124;
                    const totalWidth = baseWidth + (stackCount - 1) * offsetPx;
                    const totalHeight = baseHeight + (stackCount - 1) * offsetPx;

                    return (
                      <div
                        key={group.key}
                        onClick={() => {
                          if (group.cards[0]?.id) handlePlayCard([group.cards[0].id]);
                        }}
                        className="relative transition-transform hover:-translate-y-2 cursor-pointer select-none group"
                        style={{
                          width: `${totalWidth}px`,
                          height: `${totalHeight}px`,
                        }}
                      >
                        {group.cards.map((card, idx) => {
                          const isTopCard = idx === stackCount - 1;
                          return (
                            <div
                              key={card.id || idx}
                              className="absolute w-20 h-28 transform transition-transform filter drop-shadow-md"
                              style={{
                                top: `${idx * offsetPx}px`,
                                left: `${idx * offsetPx}px`,
                                zIndex: idx + 1,
                              }}
                            >
                              <img
                                src={getUNOCardImagePath(card)}
                                alt={`${card.color} ${card.value}`}
                                className="w-full h-full object-contain pointer-events-none rounded-lg"
                              />
                              {isTopCard && stackCount > 1 && (
                                <span
                                  onClick={rules.canPlayMultipleCards ? (e) => {
                                    e.stopPropagation();
                                    const ids = group.cards.map(c => c.id).filter(Boolean);
                                    if (ids.length > 0) handlePlayCard(ids);
                                  } : undefined}
                                  className={`absolute -top-2 -right-2 bg-yellow-400 text-gray-950 text-xs font-black px-2 py-0.5 rounded-full shadow-lg border border-yellow-300 z-20${rules.canPlayMultipleCards ? ' cursor-pointer hover:bg-green-400 hover:scale-110 hover:border-green-300 transition-all' : ''
                                    }`}
                                  title={rules.canPlayMultipleCards ? `Play all ${stackCount}` : `${stackCount} cards`}
                                >
                                  {rules.canPlayMultipleCards ? `▶ ×${stackCount}` : `×${stackCount}`}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-4">No cards in your hand.</p>
              )}
            </div>
          </div>
        )}

        {activeScreen === 'end' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="rounded-2xl border border-yellow-400/40 bg-gradient-to-br from-yellow-500/20 via-amber-600/10 to-gray-900 p-8 shadow-2xl text-center">
              <span className="inline-block px-4 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 font-extrabold text-xs uppercase tracking-widest mb-3">
                Round Finished
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">
                Winner: <span className="text-yellow-400">{winnerName}</span>!
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 text-xl mb-4 font-bold">
                    R
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Start a New Round
                  </h3>
                </div>
                <button
                  onClick={() => setActiveScreen('lobby')}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-900/40 transition-all"
                >
                  Start New Round
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 text-xl mb-4 font-bold">
                    &gt;
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Go to Next Gamemode
                  </h3>
                </div>
                <button
                  onClick={() => nextGameMode()}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-purple-900/40 transition-all"
                >
                  Next Gamemode
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">
                    Current Mode Scoreboard
                  </h2>
                </div>
                <div className="px-6 py-6">
                  {GameData?.currentGameModeData?.Scoreboard &&
                    (GameData.currentGameModeData.Scoreboard as Scoreboard).scores?.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-300">
                          <th className="px-3 py-2 text-left font-medium">Player</th>
                          <th className="px-3 py-2 text-left font-medium">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(GameData.currentGameModeData.Scoreboard as Scoreboard).scores.map(
                          (score: Score) => (
                            <tr key={score.playerId} className="border-t border-white/10 hover:bg-white/5">
                              <td className="px-3 py-2 flex items-center gap-3">
                                <img
                                  src={getUserAvatar(score.playerId)}
                                  alt={`${score.playerName}'s avatar`}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                                <span className="font-medium text-white">{score.playerName}</span>
                              </td>
                              <td className="px-3 py-2 text-gray-200">{score.score}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-400 text-sm">
                      No scores available yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">
                    Overall Scoreboard
                  </h2>
                </div>
                <div className="px-6 py-6">
                  {GameData?.Scoreboard &&
                    (GameData.Scoreboard as Scoreboard).scores?.length > 0 ? (
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
                              <img
                                src={getUserAvatar(score.playerId)}
                                alt={`${score.playerName}'s avatar`}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                              <span className="font-medium text-white">{score.playerName}</span>
                            </td>
                            <td className="px-3 py-2 text-gray-200">{score.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-400 text-sm">
                      No overall scores available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
