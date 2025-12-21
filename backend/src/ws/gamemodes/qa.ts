
import { QA } from "../../types/gamemode/QA";
import { Game } from "../../types/Game";

export function handleQAMessages(user: any, data: any, game: Game, broadcast: (msg: any) => void, send: (msg: any) => void) {
    console.log('Handling QA messages', data);
    console.log('Current game state', game);
    console.log("user:", user);

    switch (data.type) {
        case "qa:ask_question": {
            const question = typeof data.payload?.question === "string" ? data.payload.question : null;
            if (question) {
                game.currentGameModeData.question = question;
                game.currentGameModeData.answers = [];
                broadcast({ type: "qa:new_question", payload: { question: ({ question: game.currentGameModeData.question, answers: game.currentGameModeData.answers }) } });
            }
            break;
        }

        case "qa:answer_question": {
            const playerId = typeof user?.id === "string" ? user.id : "";
            const playerName = typeof user?.username === "string" ? user.username : "Anonymous";
            const answer = typeof data.payload?.answer === "string" ? data.payload.answer : null;
            if (playerId && playerName && answer) {
                if (game.currentGameModeData.answers.find((a: any) => a.playerId === playerId)) {
                    console.log(`Player ${playerId} has already answered.`);
                    return;
                }
                game.currentGameModeData.answers.push({ playerId, playerName, answer });
                console.log("Updated answers:", game.currentGameModeData.answers);
                broadcast({ type: "qa:update_answers", payload: { answers: game.currentGameModeData.answers } });
            }
            break;
        }
    }
}