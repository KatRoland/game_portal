import { Game } from "../../types/Game";
import { SOP_PLAYLIST_DATA } from "../../types/gamemode/SOP_PLAYLIST";

export function handleSOPPLMessages(user: any, data: any, game: Game, broadcast: (msg: any) => void, send: (msg: any) => void) {
  if (!user) return;
  const gd = game.currentGameModeData as SOP_PLAYLIST_DATA;

  switch (data.type) {
    case "soppl:start": {
      if (String(game.lobby.host.id) !== String(user.id)) return;
      gd.currentIndex = 0;
      gd.currentVotes = [];
      gd.pickerId = null;
      broadcast({ type: "soppl:started", payload: { gameId: game.id } });
      break;
    }

    case "soppl:set_playlist": {
      if (String(game.lobby.host.id) !== String(user.id)) return;
      const playlistId = data.payload?.playlistId;
      if (!playlistId) return;
      (game.currentGameModeData as any).playlistId = playlistId;
      gd.currentIndex = 0;
      gd.currentVotes = [];
      gd.pickerId = null;
      broadcast({ type: "soppl:playlist_set", payload: { playlistId } });
      break;
    }

    case "soppl:next": {
      if (String(game.lobby.host.id) !== String(user.id)) return;
      if (!gd.items || gd.items.length === 0) return;
      gd.currentIndex = (gd.currentIndex + 1) % gd.items.length;
      gd.currentVotes = [];
      gd.pickerId = Math.random() < 0.1 ? pickRandomPlayer(game) : null;
      broadcast({ type: "soppl:changed", payload: { currentIndex: gd.currentIndex, pickerId: gd.pickerId } });
      break;
    }

    case "soppl:vote": {
      const { value } = data.payload || {};
      if (value !== 1 && value !== -1) return;
      const voterId = String(user.id);
      if (gd.pickerId && String(gd.pickerId) !== voterId) return;
      const existing = gd.currentVotes.find(v => v.voterId === voterId);
      if (existing) {
        if (existing.value === value) return;
        gd.currentVotes = gd.currentVotes.filter(v => v.voterId !== voterId);
      }
      gd.currentVotes.push({ voterId, value });
      broadcast({ type: "soppl:update_votes", payload: { votes: gd.currentVotes } });
      break;
    }
  }
}

function pickRandomPlayer(game: Game): string | null {
  const players = game.lobby.players || [];
  if (players.length === 0) return null;
  const idx = Math.floor(Math.random() * players.length);
  return String(players[idx].id);
}
