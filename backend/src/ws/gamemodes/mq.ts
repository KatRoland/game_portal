import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { MUSIC_QUIZ } from "../../types/gamemode/MUSIC_QUIZ";
import prisma from "../../db/prisma";

export class MusicQuizHandler implements IGameModeHandler {

    // Privát helper a pontozási hálózati frissítésekhez
    private sendAnswerUpdates(ctx: GameModeContext, mqData: MUSIC_QUIZ) {
        const recipients = new Set<string>();
        recipients.add(ctx.game.lobby.host.id);
        mqData.answers.forEach(a => recipients.add(a.playerId));

        for (const uid of recipients) {
            ctx.sendToUser(uid, { type: "mq:update_answers", payload: { answers: mqData.answers } });
        }

        ctx.broadcast({ type: "mq:update_scoreboard", payload: { Scoreboard: mqData.Scoreboard } });
    }

    // Az interfész által megkövetelt fő metódus
    async handleMessage(ctx: GameModeContext): Promise<void> {
        const mqData = ctx.game.currentGameModeData as MUSIC_QUIZ | undefined;

        // Golyóálló null-guard az in-memory adatokra
        if (!mqData) {
            console.error(`[MQ Handler] State error: currentGameModeData is missing for game ${ctx.game.id}`);
            return;
        }

        try {
            // A switch most már a ctx.dataType-ra (a data.type-ra) épít
            switch (ctx.dataType) {

                case "mq:get_current_song": {
                    const replayEntry = mqData.replays.find(r => r.playerId === ctx.userId);
                    if (replayEntry && replayEntry.count >= 2) {
                        return ctx.send({ type: 'mq:replay_limit_reached', payload: { playerId: ctx.userId } });
                    }

                    const song = mqData.currentTrack;
                    if (!song || !song.fileUrl) {
                        return ctx.send({ type: "mq:error", message: "no_track_loaded" });
                    }

                    const url = `https://gameapi.katroland.hu/musicquiz/tracks/${song.fileUrl.replace('music_quiz/', '')}`;
                    ctx.send({ type: "mq:current_song:response", payload: { fileUrl: url } });
                    break;
                }

                case "mq:next_song": {
                    if (ctx.userId !== ctx.game.lobby.host.id) return;

                    mqData.currentTrackIndex += 1;
                    if (mqData.currentTrackIndex >= mqData.tracks.length) {
                        return ctx.send({ type: 'mq:no_more_songs', payload: { gameId: ctx.game.id } });
                    }

                    const nextTrack = await prisma.musicQuizTrack.findFirst({
                        where: { id: mqData.tracks[mqData.currentTrackIndex].id }
                    });

                    if (!nextTrack) {
                        return ctx.send({ type: "mq:error", message: "track_database_error" });
                    }

                    mqData.currentTrack = nextTrack;
                    mqData.answers = [];
                    mqData.replays = [];

                    const url = `https://gameapi.katroland.hu/musicquiz/tracks/${nextTrack.fileUrl.replace('music_quiz/', '')}`;

                    ctx.broadcast({
                        type: 'mq:next_song_started',
                        payload: {
                            currentTrackIndex: mqData.currentTrackIndex,
                            currentSong: url,
                            answers: [],
                            replays: []
                        }
                    });
                    break;
                }

                case 'mq:replay_song': {
                    const entry = mqData.replays.find(r => r.playerId === ctx.userId);
                    if (entry) {
                        entry.count += 1;
                    } else {
                        mqData.replays.push({ playerId: ctx.userId, count: 1 });
                    }

                    if (entry && entry.count >= 3) {
                        ctx.send({ type: 'mq:replay_limit_reached', payload: { playerId: ctx.userId } });
                    }
                    break;
                }

                case "mq:start": {
                    ctx.broadcast({ type: 'mq:started', payload: { gameId: ctx.payload?.gameId } });
                    break;
                }

                case "mq:submit_answer": {
                    const answer = typeof ctx.payload?.answer === "string" ? ctx.payload.answer : null;
                    if (!answer) return;

                    if (mqData.answers.some(a => a.playerId === ctx.userId)) {
                        return ctx.send({ type: "mq:already_answered", payload: { playerId: ctx.userId } });
                    }

                    const playerName = ctx.user.username ?? "Anonymous";
                    mqData.answers.push({ playerId: ctx.userId, playerName, answer, state: "pending" });

                    const players = ctx.game.lobby.players;
                    const playersWhoAnswered = players.filter(p => mqData.answers.some(a => a.playerId === p.id));

                    const recipients = new Set<string>();
                    recipients.add(ctx.game.lobby.host.id);
                    playersWhoAnswered.forEach(p => recipients.add(p.id));

                    for (const uid of recipients) {
                        ctx.sendToUser(uid, { type: "mq:update_answers", payload: { answers: mqData.answers } });
                    }

                    if (playersWhoAnswered.length === players.length) {
                        ctx.broadcast({ type: "mq:update_answers", payload: { answers: mqData.answers } });
                    }
                    break;
                }

                case "mq:accept_answer": {
                    if (ctx.userId !== ctx.game.lobby.host.id) return;
                    const targetPlayerId = typeof ctx.payload?.playerId === "string" ? ctx.payload.playerId : "";
                    if (!targetPlayerId) return;

                    const answer = mqData.answers.find(a => a.playerId === targetPlayerId);
                    if (answer && answer.state !== "correct") {
                        answer.state = "correct";
                        const scoreEntry = mqData.Scoreboard.scores.find(s => s.playerId === targetPlayerId);
                        if (scoreEntry) scoreEntry.score += 1;

                        this.sendAnswerUpdates(ctx, mqData);
                    }
                    break;
                }

                case "mq:decline_answer": {
                    if (ctx.userId !== ctx.game.lobby.host.id) return;
                    const targetPlayerId = typeof ctx.payload?.playerId === "string" ? ctx.payload.playerId : "";
                    if (!targetPlayerId) return;

                    const answer = mqData.answers.find(a => a.playerId === targetPlayerId);
                    if (answer && answer.state !== "incorrect") {
                        const scoreEntry = mqData.Scoreboard.scores.find(s => s.playerId === targetPlayerId);
                        if (scoreEntry) scoreEntry.score -= 1;
                        answer.state = "incorrect";

                        this.sendAnswerUpdates(ctx, mqData);
                    }
                    break;
                }
            }
        } catch (error) {
            console.error(`[Fatal MQ Class Error] Crash prevented in case ${ctx.dataType}:`, error);
            ctx.send({ type: "mq:error", message: "internal_server_error_in_module" });
        }
    }

    onPlayerArchived(game: any, playerId: string): void {
        const mqData = game.currentGameModeData;
        if (!mqData || !mqData.Scoreboard) return;
        const scoreEntry = mqData.Scoreboard.scores?.find((s: any) => s.playerId === playerId);
        if (scoreEntry) scoreEntry.isArchived = true;
    }

    onPlayerRestored(game: any, playerId: string): void {
        const mqData = game.currentGameModeData;
        if (!mqData || !mqData.Scoreboard) return;
        const scoreEntry = mqData.Scoreboard.scores?.find((s: any) => s.playerId === playerId);
        if (scoreEntry) scoreEntry.isArchived = false;
    }
}