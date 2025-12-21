
import { KaraokeSong, KaraokeSongSegment, KaraokeSongLyrics, KaraokePlaylist, Karaoke, KaraokeCurrentSong, KaraokeFile, Karaoke_Solo } from "../../types/gamemode/KARAOKE"
import { Game } from "../../types/Game";
import prisma from "../../db/prisma";
const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');


export async function handleKSMessages(user: any, data: any, game: Game, broadcast: (msg: any) => void, send: (msg: any) => void) {
    switch (data.type) {
        case "ks:record_uploaded": {

            prisma.user.findUnique({
                where: {
                    id: Number(user.id)
                },
                select: {
                    discordId: true
                }
            }).then(async (res: any) => {
                console.log(res)
                await fetch(`${process.env.DISCORD_API_URL}/undeafen`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userIds: [res.discordId],
                        guildId: process.env.DISCORD_GUILD_ID
                    })
                })
                    .then((res: any) => {
                        console.log(res)
                    })
                    .catch((err: any) => {
                        console.error(err);
                    })
            })

            ffmpeg.setFfmpegPath(ffmpegStatic);
            const output: string = `${Date.now()}-${user.id}.mp3`
            let segmentId = (game.currentGameModeData as Karaoke_Solo).currentSong.pSegments.find(s => s.playerId == user.id)?.segmentId
            if (!segmentId) segmentId = 0;

            ffmpeg()
                .input(`uploads/karaoke/${game.currentGameModeData.currentSong.Song.Segments[segmentId].fileUrl}`)
                .input(`uploads/karaoke/${data.payload.fileUrl}`)
                .outputOptions('-filter_complex', '[0]volume=0.2[a0];[1]volume=1[a1];[a0][a1]amix=inputs=2:duration=longest:normalize=0')
                .saveToFile(`uploads/karaoke/output/${output}`)
                .on('progress', (progress: any) => {
                    if (progress.percent) {
                        console.log(`Processing: ${Math.floor(progress.percent)}% done`);
                    }
                })

                .on('end', () => {
                    console.log('FFmpeg has finished.');
                    const ob = { playerId: user.id, file: output } as KaraokeFile;
                    (game.currentGameModeData as Karaoke_Solo).outputs.push(ob)

                    if (game.currentGameModeData.outputs.length == game.lobby.players.length) {
                        game.currentGameModeData.state = "reviewing"
                        broadcast({ type: "ks:round_finished", payload: { game: game } })
                    } else {

                        send({ type: "ks:proccess_completed" })
                    }
                })

                .on('error', (error: any) => {
                    console.error(error);

                });
            break;
        }

        case "ks:start_round": {
            if (game.lobby.host.id != user.id) {
                send({ type: "ks:error", payload: { status: "Access Denied" } })
                return;
            }

            prisma.user.findMany({
                where: {
                    id: {
                        in: game.lobby.players.map(p => Number(p.id))
                    }
                },
                select: {
                    discordId: true
                }
            })
                .then(async (res: any) => {
                    console.log(res)
                    await fetch(`${process.env.DISCORD_API_URL}/deafen`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userIds: res.map((u: any) => u.discordId),
                            guildId: process.env.DISCORD_GUILD_ID
                        })
                    })
                        .then((res: any) => {
                            console.log(res)
                        })
                        .catch((err: any) => {
                            console.error(err);
                        })
                })



            game.currentGameModeData.state = "pending";
            game.currentGameModeData.isVoteOpen = false;
            game.currentGameModeData.inputs = [];
            game.currentGameModeData.outputs = [];
            game.currentGameModeData.votes = []
            broadcast({ type: "ks:round_started", payload: { game: game } })
            break;

        }

        case "ks:request_playback": {
            if (game.lobby.host.id != user.id) {
                send({ type: "ks:error", payload: { status: "Access Denied" } })
                return;
            }

            broadcast({ type: "ks:force_playback", payload: { targetUser: data.payload.targetUser } })
            break;

        }

        case "ks:open_vote": {
            if (game.lobby.host.id != user.id) {
                send({ type: "ks:error", payload: { status: "Access Denied" } })
                return;
            }

            game.currentGameModeData.isVoteOpen = true;

            broadcast({ type: "ks:vote_opened" })
            break;
        }

        case "ks:vote": {
            if (user.id == data.payload.targetId) {
                send({ type: "ks:error", payload: { status: "You cant vote to yourself" } });
                return;
            }
            const currentData = game.currentGameModeData as Karaoke_Solo;
            const oldVote = currentData.votes.find(v => v.playerId == user.id)
            if (oldVote) {
                if (oldVote.votedPlayerId == data.payload.targetId) return;
                currentData.votes = currentData.votes.filter(v => v.playerId != user.id);
            }

            currentData.votes.push({ playerId: user.id, votedPlayerId: data.payload.targetId })
            broadcast({ type: "ks:update_votes", payload: { votes: currentData.votes } })
            break;

        }

        case "ks:next_song": {
            if (user.id != game.lobby.host.id) return;
            const currentData = game.currentGameModeData as Karaoke_Solo;
            console.log(currentData)
            if (!currentData.Playlist || !currentData.Playlist.Songs) return;
            if (currentData.currentSongIndex >= currentData.Playlist.Songs.length - 1) {
                send({ type: "ks:no_more_song" })
                return;
            }

            console.log("not returned on tudja a fasz if check")

            currentData.currentSongIndex++;
            currentData.currentSong.Song = currentData.Playlist.Songs[currentData.currentSongIndex]
            currentData.isVoteOpen = false;
            currentData.inputs = [];
            currentData.outputs = [];
            currentData.votes = [],
                currentData.state = "pending"
            broadcast({ type: 'ks:update_gamedata', payload: { game: game } })
            break;
        }
    }
}