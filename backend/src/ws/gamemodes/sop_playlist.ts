import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { SOP_PLAYLIST_DATA } from "../../types/gamemode/SOP_PLAYLIST";
import { Game } from "../../types/Game";

export class SOPPLHandler implements IGameModeHandler {

  private pickRandomPlayer(game: Game): string | null {
    const players = game.lobby?.players || [];
    if (players.length === 0) return null;
    const idx = Math.floor(Math.random() * players.length);
    return String(players[idx].id);
  }

  async handleMessage(ctx: GameModeContext): Promise<void> {
    const gd = ctx.game.currentGameModeData as SOP_PLAYLIST_DATA | undefined;

    if (!gd) {
      console.error(`[SOPPL Handler] State error: currentGameModeData is missing for game ${ctx.game.id}`);
      return;
    }

    const isHost = String(ctx.game.lobby?.host?.id) === String(ctx.userId);

    try {
      switch (ctx.dataType) {
        case "soppl:start": {
          if (!isHost) {
            return ctx.send({ type: "soppl:error", message: "Access Denied" });
          }

          gd.currentIndex = 0;
          gd.currentVotes = [];
          gd.pickerId = null;

          ctx.broadcast({ type: "soppl:started", payload: { gameId: ctx.game.id } });
          break;
        }

        case "soppl:set_playlist": {
          if (!isHost) {
            return ctx.send({ type: "soppl:error", message: "Access Denied" });
          }

          const playlistId = ctx.payload?.playlistId;
          if (!playlistId) return;

          (ctx.game.currentGameModeData as any).playlistId = playlistId;
          gd.currentIndex = 0;
          gd.currentVotes = [];
          gd.pickerId = null;

          ctx.broadcast({ type: "soppl:playlist_set", payload: { playlistId } });
          break;
        }

        case "soppl:next": {
          if (!isHost) {
            return ctx.send({ type: "soppl:error", message: "Access Denied" });
          }

          if (!gd.items || gd.items.length === 0) return;

          gd.currentIndex = (gd.currentIndex + 1) % gd.items.length;
          gd.currentVotes = [];
          gd.pickerId = Math.random() < 0.1 ? this.pickRandomPlayer(ctx.game) : null;

          ctx.broadcast({ type: "soppl:changed", payload: { currentIndex: gd.currentIndex, pickerId: gd.pickerId } });
          break;
        }

        case "soppl:vote": {
          const value = ctx.payload?.value;
          if (value !== 1 && value !== -1) return;

          const voterId = String(ctx.userId);

          if (gd.pickerId && String(gd.pickerId) !== voterId) {
            return ctx.send({ type: "soppl:error", message: "only_picker_can_vote" });
          }

          const existingIndex = gd.currentVotes.findIndex(v => v.voterId === voterId);

          if (existingIndex !== -1) {
            if (gd.currentVotes[existingIndex].value === value) return;
            gd.currentVotes.splice(existingIndex, 1);
          }

          gd.currentVotes.push({ voterId, value });
          ctx.broadcast({ type: "soppl:update_votes", payload: { votes: gd.currentVotes } });
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error(`[SOPPL Class Handler Fatal Error] Crash prevented in case ${ctx.dataType}:`, error);
      ctx.send({ type: "soppl:error", message: "internal_server_error_in_module" });
    }
  }
}
