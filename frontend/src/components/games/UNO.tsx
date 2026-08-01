'use client';

import React, { useState } from 'react';
import {
  Game,
  GameFN,
  Score,
  Scoreboard,
  UNOGameRules,
  UNOCardInHand,
  UNOState,
} from '@/types';
import { getUserAvatar } from '@/lib/api';

interface UNOProps {
  GameData: Game | null;
  GameFN: GameFN;
  isHost: boolean;
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

const MOCK_OTHER_PLAYERS = [
  { id: '2', name: 'Alice', cardCount: 3, hasSaidUno: false, isTurn: true },
  { id: '3', name: 'Bob', cardCount: 8, hasSaidUno: false, isTurn: false },
  { id: '4', name: 'Charlie', cardCount: 1, hasSaidUno: true, isTurn: false },
];

const MOCK_USER_HAND: UNOCardInHand[] = [
  { id: 'c1', color: 'red', type: 'number', value: 7 },
  { id: 'c2', color: 'red', type: 'number', value: 7 },
  { id: 'c3', color: 'yellow', type: 'reverse', value: 'reverse' },
  { id: 'c4', color: 'yellow', type: 'reverse', value: 'reverse' },
  { id: 'c5', color: 'yellow', type: 'reverse', value: 'reverse' },
  { id: 'c6', color: 'green', type: 'draw2', value: 'draw2' },
  { id: 'c7', color: 'blue', type: 'number', value: 9 },
  { id: 'c8', color: 'wild', type: 'draw4', value: 'draw4' },
];

function getCardColorClass(color: string) {
  switch (color) {
    case 'red':
      return 'bg-gradient-to-br from-red-600 to-red-800 border-red-400 text-white';
    case 'yellow':
      return 'bg-gradient-to-br from-amber-500 to-yellow-600 border-yellow-300 text-gray-950';
    case 'green':
      return 'bg-gradient-to-br from-emerald-600 to-green-800 border-green-400 text-white';
    case 'blue':
      return 'bg-gradient-to-br from-blue-600 to-indigo-800 border-blue-400 text-white';
    case 'wild':
    default:
      return 'bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-700 border-pink-400 text-white';
  }
}

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
          <span className="px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-black text-white uppercase tracking-wider animate-pulse shadow">
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
        <div className="flex items-center -space-x-3">
          {Array.from({ length: visibleCards }).map((_, i) => (
            <div
              key={i}
              className="w-10 h-14 rounded-lg bg-gradient-to-br from-red-600 via-gray-900 to-black border border-red-400/50 shadow-md flex items-center justify-center transform hover:-translate-y-1 transition-transform"
              style={{ zIndex: i + 1 }}
              title={`Card ${i + 1} of ${cardCount}`}
            >
              <div className="w-6 h-9 rounded-full border border-yellow-400/40 bg-red-500/20 flex items-center justify-center transform -rotate-12">
                <span className="text-[7px] font-black text-yellow-300 tracking-tighter">
                  UNO
                </span>
              </div>
            </div>
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

export default function UNO({ GameData, GameFN, isHost }: UNOProps) {
  const { endGame, endGameMode, nextGameMode } = GameFN;

  const [activeScreen, setActiveScreen] = useState<'lobby' | 'gameplay' | 'end'>(
    'lobby'
  );

  const [rules, setRules] = useState<UNOGameRules>(DEFAULT_RULES);

  const groupedUserHand = groupHandCards(MOCK_USER_HAND);

  const handleRuleToggle = (key: keyof UNOGameRules) => {
    if (typeof rules[key] === 'boolean') {
      setRules((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleRuleChange = (
    key: keyof UNOGameRules,
    value: number | string
  ) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-900 to-black text-gray-100">
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-yellow-400 to-blue-400">
                    UNO Card Game
                  </span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-gray-300">
                  Teszt
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Current Phase: <strong className="text-white uppercase">{activeScreen}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl backdrop-blur-md">
            <button
              onClick={() => setActiveScreen('lobby')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeScreen === 'lobby'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              1. Lobby & Settings
            </button>
            <button
              onClick={() => setActiveScreen('gameplay')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeScreen === 'gameplay'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              2. Gameplay Loop
            </button>
            <button
              onClick={() => setActiveScreen('end')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeScreen === 'end'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              3. End Screen
            </button>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                {isHost ? 'Host Controls' : 'Game Controls'}
              </h2>
              <p className="text-xs text-gray-400">
              </p>
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
                    Lorem
                  </p>
                </div>
                <button
                  onClick={() => setActiveScreen('gameplay')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all"
                >
                  Start Round (Launch Gameplay) →
                </button>
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
                    value={rules.initialCards}
                    onChange={(e) =>
                      handleRuleChange('initialCards', parseInt(e.target.value))
                    }
                    className="w-full accent-yellow-400 cursor-pointer"
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
                    value={rules.unoPenalty}
                    onChange={(e) =>
                      handleRuleChange('unoPenalty', parseInt(e.target.value))
                    }
                    className="w-full accent-red-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-xl bg-gray-800/50 border border-white/10">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Deck Type
                  </label>
                  <select
                    value={rules.deckType}
                    onChange={(e) =>
                      handleRuleChange('deckType', e.target.value as 'standard' | 'infinite')
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-white/15 text-white text-sm"
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
                    value={rules.drawStackingMode}
                    onChange={(e) =>
                      handleRuleChange('drawStackingMode', e.target.value as 'linear' | 'multiply')
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-white/15 text-white text-sm"
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
                    value={rules.endCondition}
                    onChange={(e) =>
                      handleRuleChange('endCondition', e.target.value as 'first_to_win' | 'last_standing')
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-white/15 text-white text-sm"
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
                      checked={rules.jumpin}
                      onChange={() => handleRuleToggle('jumpin')}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-300">Play Multiple Cards</span>
                    <input
                      type="checkbox"
                      checked={rules.canPlayMultipleCards}
                      onChange={() => handleRuleToggle('canPlayMultipleCards')}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-300">Require Say UNO</span>
                    <input
                      type="checkbox"
                      checked={rules.uno}
                      onChange={() => handleRuleToggle('uno')}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
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
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">
                  Other Players
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {MOCK_OTHER_PLAYERS.map((player) => (
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
                    ↻
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">
                      Reversed Turn Order
                    </h4>
                    <p className="text-xs text-gray-400">
                      Active Color: <span className="text-red-400 font-bold uppercase">Red</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-gray-400 mb-2">
                      Top Card
                    </span>
                    <div className="w-24 h-36 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-300 shadow-2xl flex flex-col items-center justify-center transform hover:scale-105 transition-transform">
                      <span className="text-4xl font-black text-white drop-shadow">
                        7
                      </span>
                      <span className="text-xs uppercase font-extrabold text-red-200 mt-1">
                        Red
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-gray-400 mb-2">
                      Draw Pile (104)
                    </span>
                    <div className="w-24 h-36 rounded-2xl bg-gradient-to-br from-red-600 via-gray-900 to-black border-2 border-red-500/50 shadow-2xl flex items-center justify-center cursor-pointer hover:-translate-y-1 transition-transform group">
                      <div className="w-14 h-20 rounded-full border-2 border-yellow-400/50 bg-red-600/30 flex items-center justify-center transform -rotate-12 group-hover:rotate-0 transition-transform">
                        <span className="text-base font-black text-yellow-300 tracking-tighter">
                          UNO
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <button
                    onClick={() => setActiveScreen('end')}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-purple-900/40 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">
                  Your Hand ({MOCK_USER_HAND.length} Cards Total)
                </h3>
                <button className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-900/40 animate-pulse">
                  Say UNO!
                </button>
              </div>

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
                      className="relative transition-transform hover:-translate-y-2 cursor-pointer select-none"
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
                            className={`absolute w-20 h-28 rounded-xl border-2 shadow-lg p-2 flex flex-col justify-between ${getCardColorClass(
                              card.color
                            )}`}
                            style={{
                              top: `${idx * offsetPx}px`,
                              left: `${idx * offsetPx}px`,
                              zIndex: idx + 1,
                            }}
                          >
                            <div className="text-xs font-black leading-none">
                              {card.value}
                            </div>

                            {isTopCard && (
                              <div className="text-center font-black text-xl drop-shadow">
                                {card.value}
                              </div>
                            )}

                            <div className="text-xs font-black text-right leading-none transform rotate-180">
                              {card.value}
                            </div>

                            {isTopCard && stackCount > 1 && (
                              <span className="absolute -top-2 -right-2 bg-white text-gray-950 text-xs font-black px-2 py-0.5 rounded-full shadow-lg border border-gray-300 z-20">
                                ×{stackCount}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
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
                Winner: <span className="text-yellow-400">Alice</span>!
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
                  <p className="text-sm text-gray-400 mb-6">
                  </p>
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
                  <p className="text-sm text-gray-400 mb-6">
                  </p>
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
                    (GameData.currentGameModeData.Scoreboard as Scoreboard)
                      .scores?.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-300">
                          <th className="px-3 py-2 text-left font-medium">
                            Player
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Score
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          GameData.currentGameModeData.Scoreboard as Scoreboard
                        ).scores.map((score: Score) => (
                          <tr
                            key={score.playerId}
                            className="border-t border-white/10 hover:bg-white/5"
                          >
                            <td className="px-3 py-2 flex items-center gap-3">
                              <img
                                src={getUserAvatar(score.playerId)}
                                alt={`${score.playerName}'s avatar`}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const textSpan = document.createElement(
                                    'span'
                                  );
                                  textSpan.textContent = score.playerName
                                    .charAt(0)
                                    .toUpperCase();
                                  textSpan.className =
                                    'text-lg font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 border border-white/20 px-1 rounded-full w-8 h-8 flex items-center justify-center';
                                  e.currentTarget.parentElement?.appendChild(
                                    textSpan
                                  );
                                }}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                              <span className="font-medium text-white">
                                {score.playerName}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-200">
                              {score.score}
                            </td>
                          </tr>
                        ))}
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
                          <th className="px-3 py-2 text-left font-medium">
                            Player
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Score
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(GameData.Scoreboard as Scoreboard).scores.map(
                          (score: Score) => (
                            <tr
                              key={score.playerId}
                              className="border-t border-white/10 hover:bg-white/5"
                            >
                              <td className="px-3 py-2 flex items-center gap-3">
                                <img
                                  src={getUserAvatar(score.playerId)}
                                  alt={`${score.playerName}'s avatar`}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const textSpan = document.createElement(
                                      'span'
                                    );
                                    textSpan.textContent = score.playerName
                                      .charAt(0)
                                      .toUpperCase();
                                    textSpan.className =
                                      'text-lg font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 border border-white/20 px-1 rounded-full w-8 h-8 flex items-center justify-center';
                                    e.currentTarget.parentElement?.appendChild(
                                      textSpan
                                    );
                                  }}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                                <span className="font-medium text-white">
                                  {score.playerName}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-200">
                                {score.score}
                              </td>
                            </tr>
                          )
                        )}
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
