import { useState } from "react";
import { Game, GameFN, User, Scoreboard, Score, HTFN, Hitster } from "@/types";


interface HitsterProps {
  isHost: boolean;
  GameFN: GameFN;
  GameData: Game | null;
  HTFN: HTFN
}

export default function QA({ isHost, GameFN, GameData, HTFN }: HitsterProps) {
  const { incrementScore, decrementScore, endGameMode, finishGameAsHost } = GameFN;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-gray-100">

    </div>
  )
}