import { useState } from "react";
import { Game,GameFN, GameQuestion, User, Scoreboard, Score } from "@/types";


interface QAProps {
    isHost: boolean;
    GameFN: GameFN;
    GameData: Game | null;
    QAFN: {
        setQuestion: (q: string) => void;
        askQuestion: (q: string) => void;
        answerQuestion: (a: string) => void;
    };
    question: GameQuestion | null;
    }

export default function QA({ isHost, QAFN, GameFN, question, GameData }: QAProps) {
    const [answer, setAnswer] = useState('');
    const { askQuestion, setQuestion, answerQuestion } = QAFN;
    const { incrementScore, decrementScore, endGameMode, finishGameAsHost } = GameFN;

    const handleAskQuestion = (q: string) => {
        askQuestion(q);
    }

    const handleSubmitAnswer = () => {
        if (!question || !answer || answer.length == 0) return;
        
        answerQuestion(answer);
        setAnswer('');
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-gray-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold mb-6 tracking-tight"><span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400">Game Room</span></h1>

      {isHost ? (
        <div className="mb-8 p-6 bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-purple-500/20 shadow-lg shadow-black/30">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7h4m0 0V3m0 4h-4M7 7h4m0 0V3m0 4H7m-2 10h4m0 0v4m0-4H5m8 0h4m0 0v4m0-4h-4" />
            </svg>
            Host Controls
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter your question..."
              className="flex-1 px-4 py-2 rounded-lg bg-black/40 border border-purple-500/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              onClick={() => handleAskQuestion(question?.question || '')}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
            >
              Ask Question
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => endGameMode()}
              className="mt-4 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
            >
              End Game Mode
            </button>
            <button
              onClick={() => finishGameAsHost()}
              className="mt-4 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
            >
              Terminate Game
            </button>
          </div>
        </div>
      ) : null}

      {question ? (
        <div className="mb-8">
          <div className="bg-gray-900/60 p-6 rounded-2xl border border-purple-500/20 shadow-lg shadow-black/30 mb-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-8 4h10M5 8h14" />
              </svg>
              Current Question:
            </h3>
            <p className="text-gray-300">{question.question}</p>
          </div>

          {!isHost && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 px-4 py-2 rounded-lg bg-black/40 border border-purple-500/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSubmitAnswer}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
              >
                Submit Answer
              </button>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-2">Answers:</h3>
            <div className="space-y-2">
              {question.answers.map((ans, index) => (
                <div key={index} className="bg-white/3 p-4 rounded-xl border border-purple-500/20">
                  <p className="font-semibold text-sm text-gray-300">{ans.playerName}:</p>
                  <p className="text-gray-100">{ans.answer}</p>
                  {isHost && (
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={() => incrementScore(ans.playerId, 1)}
                        className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-sm"
                      >
                        +1 Point
                      </button>
                      <button
                        onClick={() => decrementScore(ans.playerId, 1)}
                        className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-sm"
                      >
                        -1 Point
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* scoreboard */}
          <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Scoreboard:</h3>
        <div className="bg-gray-900/60 p-6 rounded-2xl border border-purple-500/20 shadow-lg shadow-black/30">
          {GameData && GameData.Scoreboard?.scores && GameData.Scoreboard.scores.length > 0 ? (
            <table className="w-full table-auto">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-purple-200">Player</th>
                  <th className="px-4 py-2 text-left text-purple-200">Score</th>
                </tr>
              </thead>
              <tbody>
                {(GameData.currentGameModeData.Scoreboard as Scoreboard).scores.map((score) => (
                  <tr key={score.playerId}>
                    <td className="border-t border-purple-500/20 px-4 py-2 text-gray-100">{score.playerName}</td>
                    <td className="border-t border-purple-500/20 px-4 py-2 text-gray-100">{score.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400">No scores available.</p>
          )}
        </div>
      </div>
        </div>
      ) : (
        <div className="text-center text-gray-400">
          {isHost ? "Ask a question to start the game!" : "Waiting for the host to ask a question..."}
        </div>
      )}
    </div>
    </div>
    )
}