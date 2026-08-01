import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { UNO } from "../../types/gamemode/UNO";

export class UnoHandler implements IGameModeHandler {

    async handleMessage(ctx: GameModeContext): Promise<void> {
        const unoData = ctx.game.currentGameModeData as UNO | undefined;

        if (!unoData) {
            console.error(`[Uno Handler] State error: currentGameModeData is missing for game ${ctx.game.id}`);
            return;
        }

        try {
            switch (ctx.dataType) {
                default:
                    break;
            }
        } catch (error) {
            console.error(`[uno Class Handler Fatal Error] Crash prevented in case ${ctx.dataType}:`, error);
            ctx.send({ type: "uno:error", message: "internal_server_error_in_module" });
        }
    }
}
