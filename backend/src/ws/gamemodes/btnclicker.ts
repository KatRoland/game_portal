// használaton kívűl, csak példa, tesztelésre tartott
import { Game } from "../../types/Game";
import { BTN } from "../../types/gamemode/BTN";
import { GameMode } from "../../types/GameMode";

export function handleBTNMessage(user: any, data: any, game: Game, broadcast: (msg: any) => void, send: (msg: any) => void) {
    console.log('Handling BTN messages', data);
    console.log('Current game state', game);
    console.log("user:", user);

    switch (data.type) {
        case "btn:click": {
            const playerId = typeof user?.id === "string" ? user.id : "";
            const playerName = typeof user?.username === "string" ? user.username : "Anonymous";

            if (playerId && playerName) {
                const playerState = game.currentGameModeData.state.find((p: any) => p.playerId === playerId);
                if (playerState) {
                    playerState.count += 1;
                    if (playerState.count == 10) {
                        game.mode = GameMode.Cross;
                        broadcast({ type: "game:game_mode_ended", payload: { game: game } });
                    }
                } else {
                    game.currentGameModeData.state.push({ playerId, playerName, count: 1 });
                }
                broadcast({ type: "btn:state_changed", payload: { state: game.currentGameModeData.state } });
            }
        }
    }
}