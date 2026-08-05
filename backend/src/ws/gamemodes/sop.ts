import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { SMASH_OR_PASS, ImageSubmission } from "../../types/gamemode/SMASH_OR_PASS";

export class SOPHandler implements IGameModeHandler {

  private broadcastSubmissions(gd: SMASH_OR_PASS, broadcast: (msg: any) => void) {
    broadcast({ type: "sop:update_submissions", payload: { submissions: gd.submissions } });
  }

  async handleMessage(ctx: GameModeContext): Promise<void> {
    const gd = ctx.game.currentGameModeData as SMASH_OR_PASS | undefined;

    if (!gd) {
      console.error(`[SOP Handler] State error: currentGameModeData is missing for game ${ctx.game.id}`);
      return;
    }

    const isHost = String(ctx.game.lobby?.host?.id) === String(ctx.userId);

    try {
      switch (ctx.dataType) {
        case "sop:start": {
          if (!isHost) {
            return ctx.send({ type: "sop:error", message: "Access Denied" });
          }

          gd.currentIndex = 0;
          gd.isVotingOpen = false;
          gd.submissions = [];

          ctx.broadcast({ type: "sop:started", payload: { gameId: ctx.game.id, order: gd.order } });
          break;
        }

        case "sop:submit": {
          const title = typeof ctx.payload?.title === "string" ? ctx.payload.title : null;
          const fileUrl = typeof ctx.payload?.fileUrl === "string" ? ctx.payload.fileUrl : null;

          if (!title || !fileUrl) return;

          const playerId = String(ctx.userId);
          const currentPlayerId = String(gd.order?.[gd.currentIndex]);

          if (currentPlayerId !== playerId) {
            return ctx.send({ type: "sop:error", message: "not_your_turn" });
          }

          const existingIndex = gd.submissions.findIndex(s => String(s.playerId) === playerId);
          const sub: ImageSubmission = { playerId, title, fileUrl, votes: [] };

          if (existingIndex >= 0) {
            gd.submissions[existingIndex] = sub;
          } else {
            gd.submissions.push(sub);
          }

          this.broadcastSubmissions(gd, ctx.broadcast);
          break;
        }

        case "sop:open_voting": {
          if (!isHost) {
            return ctx.send({ type: "sop:error", message: "Access Denied" });
          }

          gd.isVotingOpen = true;
          ctx.broadcast({ type: "sop:voting_opened" });
          break;
        }

        case "sop:vote": {
          if (!gd.isVotingOpen) return;

          const targetId = ctx.payload?.targetId;
          const value = ctx.payload?.value;

          if (!targetId || (value !== 1 && value !== -1)) return;

          const playerId = String(ctx.userId);
          if (String(targetId) === playerId) {
            return ctx.send({ type: "sop:error", message: "You cant vote to yourself" });
          }

          const sub = gd.submissions.find(s => String(s.playerId) === String(targetId));
          if (!sub) return;

          const prevIndex = sub.votes.findIndex(v => String(v.voterId) === playerId);
          if (prevIndex !== -1) {
            if (sub.votes[prevIndex].value === value) return;
            sub.votes.splice(prevIndex, 1);
          }

          sub.votes.push({ voterId: playerId, value });
          ctx.broadcast({ type: "sop:update_votes", payload: { submissions: gd.submissions } });
          break;
        }

        case "sop:next": {
          if (!isHost) {
            return ctx.send({ type: "sop:error", message: "Access Denied" });
          }

          if (!gd.order || gd.order.length === 0) return;

          const prevPlayerId = String(gd.order[gd.currentIndex]);
          gd.submissions = gd.submissions.filter(s => String(s.playerId) !== prevPlayerId);

          this.broadcastSubmissions(gd, ctx.broadcast);

          gd.currentIndex = (gd.currentIndex + 1) % gd.order.length;
          gd.isVotingOpen = false;

          ctx.broadcast({ type: "sop:round_changed", payload: { currentIndex: gd.currentIndex } });
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error(`[SOP Class Handler Fatal Error] Crash prevented in case ${ctx.dataType}:`, error);
      ctx.send({ type: "sop:error", message: "internal_server_error_in_module" });
    }
  }

  onPlayerArchived(game: any, playerId: string): void {
    const sopData = game.currentGameModeData;
    if (!sopData || !sopData.Scoreboard) return;
    const scoreEntry = sopData.Scoreboard.scores?.find((s: any) => s.playerId === playerId);
    if (scoreEntry) scoreEntry.isArchived = true;
  }

  onPlayerRestored(game: any, playerId: string): void {
    const sopData = game.currentGameModeData;
    if (!sopData || !sopData.Scoreboard) return;
    const scoreEntry = sopData.Scoreboard.scores?.find((s: any) => s.playerId === playerId);
    if (scoreEntry) scoreEntry.isArchived = false;
  }
}
