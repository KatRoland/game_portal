
import { KaraokeSong, KaraokeSongSegment, KaraokeSongLyrics, KaraokePlaylist, Karaoke, KaraokeCurrentSong, KaraokeFile, Karaoke_Duett } from "../../types/gamemode/KARAOKE"
import { Game } from "../../types/Game";
import prisma from "../../db/prisma";
const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

async function finalizeKaraoke(game: Game) {
    const inputsCount = game.currentGameModeData.outputs.length;

    const inputVolumes = game.currentGameModeData.outputs
        .map((_: any, idx: number) => `[${idx}:a]volume=1[a${idx}]`)
        .join(';');

    const inputLabels = game.currentGameModeData.outputs
        .map((_: any, idx: number) => `[a${idx}]`)
        .join('');

    const filterComplex = `${inputVolumes};${inputLabels}concat=n=${inputsCount}:v=0:a=1[out]`;

    const output = `${Date.now()}-final.mp3`;
    return new Promise((resolve, reject) => {
        const cmd = ffmpeg();
        game.currentGameModeData.outputs.forEach((out: KaraokeFile) => {
            cmd.input(`uploads/karaoke/output/${out.file}`);
        });

        cmd
            .complexFilter(filterComplex, ['out'])
            .saveToFile(`uploads/karaoke/output/${output}`)
            .on('end', () => resolve(output))
            .on('error', (err: any) => reject(err));
    });
}


export async function handleKDMessages(user: any, data: any, game: Game, broadcast: (msg: any) => void, send: (msg: any) => void) {
    // console.log('Handling KD messages', data);
    // console.log('Current game state', game);
    // console.log("user:", user); 

    switch (data.type) {
        case "kd:record_uploaded": {

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
            let output: string = `${Date.now()}-${user.id}.mp3`
            let segmentId = (game.currentGameModeData as Karaoke_Duett).currentSong.pSegments.find(s => s.playerId == user.id)?.segmentId
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
                    (game.currentGameModeData as Karaoke_Duett).outputs.push(ob)

                    if (game.currentGameModeData.outputs.length == game.lobby.players.length) {

                        finalizeKaraoke(game).then((output: unknown) => {
                            game.currentGameModeData.finalOutput = output as string;
                            broadcast({ type: 'kd:playback_ready', payload: { file: output as string } });
                        })
                            .catch((err: any) => {
                                console.error('Final mix error:', err);
                            });

                        game.currentGameModeData.state = "reviewing"
                        broadcast({ type: "kd:round_finished", payload: { game: game } })
                    } else {
                        send({ type: "kd:proccess_completed" })
                    }
                })

                .on('error', (error: any) => {
                    console.error(error);

                });
            break;
        }

        case "kd:start_round": {
            if (game.lobby.host.id != user.id) {
                send({ type: "kd:error", payload: { status: "Access Denied" } })
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
            broadcast({ type: "kd:round_started", payload: { game: game } })
            break;

        }

        case "kd:request_playback": {
            if (game.lobby.host.id != user.id) {
                send({ type: "kd:error", payload: { status: "Access Denied" } })
                return;
            }

            broadcast({ type: "kd:force_playback", payload: { targetUser: data.payload.targetUser } })
            break;

        }

        case "kd:open_vote": {
            if (game.lobby.host.id != user.id) {
                send({ type: "kd:error", payload: { status: "Access Denied" } })
                return;
            }

            game.currentGameModeData.isVoteOpen = true;

            broadcast({ type: "kd:vote_opened" })
            break;
        }

        case "kd:vote": {
            if (user.id == data.payload.targetId) {
                send({ type: "kd:error", payload: { status: "You cant vote to yourself" } });
                return;
            }
            const currentData = game.currentGameModeData as Karaoke_Duett;
            const oldVote = currentData.votes.find(v => v.playerId == user.id)
            if (oldVote) {
                if (oldVote.votedPlayerId == data.payload.targetId) return;
                currentData.votes = currentData.votes.filter(v => v.playerId != user.id);
            }

            currentData.votes.push({ playerId: user.id, votedPlayerId: data.payload.targetId })
            broadcast({ type: "kd:update_votes", payload: { votes: currentData.votes } })
            break;

        }

        case "kd:playFinal": {
            if (game.lobby.host.id != user.id) {
                send({ type: "kd:error", payload: { status: "Access Denied" } })
                return;
            }
            broadcast({ type: "kd:playFinal_force" })
            break;
        }


        case "kd:next_song": {
            if (user.id != game.lobby.host) return;

            const currentData = game.currentGameModeData as Karaoke_Duett;
            if (!currentData.Playlist || !currentData.Playlist.Songs) return;
            if (currentData.currentSongIndex >= currentData.Playlist.Songs.length - 1) {
                send({ type: "ks:no_more_song" })
                return;
            }

            currentData.currentSongIndex++;
            currentData.currentSong.Song = currentData.Playlist.Songs[currentData.currentSongIndex]
            currentData.isVoteOpen = false;
            currentData.inputs = [];
            currentData.outputs = [];
            currentData.votes = [],
                currentData.finalOutput = null;

            if (!currentData.currentSong.Song.Segments || currentData.currentSong.Song.Segments.length == 0) return;
            currentData.currentSong.Song.Segments = currentData.currentSong.Song.Segments.sort(() => Math.random() - 0.5);

            currentData.state = "pending"
            broadcast({ type: 'kd:update_gamedata', payload: { game: game } })
            break;
        }
    }
}