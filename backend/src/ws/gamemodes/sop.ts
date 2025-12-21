import { Game } from "../../types/Game";
import { SMASH_OR_PASS, ImageSubmission } from "../../types/gamemode/SMASH_OR_PASS";

export function handleSOPMessages(user: any, data: any, game: Game, broadcast: (msg: any) => void, send: (msg: any) => void) {
  if (!user) return;
  const gd = game.currentGameModeData as SMASH_OR_PASS;

  switch (data.type) {
    case "sop:start": {
      if (String(game.lobby.host.id) !== String(user.id)) return;
      gd.currentIndex = 0;
      gd.isVotingOpen = false;
      gd.submissions = [];
      broadcast({ type: "sop:started", payload: { gameId: game.id, order: gd.order } });
      break;
    }

    case "sop:submit": {
      const { title, fileUrl } = data.payload || {};
      if (!title || !fileUrl) return;
      const playerId = String(user.id);
      // vizsgáljuk hogy a jelenlegi játékos-e
      const currentPlayerId = gd.order[gd.currentIndex];
      if (String(currentPlayerId) !== playerId) return;
      const existingIndex = gd.submissions.findIndex(s => s.playerId === playerId);
      const sub: ImageSubmission = { playerId, title, fileUrl, votes: [] };
      if (existingIndex >= 0) {
        gd.submissions[existingIndex] = sub;
      } else {
        gd.submissions.push(sub);
      }
      broadcast({ type: "sop:update_submissions", payload: { submissions: gd.submissions } });
      break;
    }

    case "sop:open_voting": {
      if (String(game.lobby.host.id) !== String(user.id)) return;
      gd.isVotingOpen = true;
      broadcast({ type: "sop:voting_opened" });
      break;
    }

    case "sop:vote": {
      if (!gd.isVotingOpen) return;
      const { targetId, value } = data.payload || {};
      if (!targetId || (value !== 1 && value !== -1)) return;
      const playerId = String(user.id);
      if (String(targetId) === playerId) return;
      const sub = gd.submissions.find(s => String(s.playerId) === String(targetId));
      if (!sub) return;
      const prev = sub.votes.find(v => v.voterId === playerId);
      if (prev) {
        if (prev.value === value) return;
        sub.votes = sub.votes.filter(v => v.voterId !== playerId);
      }
      sub.votes.push({ voterId: playerId, value });
      broadcast({ type: "sop:update_votes", payload: { submissions: gd.submissions } });
      break;
    }

    case "sop:next": {
      if (String(game.lobby.host.id) !== String(user.id)) return;
      if (gd.order.length === 0) return;
      const prevPlayerId = gd.order[gd.currentIndex];
      gd.submissions = gd.submissions.filter(s => String(s.playerId) !== String(prevPlayerId));
      broadcast({ type: "sop:update_submissions", payload: { submissions: gd.submissions } });
      gd.currentIndex = (gd.currentIndex + 1) % gd.order.length;
      gd.isVotingOpen = false;
      broadcast({ type: "sop:round_changed", payload: { currentIndex: gd.currentIndex } });
      break;
    }
  }
}
