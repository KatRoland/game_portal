import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { QA } from "../../types/gamemode/QA";

export class QAHandler implements IGameModeHandler {

    // --- Main Handler ---
    async handleMessage(ctx: GameModeContext): Promise<void> {
        // 1. Defensive State Verification
        const qaData = ctx.game.currentGameModeData as QA | undefined;

        if (!qaData) {
            console.error(`[QA Handler] State error: currentGameModeData is missing for game ${ctx.game.id}`);
            return;
        }

        // 2. Global Sandbox Isolation
        try {
            switch (ctx.dataType) {
                case "qa:ask_question": {
                    // It is generally expected only host can ask questions, but retaining original logic
                    const question = typeof ctx.payload?.question === "string" ? ctx.payload.question : null;

                    if (question) {
                        qaData.question = question;
                        qaData.answers = [];

                        ctx.broadcast({
                            type: "qa:new_question",
                            payload: {
                                question: {
                                    question: qaData.question,
                                    answers: qaData.answers
                                }
                            }
                        });
                    }
                    break;
                }

                case "qa:answer_question": {
                    const playerId = String(ctx.userId);
                    const playerName = typeof ctx.user?.username === "string" ? ctx.user.username : "Anonymous";
                    const answer = typeof ctx.payload?.answer === "string" ? ctx.payload.answer : null;

                    if (playerId && playerName && answer) {
                        if (qaData.answers.find(a => String(a.playerId) === playerId)) {
                            return;
                        }

                        qaData.answers.push({ playerId, playerName, answer });

                        ctx.broadcast({
                            type: "qa:update_answers",
                            payload: { answers: qaData.answers }
                        });
                    }
                    break;
                }

                default:
                    break;
            }
        } catch (error) {
            console.error(`[QA Class Handler Fatal Error] Crash prevented in case ${ctx.dataType}:`, error);
            ctx.send({ type: "qa:error", message: "internal_server_error_in_module" });
        }
    }
}
