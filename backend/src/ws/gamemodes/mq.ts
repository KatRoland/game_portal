
import { MUSIC_QUIZ, Answer } from "../../types/gamemode/MUSIC_QUIZ";
import { Game } from "../../types/Game";
import prisma from "../../db/prisma";

export async function handleMQMessages(user: any, data: any, game: Game, broadcast: (msg: any) => void, send: (msg: any) => void) {
    console.log('Handling MQ messages', data);
    console.log('Current game state', game);
    console.log("user:", user);

    switch (data.type) {
        case "mq:get_current_song": {
            console.log(game)
            console.log("\n\n\nget the song\n\n\n")

            const replayEntry = (game.currentGameModeData as MUSIC_QUIZ).replays.find(r => r.playerId === user.id);
            if (replayEntry && replayEntry.count >= 2) {
                send({ type: 'mq:replay_limit_reached', payload: { playerId: user.id } })
            }

            const song = (game.currentGameModeData as MUSIC_QUIZ).currentTrack
            const url = `https://gameapi.katroland.hu/musicquiz/tracks/${song.fileUrl.replace('music_quiz/', '')}`
            console.log(`\n\nURL:${url}\n\n`)
            send({ type: "mq:current_song:response", payload: { fileUrl: url } });
            break;
        }

        case "mq:next_song": {
            if (user.id != game.lobby.host.id) return;
            console.log(game.currentGameModeData)
            game.currentGameModeData.currentTrackIndex += 1;


            if (game.currentGameModeData.currentTrackIndex >= game.currentGameModeData.tracks.length) {
                send({ type: 'mq:no_more_songs', payload: { gameId: game.id } })
                return
            };

            const nextTrack = await prisma.musicQuizTrack.findFirst({
                where: {
                    id: game.currentGameModeData.tracks[game.currentGameModeData.currentTrackIndex].id
                }
            });
            if (!nextTrack) return;
            (game.currentGameModeData as MUSIC_QUIZ).currentTrack = nextTrack
            game.currentGameModeData.answers = []
            game.currentGameModeData.replays = []
            const url = `https://gameapi.katroland.hu/musicquiz/tracks/${nextTrack.fileUrl.replace('music_quiz/', '')}`
            const paylaod = {
                currentTrackIndex: game.currentGameModeData.currentTrackIndex,
                currentSong: url,
                answers: [],
                replays: []
            }
            broadcast({ type: 'mq:next_song_started', payload: paylaod })
            break;
        }

        case 'mq:replay_song': {
            const playerId = user.id;
            if (playerId) {
                const entry = (game.currentGameModeData as MUSIC_QUIZ).replays.find(r => r.playerId === playerId);
                if (entry) entry.count += 1;
                else (game.currentGameModeData as MUSIC_QUIZ).replays.push({ playerId, count: 1 });
                const replayEntry = (game.currentGameModeData as MUSIC_QUIZ).replays.find(r => r.playerId === playerId);
                if (replayEntry && replayEntry.count >= 3) {
                    send({ type: 'mq:replay_limit_reached', payload: { playerId: playerId } })
                }
            }
            break;
        }

        case "mq:start": {
            const gameId = data.payload.gameId

            broadcast({ type: 'mq:started', payload: { gameId: gameId } })
            break;
        }

        case "mq:submit_answer": {
            const playerId = typeof user?.id === "string" ? user.id : "";
            const playerName = typeof user?.username === "string" ? user.username : "Anonymous";
            const answer = typeof data.payload?.answer === "string" ? data.payload.answer : null;
            if (playerId && playerName && answer) {
                if ((game.currentGameModeData as MUSIC_QUIZ).answers.find(a => a.playerId === playerId)) {
                    console.log(`Player ${playerId} has already answered.`);
                    return;
                }
                (game.currentGameModeData as MUSIC_QUIZ).answers.push({ playerId, playerName, answer, state: "pending" });
                console.log("Updated answers:", (game.currentGameModeData as MUSIC_QUIZ).answers);
                broadcast({ type: "mq:update_answers", payload: { answers: (game.currentGameModeData as MUSIC_QUIZ).answers } });
            }
            break;
        }

        case "mq:accept_answer": {
            const playerId = typeof data.payload?.playerId === "string" ? data.payload.playerId : "";
            if (playerId) {
                const answer = (game.currentGameModeData as MUSIC_QUIZ).answers.find(a => a.playerId === playerId);
                if (answer) {
                    if (answer.state == "correct") return;
                    answer.state = "correct";
                    const entry = (game.currentGameModeData as MUSIC_QUIZ).Scoreboard.scores.find(s => s.playerId === playerId);
                    if (entry) entry.score += 1;
                    broadcast({ type: "mq:update_answers", payload: { answers: (game.currentGameModeData as MUSIC_QUIZ).answers } });
                    broadcast({ type: "mq:update_scoreboard", payload: { Scoreboard: (game.currentGameModeData as MUSIC_QUIZ).Scoreboard } });
                }
            }
            break;
        }

        case "mq:decline_answer": {
            const playerId = typeof data.payload?.playerId === "string" ? data.payload.playerId : "";
            if (playerId) {
                const answer = (game.currentGameModeData as MUSIC_QUIZ).answers.find(a => a.playerId === playerId);
                if (answer) {
                    if (answer.state == "incorrect") return;
                    const entry = (game.currentGameModeData as MUSIC_QUIZ).Scoreboard.scores.find(s => s.playerId === playerId);
                    if (entry) entry.score -= 1;
                    answer.state = "incorrect";
                    broadcast({ type: "mq:update_answers", payload: { answers: (game.currentGameModeData as MUSIC_QUIZ).answers } });
                    broadcast({ type: "mq:update_scoreboard", payload: { Scoreboard: (game.currentGameModeData as MUSIC_QUIZ).Scoreboard } });
                }
            }
            break;
        }
    }
}