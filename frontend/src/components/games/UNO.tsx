'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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


interface CardAnimation {
  id: string;
  card: UNOCard;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isOwnPlay: boolean;
  playerName?: string;
}

interface DrawAnimation {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isSelfDraw: boolean;
  playerName?: string;
  delay: number;
  duration?: number;
  totalDrawn?: number;
  cardIndex?: number;
}

function AnimationOverlay({
  playAnims,
  drawAnims,
  onPlayDone,
  onDrawDone,
}: {
  playAnims: CardAnimation[];
  drawAnims: DrawAnimation[];
  onPlayDone: (id: string) => void;
  onDrawDone: (id: string) => void;
}) {
  return (
    <>
      {playAnims.map((anim) => (
        <CardFlyAnimation key={anim.id} anim={anim} onDone={() => onPlayDone(anim.id)} />
      ))}
      {drawAnims.map((anim) => (
        <DrawCardFlyAnimation key={anim.id} anim={anim} onDone={() => onDrawDone(anim.id)} />
      ))}
    </>
  );
}

function CardFlyAnimation({ anim, onDone }: { anim: CardAnimation; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(onDone, 750);
    return () => clearTimeout(timer);
  }, [onDone]);

  const dx = anim.toX - anim.fromX;
  const dy = anim.toY - anim.fromY;

  const cardColorMap: Record<string, string> = {
    red: 'rgba(239,68,68,0.7)',
    blue: 'rgba(59,130,246,0.7)',
    green: 'rgba(34,197,94,0.7)',
    yellow: 'rgba(234,179,8,0.7)',
    wild: 'rgba(168,85,247,0.7)',
  };
  const glowColor = (anim.card.color && cardColorMap[anim.card.color]) || 'rgba(255,255,255,0.5)';

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none"
      style={{
        left: anim.fromX,
        top: anim.fromY,
        zIndex: 9999,
        width: 80,
        height: 120,
        animation: 'unoCardFly 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        ['--fly-dx' as string]: `${dx}px`,
        ['--fly-dy' as string]: `${dy}px`,
      }}
    >
      {!anim.isOwnPlay ? (
        <div
          className="w-full h-full"
          style={{
            perspective: '600px',
          }}
        >
          <div
            className="relative w-full h-full"
            style={{
              transformStyle: 'preserve-3d',
              animation: 'unoCardFlip 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
            }}
          >
            <img
              src={getUNOCardBackPath()}
              alt="card back"
              className="absolute inset-0 w-full h-full rounded-lg object-contain"
              style={{ backfaceVisibility: 'hidden' }}
            />
            <img
              src={getUNOCardImagePath(anim.card)}
              alt="played card"
              className="absolute inset-0 w-full h-full rounded-lg object-contain"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            />
          </div>
        </div>
      ) : (
        <img
          src={getUNOCardImagePath(anim.card)}
          alt="played card"
          className="w-full h-full rounded-lg object-contain"
          style={{ filter: `drop-shadow(0 0 12px ${glowColor})` }}
        />
      )}

      {!anim.isOwnPlay && anim.playerName && (
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-black/80 border border-white/20 text-[10px] font-bold text-white"
          style={{ animation: 'unoTagFade 600ms ease forwards' }}
        >
          {anim.playerName}
        </div>
      )}
    </div>
  );
}

function getDrawAnimationTiming(cardsDrawn: number) {
  if (cardsDrawn < 4) {
    return {
      visualCount: cardsDrawn,
      staggerMs: 150,
      durationMs: 500,
    };
  }
  const visualCount = Math.min(cardsDrawn, 30);
  const staggerMs = Math.max(12, Math.round(80 * Math.pow(4 / cardsDrawn, 0.6)));
  const durationMs = Math.max(150, Math.round(380 * Math.pow(4 / cardsDrawn, 0.35)));

  return {
    visualCount,
    staggerMs,
    durationMs,
  };
}

function DrawCardFlyAnimation({ anim, onDone }: { anim: DrawAnimation; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const duration = anim.duration || 500;
  const totalDrawn = anim.totalDrawn || 1;
  const cardIndex = anim.cardIndex || 0;

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), anim.delay);
    const doneTimer = setTimeout(onDone, anim.delay + duration + 100);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(doneTimer);
    };
  }, [anim.delay, duration, onDone]);

  if (!visible) return null;

  const dx = anim.toX - anim.fromX;
  const dy = anim.toY - anim.fromY;

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: anim.fromX,
        top: anim.fromY,
        zIndex: 9998,
        width: 64,
        height: 96,
        animation: `unoDrawFly ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
        ['--fly-dx' as string]: `${dx}px`,
        ['--fly-dy' as string]: `${dy}px`,
      }}
    >
      <img
        src={getUNOCardBackPath()}
        alt="drawn card"
        className="w-full h-full rounded-lg object-contain"
        style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}
      />
      {!anim.isSelfDraw && anim.playerName && cardIndex === 0 && (
        <div
          className={`absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full font-bold text-[10px] ${totalDrawn >= 4
            ? 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white border border-yellow-300/60 shadow-lg shadow-red-900/50 animate-pulse'
            : 'bg-black/80 border border-white/20 text-gray-300'
            }`}
          style={{ animation: `unoTagFade ${duration}ms ease forwards` }}
        >
          {anim.playerName} drew {totalDrawn >= 4 ? `+${totalDrawn}!` : totalDrawn > 1 ? `+${totalDrawn}` : ''}
        </div>
      )}
      {anim.isSelfDraw && totalDrawn >= 4 && cardIndex === 0 && (
        <div
          className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-black text-[10px] border border-yellow-300/60 shadow-lg shadow-red-900/50 animate-pulse"
          style={{ animation: `unoTagFade ${duration}ms ease forwards` }}
        >
          +{totalDrawn} CARDS!
        </div>
      )}
    </div>
  );
}

const UNO_ANIMATION_STYLES = `
@keyframes unoCardFly {
  0% {
    transform: translate(0, 0) scale(1.15) rotate(-8deg);
    opacity: 1;
  }
  60% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--fly-dx), var(--fly-dy)) scale(1) rotate(0deg);
    opacity: 0;
  }
}
@keyframes unoCardFlip {
  0% {
    transform: rotateY(0deg);
  }
  100% {
    transform: rotateY(180deg);
  }
}
@keyframes unoTagFade {
  0% { opacity: 1; transform: translate(-50%, 0); }
  70% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -8px); }
}
@keyframes unoTopCardLand {
  0% {
    filter: drop-shadow(0 0 0px transparent);
    transform: scale(1);
  }
  30% {
    filter: drop-shadow(0 0 20px var(--land-glow));
    transform: scale(1.08);
  }
  100% {
    filter: drop-shadow(0 0 0px transparent);
    transform: scale(1);
  }
}
@keyframes unoDrawFly {
  0% {
    transform: translate(0, 0) scale(0.85) rotate(5deg);
    opacity: 1;
  }
  50% {
    transform: translate(calc(var(--fly-dx) * 0.5), calc(var(--fly-dy) * 0.5 - 30px)) scale(1.05) rotate(-3deg);
    opacity: 1;
  }
  100% {
    transform: translate(var(--fly-dx), var(--fly-dy)) scale(1) rotate(0deg);
    opacity: 0;
  }
}
`;

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
  const sortedCards = [...cards].sort((a, b) => {
    const colorOrder: Record<string, number> = {
      red: 1,
      blue: 2,
      green: 3,
      yellow: 4,
      black: 5,
    };
    const typeOrder: Record<string, number> = {
      number: 1,
      skip: 2,
      reverse: 3,
      draw2: 4,
      wild: 5,
      draw4: 6,
    };

    const colorA = colorOrder[a.color || ''] || 99;
    const colorB = colorOrder[b.color || ''] || 99;
    if (colorA !== colorB) return colorA - colorB;

    const typeA = typeOrder[a.type || ''] || 99;
    const typeB = typeOrder[b.type || ''] || 99;
    if (typeA !== typeB) return typeA - typeB;

    if (a.type === 'number' && b.type === 'number') {
      const numA = Number(a.value);
      const numB = Number(b.value);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
    }

    return String(a.value).localeCompare(String(b.value));
  });

  const groups: { key: string; cards: UNOCardInHand[] }[] = [];
  const map = new Map<string, UNOCardInHand[]>();

  sortedCards.forEach((card) => {
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
  isNext,
}: {
  playerName: string;
  cardCount: number;
  hasSaidUno?: boolean;
  isTurn?: boolean;
  isNext?: boolean;
}) {
  const visibleCards = Math.min(cardCount, 5);
  const extraCards = Math.max(0, cardCount - 5);

  return (
    <div
      className={`flex flex-col items-center p-4 rounded-2xl border transition-all ${isTurn
        ? 'border-yellow-400/80 bg-yellow-500/10 shadow-lg shadow-yellow-500/20 scale-105'
        : isNext
          ? 'border-cyan-400/70 bg-cyan-500/10 shadow-md shadow-cyan-500/10 scale-[1.02]'
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
        {!isTurn && isNext && (
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-extrabold uppercase tracking-wider">
            Next
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

  const playersMap = unoState?.players || {};
  const playerOrder = unoState?.playerOrderIds || [];
  const userPlayerData = currentUserId && playersMap[currentUserId] ? playersMap[currentUserId] : null;
  const userHand: UNOCardInHand[] = userPlayerData?.cards || [];

  const [cardAnimations, setCardAnimations] = useState<CardAnimation[]>([]);
  const [drawAnimations, setDrawAnimations] = useState<DrawAnimation[]>([]);
  const [topCardLanding, setTopCardLanding] = useState(false);
  const prevTopCardRef = useRef<UNOCard | null>(null);
  const prevTurnPlayerRef = useRef<string | null>(null);
  const prevHandLenRef = useRef<number>(0);
  const prevOtherCardCountsRef = useRef<Map<string, number>>(new Map());
  const topCardElRef = useRef<HTMLDivElement>(null);
  const drawPileElRef = useRef<HTMLDivElement>(null);
  const myHandElRef = useRef<HTMLDivElement>(null);
  const otherPlayerElRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const drawAnimTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const setOtherPlayerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      otherPlayerElRefs.current.set(id, el);
    } else {
      otherPlayerElRefs.current.delete(id);
    }
  }, []);

  const removePlayAnimation = useCallback((id: string) => {
    setCardAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const removeDrawAnimation = useCallback((id: string) => {
    setDrawAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    const newTop = unoState?.topCard || null;
    const oldTop = prevTopCardRef.current;
    const currentTurn = unoState?.currentTurnPlayerId || null;
    const prevTurn = prevTurnPlayerRef.current;
    const currentHandLen = userHand.length;
    const prevHandLen = prevHandLenRef.current;

    prevTopCardRef.current = newTop;
    prevTurnPlayerRef.current = currentTurn;

    if (!newTop || !oldTop) return;
    if (
      newTop.color === oldTop.color &&
      newTop.type === oldTop.type &&
      newTop.value === oldTop.value
    ) return;

    const wePlayedCard = currentHandLen < prevHandLen;

    const whoPlayedId = prevTurn;

    const targetEl = topCardElRef.current;
    if (!targetEl) return;
    const targetRect = targetEl.getBoundingClientRect();
    const toX = targetRect.left + targetRect.width / 2 - 40;
    const toY = targetRect.top + targetRect.height / 2 - 60;

    let fromX = toX;
    let fromY = toY + 200;

    if (wePlayedCard) {
      const handEl = myHandElRef.current;
      if (handEl) {
        const handRect = handEl.getBoundingClientRect();
        fromX = handRect.left + handRect.width / 2 - 40;
        fromY = handRect.top + handRect.height / 2 - 60;
      }
    } else if (whoPlayedId) {
      const playerEl = otherPlayerElRefs.current.get(whoPlayedId);
      if (playerEl) {
        const playerRect = playerEl.getBoundingClientRect();
        fromX = playerRect.left + playerRect.width / 2 - 40;
        fromY = playerRect.top + playerRect.height / 2 - 60;
      }
    }

    const playerName = whoPlayedId && !wePlayedCard
      ? (unoState?.players?.[whoPlayedId]?.name || 'Player')
      : undefined;

    const animId = `card-anim-${Date.now()}-${Math.random()}`;
    setCardAnimations((prev) => [
      ...prev,
      {
        id: animId,
        card: newTop,
        fromX,
        fromY,
        toX,
        toY,
        isOwnPlay: wePlayedCard,
        playerName,
      },
    ]);

    setTopCardLanding(true);
    const glowTimer = setTimeout(() => setTopCardLanding(false), 700);
    return () => clearTimeout(glowTimer);
  }, [unoState?.topCard?.color, unoState?.topCard?.type, unoState?.topCard?.value, unoState?.currentTurnPlayerId]);

  useEffect(() => {
    const pileEl = drawPileElRef.current;
    if (!pileEl) {
      prevHandLenRef.current = userHand.length;
      const counts = new Map<string, number>();
      playerOrder.forEach((id) => {
        counts.set(id, playersMap[id]?.cards?.length || 0);
      });
      prevOtherCardCountsRef.current = counts;
      return;
    }
    const pileRect = pileEl.getBoundingClientRect();
    const fromX = pileRect.left + pileRect.width / 2 - 32;
    const fromY = pileRect.top + pileRect.height / 2 - 48;

    const newAnims: DrawAnimation[] = [];

    const currentHandLen = userHand.length;
    const prevHandLen = prevHandLenRef.current;
    const topChanged = (() => {
      const newTop = unoState?.topCard;
      const oldTop = prevTopCardRef.current;
      if (!newTop || !oldTop) return false;
      return newTop.color !== oldTop.color || newTop.type !== oldTop.type || newTop.value !== oldTop.value;
    })();

    if (currentHandLen > prevHandLen && !topChanged) {
      const cardsDrawn = currentHandLen - prevHandLen;
      const handEl = myHandElRef.current;
      let toX = fromX;
      let toY = fromY + 200;
      if (handEl) {
        const handRect = handEl.getBoundingClientRect();
        toX = handRect.left + handRect.width / 2 - 32;
        toY = handRect.top + handRect.height / 2 - 48;
      }
      const { visualCount, staggerMs, durationMs } = getDrawAnimationTiming(cardsDrawn);
      for (let i = 0; i < visualCount; i++) {
        newAnims.push({
          id: `draw-self-${Date.now()}-${i}-${Math.random()}`,
          fromX,
          fromY,
          toX,
          toY,
          isSelfDraw: true,
          delay: i * staggerMs,
          duration: durationMs,
          totalDrawn: cardsDrawn,
          cardIndex: i,
        });
      }
    }

    const prevCounts = prevOtherCardCountsRef.current;
    playerOrder.forEach((id) => {
      if (id === currentUserId) return;
      const newCount = playersMap[id]?.cards?.length || 0;
      const oldCount = prevCounts.get(id) ?? 0;
      if (newCount > oldCount) {
        const cardsDrawn = newCount - oldCount;
        const playerEl = otherPlayerElRefs.current.get(id);
        let toX = fromX;
        let toY = fromY - 200;
        if (playerEl) {
          const playerRect = playerEl.getBoundingClientRect();
          toX = playerRect.left + playerRect.width / 2 - 32;
          toY = playerRect.top + playerRect.height / 2 - 48;
        }
        const pName = playersMap[id]?.name || 'Player';
        const { visualCount, staggerMs, durationMs } = getDrawAnimationTiming(cardsDrawn);
        for (let i = 0; i < visualCount; i++) {
          newAnims.push({
            id: `draw-other-${id}-${Date.now()}-${i}-${Math.random()}`,
            fromX,
            fromY,
            toX,
            toY,
            isSelfDraw: false,
            playerName: pName,
            delay: i * staggerMs,
            duration: durationMs,
            totalDrawn: cardsDrawn,
            cardIndex: i,
          });
        }
      }
    });

    prevHandLenRef.current = currentHandLen;
    const counts = new Map<string, number>();
    playerOrder.forEach((id) => {
      counts.set(id, playersMap[id]?.cards?.length || 0);
    });
    prevOtherCardCountsRef.current = counts;

    if (newAnims.length > 0) {
      setDrawAnimations((prev) => [...prev, ...newAnims]);
    }

    return () => {
      drawAnimTimersRef.current.forEach(clearTimeout);
      drawAnimTimersRef.current = [];
    };
  }, [userHand.length, JSON.stringify(playerOrder.map(id => playersMap[id]?.cards?.length || 0))]);


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

  const sendSettingsWS = (updatedRules: UNOGameRules) => {
    if (!GameData) return;
    UNOFN.settingsChanged(GameData.id, updatedRules);
  };

  const handleRuleToggle = (key: keyof UNOGameRules) => {
    if (!isHost) return;
    if (typeof rules[key] === 'boolean') {
      const updated = { ...rules, [key]: !rules[key] };
      setRules(updated);
      sendSettingsWS(updated);
    }
  };

  const handleRuleChange = (key: keyof UNOGameRules, value: any) => {
    if (!isHost) return;
    const updated = { ...rules, [key]: value };
    setRules(updated);
    sendSettingsWS(updated);
  };

  const handleStartRound = () => {
    if (isHost && GameData?.id) {
      UNOFN.start(rules)
    }
  };

  const groupedUserHand = groupHandCards(userHand);

  const topCard: UNOCard | null = unoState?.topCard || null;
  const drawPileCount: number = unoState?.drawPile?.length ?? 0;
  const isClockwise = (unoState?.state?.direction ?? 1) === 1;

  const currentTurnPlayerId = unoState?.currentTurnPlayerId || '';
  const currentTurnIdx = playerOrder.indexOf(currentTurnPlayerId);
  const dirStep = isClockwise ? 1 : -1;
  const nextTurnIdx =
    playerOrder.length > 0 && currentTurnIdx !== -1
      ? (currentTurnIdx + dirStep + playerOrder.length) % playerOrder.length
      : -1;
  const nextTurnPlayerId = nextTurnIdx !== -1 ? playerOrder[nextTurnIdx] : null;
  const isNextTurn = nextTurnPlayerId === currentUserId;

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
        isNext: nextTurnPlayerId === id,
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
          isNext: false,
        }));

  const winnerId = unoState?.playersWhoOut?.[0]?.playerId;
  const winnerName = winnerId && playersMap[winnerId] ? playersMap[winnerId].name : 'Winner';

  const isMyTurn = currentUserId === unoState?.currentTurnPlayerId;
  const currentPhase = unoState?.state?.activePhaseData?.phase;
  const showColorPicker = currentPhase === 'choose_color' && isMyTurn;
  const isDrawPending = currentPhase === 'draw_pending';
  const drawPendingData = isDrawPending
    ? (unoState?.state?.activePhaseData as { phase: 'draw_pending'; drawAmount: number; drawType: 'draw2' | 'draw4' })
    : null;

  const handlePlayCard = (cardIds: string[]) => {
    if (!isMyTurn) return;
    UNOFN.playCard(cardIds);
  };

  const handleDrawCard = () => {
    if (!isMyTurn) return;
    UNOFN.drawCard();
  };

  const handleSayUno = () => {
    if (!isMyTurn) return;
    UNOFN.sayUno();
  };

  const handleChooseColor = (color: 'red' | 'green' | 'blue' | 'yellow') => {
    if (!isMyTurn) return;
    UNOFN.chooseColor(color);
  };



  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-black text-gray-100">
      <style dangerouslySetInnerHTML={{ __html: UNO_ANIMATION_STYLES }} />
      <AnimationOverlay
        playAnims={cardAnimations}
        drawAnims={drawAnimations}
        onPlayDone={removePlayAnimation}
        onDrawDone={removeDrawAnimation}
      />
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

        {isHost && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Host Controls
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
        )}

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

            {isDrawPending && isMyTurn && (
              <div className="rounded-2xl border border-red-500/80 bg-gradient-to-r from-red-950/80 via-rose-900/60 to-red-950/80 p-5 shadow-2xl shadow-red-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <span className="text-3xl flex-shrink-0 animate-bounce">⚡</span>
                  <div>
                    <div className="font-extrabold text-base sm:text-lg text-red-300 uppercase tracking-wide flex items-center gap-2 justify-center sm:justify-start">
                      Draw Stack Pending: +{drawPendingData?.drawAmount} Cards!
                    </div>
                    <p className="text-xs sm:text-sm text-gray-200 mt-1">
                      {drawPendingData?.drawType === 'draw2' ? (
                        <>Play a <span className="font-bold text-yellow-300">Draw 2</span> or <span className="font-bold text-yellow-300">Draw 4</span> from your hand to counter, or accept the stack.</>
                      ) : (
                        <>Play a <span className="font-bold text-yellow-300">Draw 4</span> or matching-color <span className="font-bold text-yellow-300">Draw 2</span> to counter, or accept the stack.</>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDrawCard}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-red-900/50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap border border-red-400/40"
                >
                  Accept & Draw +{drawPendingData?.drawAmount}
                </button>
              </div>
            )}

            {playerOrder.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-2 mr-2 pr-4 border-r border-white/15">
                  <span className="text-yellow-400 font-black text-lg">
                    {isClockwise ? '↻' : '↺'}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-300">
                    {isClockwise ? 'Clockwise' : 'Reversed'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {playerOrder.map((id, idx) => {
                    const p = playersMap[id];
                    const name = id === currentUserId ? 'You' : p?.name || 'Player';
                    const isCurrent = id === currentTurnPlayerId;
                    const isNext = id === nextTurnPlayerId;

                    return (
                      <div key={id} className="flex items-center gap-2">
                        <div
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all ${isCurrent
                            ? 'border-yellow-400 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 shadow-lg shadow-yellow-500/20 font-black scale-105 animate-pulse'
                            : isNext
                              ? 'border-cyan-400/80 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-300 shadow-md shadow-cyan-500/10 font-extrabold'
                              : 'border-white/10 bg-white/5 text-gray-400 font-medium'
                            }`}
                        >
                          <span className="text-xs">
                            {name}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded-full bg-yellow-400 text-gray-950 text-[9px] font-black uppercase tracking-wider">
                              Now
                            </span>
                          )}
                          {!isCurrent && isNext && (
                            <span className="px-1.5 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 text-[9px] font-black uppercase tracking-wider">
                              Next
                            </span>
                          )}
                        </div>

                        {idx < playerOrder.length - 1 && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-4 h-4 text-gray-600 flex-shrink-0"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 8 7.23 4.29a.75.75 0 011.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">
                  Other Players
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {otherPlayersList.map((player) => (
                  <div key={player.id} ref={(el) => setOtherPlayerRef(player.id, el)}>
                    <OtherPlayerHandDisplay
                      playerName={player.name}
                      cardCount={player.cardCount}
                      hasSaidUno={player.hasSaidUno}
                      isTurn={player.isTurn}
                      isNext={player.isNext}
                    />
                  </div>
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
                  <div className="flex flex-col items-center" ref={topCardElRef}>
                    <span className="text-xs font-semibold text-gray-400 mb-2">
                      Top Card
                    </span>
                    {topCard ? (
                      <img
                        src={getUNOCardImagePath(topCard)}
                        alt="Top Card"
                        className="w-24 h-36 rounded-xl shadow-2xl transform hover:scale-105 transition-transform object-contain filter drop-shadow-xl cursor-pointer"
                        style={topCardLanding ? {
                          animation: 'unoTopCardLand 700ms ease-out forwards',
                          ['--land-glow' as string]: (topCard.color && ({
                            red: 'rgba(239,68,68,0.6)',
                            blue: 'rgba(59,130,246,0.6)',
                            green: 'rgba(34,197,94,0.6)',
                            yellow: 'rgba(234,179,8,0.6)',
                            wild: 'rgba(168,85,247,0.6)',
                          } as Record<string, string>)[topCard.color]) || 'rgba(255,255,255,0.4)',
                        } : undefined}
                      />
                    ) : (
                      <div className="w-24 h-36 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-xs text-gray-500">
                        No Card
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center" ref={drawPileElRef}>
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
                </div>
              </div>
            </div>

            <div className="relative mt-4 pt-2 pb-12 select-none" ref={myHandElRef}>
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-yellow-500/10 via-black/20 to-transparent pointer-events-none blur-2xl"></div>

              <div className="flex items-center justify-between w-full max-w-4xl mx-auto mb-4 px-6 py-3 rounded-full bg-black/60 border border-white/15 backdrop-blur-md shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse"></span>
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                      Your Hand
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 font-extrabold text-xs">
                      {userHand.length} {userHand.length === 1 ? 'Card' : 'Cards'}
                    </span>
                  </div>
                  {userPlayerData?.hasSaidUno && (
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-[10px] font-black text-white uppercase tracking-wider shadow-lg shadow-red-900/40 animate-pulse border border-red-400/40">
                      UNO!
                    </span>
                  )}
                </div>

                {isMyTurn ? (
                  <div className="flex items-center gap-2.5 px-5 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border border-yellow-400 text-yellow-300 shadow-lg shadow-yellow-500/20 animate-pulse">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400"></span>
                    </span>
                    <span className="font-extrabold text-xs uppercase tracking-widest">
                      Your Turn to Play
                    </span>
                  </div>
                ) : isNextTurn ? (
                  <div className="flex items-center gap-2.5 px-5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 border border-cyan-400/80 text-cyan-300 shadow-lg shadow-cyan-500/20 animate-pulse">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                    </span>
                    <span className="font-extrabold text-xs uppercase tracking-widest">
                      You're Next in Turn
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs">
                    <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                    <span>
                      Waiting for{' '}
                      <strong className="text-gray-200 font-bold">
                        {unoState?.players?.[unoState?.currentTurnPlayerId]?.name || 'other player'}
                      </strong>
                      {isDrawPending && drawPendingData?.drawAmount ? (
                        <span className="ml-1 text-amber-400 font-extrabold">(+{drawPendingData.drawAmount} pending)</span>
                      ) : null}
                    </span>
                  </div>
                )}

                {rules.uno && (
                  userPlayerData?.hasSaidUno ? (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      <span className="font-black text-xs uppercase tracking-wider">UNO Said</span>
                    </div>
                  ) : userHand.length === 2 ? (
                    <button
                      onClick={handleSayUno}
                      className="relative px-5 py-2 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:from-red-500 hover:via-rose-400 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-red-900/50 transition-all active:scale-95 hover:scale-105 animate-pulse"
                    >
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-400"></span>
                      </span>
                      Say UNO!
                    </button>
                  ) : (
                    <button
                      onClick={handleSayUno}
                      disabled={userHand.length > 2}
                      className="px-4 py-1.5 rounded-full bg-red-600/50 hover:bg-red-600 disabled:bg-gray-800/40 disabled:text-gray-500 disabled:border-transparent disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 border border-white/10"
                    >
                      Say UNO!
                    </button>
                  )
                )}
              </div>

              {userHand.length > 0 ? (
                (() => {
                  const totalGroups = groupedUserHand.length;
                  const maxVisiblePerStack = totalGroups > 8 ? 2 : 5;
                  const overlapPx = totalGroups <= 6 ? 0 : Math.min(20, Math.round((totalGroups - 6) * 3));

                  return (
                    <div className="relative z-10 flex flex-wrap items-end justify-center gap-y-5 w-[80vw] left-1/2 -translate-x-1/2 overflow-visible pt-12 pb-4 px-4 min-h-[150px]">
                      {groupedUserHand.map((group, idx) => {
                        const stackCount = group.cards.length;
                        const visibleCount = Math.min(stackCount, maxVisiblePerStack);
                        const visibleCards = group.cards.slice(0, visibleCount);
                        const offsetPx = 10;
                        const baseWidth = 84;
                        const baseHeight = 124;
                        const totalWidth = baseWidth + (visibleCount - 1) * offsetPx;
                        const totalHeight = baseHeight + (visibleCount - 1) * offsetPx;
                        const mlStyle = idx === 0 ? 0 : overlapPx > 0 ? -overlapPx : 12;

                        return (
                          <div
                            key={group.key}
                            onClick={() => {
                              if (group.cards[0]?.id) handlePlayCard([group.cards[0].id]);
                            }}
                            className="relative transition-transform duration-150 ease-out transform-gpu cursor-pointer select-none group/handCard hover:-translate-y-10 hover:scale-125 hover:z-[100] focus-within:z-[100] will-change-transform"
                            style={{
                              width: `${totalWidth}px`,
                              height: `${totalHeight}px`,
                              marginLeft: `${mlStyle}px`,
                              zIndex: idx + 1,
                            }}
                          >
                            {visibleCards.map((card, cardIdx) => {
                              const isTopCard = cardIdx === visibleCount - 1;
                              return (
                                <div
                                  key={card.id || cardIdx}
                                  className={`absolute w-20 h-28 rounded-xl transition-[box-shadow,filter] duration-150 ${isTopCard
                                    ? 'shadow-md group-hover/handCard:shadow-[0_0_25px_rgba(250,204,21,0.85)] group-hover/handCard:brightness-110'
                                    : 'shadow-sm'
                                    }`}
                                  style={{
                                    top: `${cardIdx * offsetPx}px`,
                                    left: `${cardIdx * offsetPx}px`,
                                    zIndex: cardIdx + 1,
                                  }}
                                >
                                  <img
                                    src={getUNOCardImagePath(card)}
                                    alt={`${card.color} ${card.value}`}
                                    className="w-full h-full object-contain pointer-events-none select-none rounded-xl"
                                    loading="eager"
                                    decoding="async"
                                  />
                                  {isTopCard && stackCount > 1 && (
                                    <span
                                      onClick={rules.canPlayMultipleCards ? (e) => {
                                        e.stopPropagation();
                                        const ids = group.cards.map(c => c.id).filter((id): id is string => Boolean(id));
                                        if (ids.length > 0) handlePlayCard(ids);
                                      } : undefined}
                                      className={`absolute -top-2.5 -right-2.5 bg-yellow-400 text-gray-950 text-xs font-black px-2 py-0.5 rounded-full shadow-lg border border-yellow-300 z-20${rules.canPlayMultipleCards ? ' cursor-pointer hover:bg-green-400 hover:scale-110 hover:border-green-300 transition-all' : ''
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
                  );
                })()
              ) : (
                <div className="flex items-center justify-center py-10 text-sm font-semibold text-gray-400/60 border border-dashed border-white/10 rounded-2xl">
                  No cards in your hand.
                </div>
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
                  onClick={() => UNOFN.restartGame()}
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
