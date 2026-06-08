import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { Karaoke_Duett, KaraokeFile } from "../../types/gamemode/KARAOKE";
import { Game } from "../../types/Game";
import prisma from "../../db/prisma";
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

export class KaraokeDuettHandler implements IGameModeHandler {

    // --- Shared Helper: Discord Voice State Management ---
    private async setDiscordDeafenStatus(userIds: number[], deafen: boolean) {
        if (!userIds.length) return;
        try {
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { discordId: true }
            });

            const discordIds = users.map(u => u.discordId).filter(Boolean);
            if (!discordIds.length) return;

            const endpoint = deafen ? '/deafen' : '/undeafen';
            await fetch(`${process.env.DISCORD_API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds: discordIds,
                    guildId: process.env.DISCORD_GUILD_ID
                })
            });
        } catch (err) {
            console.error(`[Discord API Error] Failed to set deafen=${deafen} for users:`, err);
        }
    }

    // --- Shared Helper: Final Mix Generation ---
    private async finalizeKaraoke(game: Game) {
        const outputs = game.currentGameModeData?.outputs;
        if (!outputs || outputs.length === 0) throw new Error("No outputs to finalize");

        const inputsCount = outputs.length;

        const inputVolumes = outputs
            .map((_: any, idx: number) => `[${idx}:a]volume=1[a${idx}]`)
            .join(';');

        const inputLabels = outputs
            .map((_: any, idx: number) => `[a${idx}]`)
            .join('');

        const filterComplex = `${inputVolumes};${inputLabels}concat=n=${inputsCount}:v=0:a=1[out]`;

        const output = `${Date.now()}-final.mp3`;
        return new Promise((resolve, reject) => {
            const cmd = ffmpeg();
            outputs.forEach((out: KaraokeFile) => {
                cmd.input(`uploads/karaoke/output/${out.file}`);
            });

            cmd
                .complexFilter(filterComplex, ['out'])
                .saveToFile(`uploads/karaoke/output/${output}`)
                .on('end', () => resolve(output))
                .on('error', (err: any) => reject(err));
        });
    }

    async handleMessage(ctx: GameModeContext): Promise<void> {
        const kdData = ctx.game.currentGameModeData as Karaoke_Duett | undefined;

        if (!kdData) {
            console.error(`[KD Handler] State error: currentGameModeData is missing for game ${ctx.game.id}`);
            return;
        }

        try {
            switch (ctx.dataType) {
                case "kd:record_uploaded": {
                    const userId = Number(ctx.userId);
                    if (!userId || isNaN(userId)) return;

                    const fileUrl = typeof ctx.payload?.fileUrl === "string" ? ctx.payload.fileUrl : null;
                    if (!fileUrl) return;

                    // Async execution detached securely via the helper
                    this.setDiscordDeafenStatus([userId], false);

                    ffmpeg.setFfmpegPath(ffmpegStatic as string);
                    const output = `${Date.now()}-${userId}.mp3`;

                    let segmentId = kdData.currentSong?.pSegments?.find(s => s.playerId === userId)?.segmentId;
                    if (typeof segmentId !== "number") segmentId = 0;

                    const backingTrackUrl = kdData.currentSong?.Song?.Segments?.[segmentId]?.fileUrl;
                    if (!backingTrackUrl) {
                        return ctx.send({ type: "kd:error", message: "backing_track_not_found" });
                    }

                    ffmpeg()
                        .input(`uploads/karaoke/${backingTrackUrl}`)
                        .input(`uploads/karaoke/${fileUrl}`)
                        .outputOptions('-filter_complex', '[0]volume=0.2[a0];[1]volume=1[a1];[a0][a1]amix=inputs=2:duration=longest:normalize=0')
                        .saveToFile(`uploads/karaoke/output/${output}`)
                        .on('end', () => {
                            const ob: KaraokeFile = { playerId: userId, file: output };
                            kdData.outputs.push(ob);

                            if (kdData.outputs.length === ctx.game.lobby.players.length) {
                                this.finalizeKaraoke(ctx.game)
                                    .then((mixOutput: unknown) => {
                                        kdData.finalOutput = mixOutput as string;
                                        ctx.broadcast({ type: 'kd:playback_ready', payload: { file: mixOutput as string } });
                                    })
                                    .catch((err: any) => {
                                        console.error('[Final Mix Error]:', err);
                                    });

                                kdData.state = "reviewing";
                                ctx.broadcast({ type: "kd:round_finished", payload: { game: ctx.game } });
                            } else {
                                ctx.send({ type: "kd:proccess_completed" });
                            }
                        })
                        .on('error', (error: any) => {
                            console.error("[FFmpeg Processing Error]:", error);
                            ctx.send({ type: "kd:error", message: "audio_processing_failed" });
                        });
                    break;
                }

                case "kd:start_round": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "kd:error", payload: { status: "Access Denied" } });
                    }

                    const playerIds = ctx.game.lobby.players.map(p => Number(p.id)).filter(id => !isNaN(id));
                    this.setDiscordDeafenStatus(playerIds, true);

                    kdData.state = "pending";
                    kdData.isVoteOpen = false;
                    kdData.inputs = [];
                    kdData.outputs = [];
                    kdData.votes = [];

                    ctx.broadcast({ type: "kd:round_started", payload: { game: ctx.game } });
                    break;
                }

                case "kd:request_playback": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "kd:error", payload: { status: "Access Denied" } });
                    }

                    const targetUser = ctx.payload?.targetUser;
                    if (!targetUser) return;

                    ctx.broadcast({ type: "kd:force_playback", payload: { targetUser } });
                    break;
                }

                case "kd:open_vote": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "kd:error", payload: { status: "Access Denied" } });
                    }

                    kdData.isVoteOpen = true;
                    ctx.broadcast({ type: "kd:vote_opened" });
                    break;
                }

                case "kd:vote": {
                    const targetId = typeof ctx.payload?.targetId === "string" ? ctx.payload.targetId : null;
                    const voterId = ctx.userId;

                    if (!targetId || !voterId) return;

                    if (voterId === targetId) {
                        return ctx.send({ type: "kd:error", payload: { status: "You cant vote to yourself" } });
                    }

                    const oldVoteIndex = kdData.votes.findIndex(v => v.playerId === Number(voterId));
                    if (oldVoteIndex !== -1) {
                        if (kdData.votes[oldVoteIndex].votedPlayerId === targetId) return;
                        kdData.votes.splice(oldVoteIndex, 1);
                    }

                    kdData.votes.push({ playerId: Number(voterId), votedPlayerId: Number(targetId) });
                    ctx.broadcast({ type: "kd:update_votes", payload: { votes: kdData.votes } });
                    break;
                }

                case "kd:playFinal": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "kd:error", payload: { status: "Access Denied" } });
                    }
                    ctx.broadcast({ type: "kd:playFinal_force" });
                    break;
                }

                case "kd:next_song": {
                    if (ctx.userId !== ctx.game.lobby.host.id) return;

                    if (!kdData.Playlist || !kdData.Playlist.Songs) return;

                    if (kdData.currentSongIndex >= kdData.Playlist.Songs.length - 1) {
                        return ctx.send({ type: "kd:no_more_song" });
                    }

                    kdData.currentSongIndex++;
                    kdData.currentSong.Song = kdData.Playlist.Songs[kdData.currentSongIndex];
                    kdData.isVoteOpen = false;
                    kdData.inputs = [];
                    kdData.outputs = [];
                    kdData.votes = [];
                    kdData.finalOutput = null;

                    if (!kdData.currentSong.Song.Segments || kdData.currentSong.Song.Segments.length === 0) return;

                    const arr = [...kdData.currentSong.Song.Segments];
                    for (let i = arr.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                    }
                    kdData.currentSong.Song.Segments = arr;

                    kdData.state = "pending";
                    ctx.broadcast({ type: 'kd:update_gamedata', payload: { game: ctx.game } });
                    break;
                }

                default:
                    break;
            }
        } catch (error) {
            console.error(`[KD Class Handler Fatal Error] Crash prevented in case ${ctx.dataType}:`, error);
            ctx.send({ type: "kd:error", message: "internal_server_error_in_module" });
        }
    }
}
