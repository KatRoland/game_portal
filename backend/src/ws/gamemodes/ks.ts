import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { Karaoke_Solo, KaraokeFile } from "../../types/gamemode/KARAOKE";
import prisma from "../../db/prisma";
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

export class KaraokeSoloHandler implements IGameModeHandler {

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

    async handleMessage(ctx: GameModeContext): Promise<void> {
        const ksData = ctx.game.currentGameModeData as Karaoke_Solo | undefined;

        if (!ksData) {
            console.error(`[KS Handler] State error: currentGameModeData is missing for game ${ctx.game.id}`);
            return;
        }

        try {
            switch (ctx.dataType) {
                case "ks:record_uploaded": {
                    const userId = Number(ctx.userId);
                    if (!userId || isNaN(userId)) return;

                    const fileUrl = typeof ctx.payload?.fileUrl === "string" ? ctx.payload.fileUrl : null;
                    if (!fileUrl) return;

                    this.setDiscordDeafenStatus([userId], false);

                    ffmpeg.setFfmpegPath(ffmpegStatic as string);
                    const output = `${Date.now()}-${userId}.mp3`;

                    let segmentId = ksData.currentSong?.pSegments?.find(s => s.playerId === userId)?.segmentId;
                    if (typeof segmentId !== "number") segmentId = 0;

                    const backingTrackUrl = ksData.currentSong?.Song?.Segments?.[segmentId]?.fileUrl;
                    if (!backingTrackUrl) {
                        return ctx.send({ type: "ks:error", message: "backing_track_not_found" });
                    }

                    ffmpeg()
                        .input(`uploads/karaoke/${backingTrackUrl}`)
                        .input(`uploads/karaoke/${fileUrl}`)
                        .outputOptions('-filter_complex', '[0]volume=0.2[a0];[1]volume=1[a1];[a0][a1]amix=inputs=2:duration=longest:normalize=0')
                        .saveToFile(`uploads/karaoke/output/${output}`)
                        .on('end', () => {
                            const ob: KaraokeFile = { playerId: userId, file: output };
                            ksData.outputs.push(ob);

                            if (ksData.outputs.length === ctx.game.lobby.players.length) {
                                ksData.state = "reviewing";
                                ctx.broadcast({ type: "ks:round_finished", payload: { game: ctx.game } });
                            } else {
                                ctx.send({ type: "ks:proccess_completed" });
                            }
                        })
                        .on('error', (error: any) => {
                            console.error("[FFmpeg Processing Error]:", error);
                            ctx.send({ type: "ks:error", message: "audio_processing_failed" });
                        });
                    break;
                }

                case "ks:start_round": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "ks:error", payload: { status: "Access Denied" } });
                    }

                    const playerIds = ctx.game.lobby.players.map(p => Number(p.id)).filter(id => !isNaN(id));
                    this.setDiscordDeafenStatus(playerIds, true);

                    ksData.state = "pending";
                    ksData.isVoteOpen = false;
                    ksData.inputs = [];
                    ksData.outputs = [];
                    ksData.votes = [];

                    ctx.broadcast({ type: "ks:round_started", payload: { game: ctx.game } });
                    break;
                }

                case "ks:request_playback": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "ks:error", payload: { status: "Access Denied" } });
                    }

                    const targetUser = ctx.payload?.targetUser;
                    if (!targetUser) return;

                    ctx.broadcast({ type: "ks:force_playback", payload: { targetUser } });
                    break;
                }

                case "ks:open_vote": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "ks:error", payload: { status: "Access Denied" } });
                    }

                    ksData.isVoteOpen = true;
                    ctx.broadcast({ type: "ks:vote_opened" });
                    break;
                }

                case "ks:vote": {
                    const targetId = typeof ctx.payload?.targetId === "string" ? ctx.payload.targetId : null;
                    const voterId = ctx.userId;

                    if (!targetId || !voterId) return;

                    if (voterId === targetId) {
                        return ctx.send({ type: "ks:error", payload: { status: "You cant vote to yourself" } });
                    }

                    const oldVoteIndex = ksData.votes.findIndex(v => v.playerId === Number(voterId));
                    if (oldVoteIndex !== -1) {
                        if (ksData.votes[oldVoteIndex].votedPlayerId === Number(targetId)) return;
                        ksData.votes.splice(oldVoteIndex, 1);
                    }

                    ksData.votes.push({ playerId: Number(voterId), votedPlayerId: Number(targetId) });
                    ctx.broadcast({ type: "ks:update_votes", payload: { votes: ksData.votes } });
                    break;
                }

                case "ks:next_song": {
                    if (ctx.userId !== ctx.game.lobby.host.id) return;

                    if (!ksData.Playlist || !ksData.Playlist.Songs) return;

                    if (ksData.currentSongIndex >= ksData.Playlist.Songs.length - 1) {
                        return ctx.send({ type: "ks:no_more_song" });
                    }

                    ksData.currentSongIndex++;
                    ksData.currentSong.Song = ksData.Playlist.Songs[ksData.currentSongIndex];
                    ksData.isVoteOpen = false;
                    ksData.inputs = [];
                    ksData.outputs = [];
                    ksData.votes = [];
                    ksData.state = "pending";

                    ctx.broadcast({ type: 'ks:update_gamedata', payload: { game: ctx.game } });
                    break;
                }

                default:
                    break;
            }
        } catch (error) {
            console.error(`[KS Class Handler Fatal Error] Crash prevented in case ${ctx.dataType}:`, error);
            ctx.send({ type: "ks:error", message: "internal_server_error_in_module" });
        }
    }
}
