import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { Hitster } from "../../types/gamemode/hitster";

export class HitsterHandler implements IGameModeHandler {

    async handleMessage(ctx: GameModeContext): Promise<void> {
        const hitsterData = ctx.game.currentGameModeData as Hitster | undefined;
        console.log(`[Hitster] received ${ctx.dataType}`);

        if (!hitsterData) {
            console.error(`[Hitster Handler] State error: currentGameModeData is missing for game ${ctx.game.id}`);
            return;
        }

        try {
            switch (ctx.dataType) {



                default:
                    break;
            }
        } catch (error) {
            console.error(`[Hitster Class Handler Fatal Error] Crash prevented in case ${ctx.dataType}:`, error);
            ctx.send({ type: "Hitster:error", payload: { notificationLevel: "modal", message: "internal_server_error_in_module" } });
        }
    }


}
