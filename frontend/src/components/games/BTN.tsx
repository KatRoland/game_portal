import { useState } from "react";
import { Game,GameFN, GameQuestion, User, Scoreboard, Score } from "@/types";


interface BTNProps {
    isHost: boolean;
    GameFN: GameFN;
    GameData: Game | null;
    BTNFN: {
        btnClick: () => void;
    };
    }

export default function BTN({ isHost, BTNFN, GameFN, GameData }: BTNProps) {
    const [answer, setAnswer] = useState('');
    const { btnClick } = BTNFN;
    const { incrementScore, decrementScore, endGameMode } = GameFN;

    const handleBtnClick = () => {
        btnClick();
    }

    return (
        <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Game Room</h1>

      
          <div>
            <button
              onClick={() => handleBtnClick()}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Click Me!
            </button>
          </div>

          {/* scoreboard */}
          <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Scoreboard:</h3>
        <div className="bg-white p-4 rounded-lg shadow">
          {GameData && GameData.currentGameModeData.state && GameData.currentGameModeData.state.length > 0 ? (
            <table className="w-full table-auto">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Player</th>
                  <th className="px-4 py-2 text-left">Score</th>
                </tr>
              </thead>
              <tbody>
                {(GameData.currentGameModeData.state).map((score: {playerId: string, playerName: string, count: number}) => (
                  <tr key={score.playerId}>
                    <td className="border-t px-4 py-2">{score.playerName}</td>
                    <td className="border-t px-4 py-2">{score.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No scores available.</p>
          )}
        </div>
      </div>
        </div>
    )
}