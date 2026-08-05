import prisma from "../db/prisma";
import { GameMode } from "../types/GameMode";
import { Scoreboard } from "../types/Score";
import { UNO, UNOCard, UNOCardInHand, UNOPlayer, GameRules } from "../types/gamemode/UNO";

function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


function generateCardId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildUNODeck(): UNOCard[] {
    const colors: Array<"red" | "green" | "blue" | "yellow"> = ["red", "green", "blue", "yellow"];
    const deck: UNOCard[] = [];

    for (const color of colors) {
        // 0
        deck.push({ type: "number", color, value: 0 });
        // 1-9
        for (let n = 1; n <= 9; n++) {
            deck.push({ type: "number", color, value: n });
            deck.push({ type: "number", color, value: n });
        }
        // skip, reverse, draw2
        for (let i = 0; i < 2; i++) {
            deck.push({ type: "skip", color, value: "skip" });
            deck.push({ type: "reverse", color, value: "reverse" });
            deck.push({ type: "draw2", color, value: "draw2" });
        }
    }

    // wild/four draw4
    for (let i = 0; i < 4; i++) {
        deck.push({ type: "wild", color: "wild", value: "wild" });
        deck.push({ type: "draw4", color: "wild", value: "draw4" });
    }

    return deck;
}

function cardToHand(card: UNOCard): UNOCardInHand {
    return { ...card, id: generateCardId() };
}

export async function createGameModeData(
    mode: GameMode,
    playlistId: string | number | undefined,
    players: any[],
    scoreboard: Scoreboard
): Promise<any> {

    switch (mode) {
        case GameMode.QA:
            return { question: null, answers: [], Scoreboard: scoreboard };

        case GameMode.MUSIC_QUIZ: {
            if (!playlistId) throw new Error("music_quiz_requires_playlist");

            const tracks = await prisma.musicQuizPlaylistTrack.findMany({
                where: { playlistId: Number(playlistId) },
                include: { track: true }
            }) as any[];

            if (!tracks || tracks.length === 0) throw new Error("music_quiz_playlist_not_found");

            const shuffled = shuffleArray(tracks);
            return {
                currentTrackIndex: 0,
                currentTrack: shuffled[0].track,
                tracks: shuffled.map((t: any) => t.track),
                trackLength: shuffled.length,
                Scoreboard: scoreboard,
                replays: [],
                answers: []
            };
        }

        case GameMode.Karaoke_Solo:
        case GameMode.Karaoke_Duett: {
            if (!playlistId) throw new Error(`karaoke_${mode.toLowerCase()}_requires_playlist`);

            const playlist = await prisma.karaokePlaylist.findFirst({
                where: { id: Number(playlistId) },
                include: { Songs: { include: { Segments: { include: { Rows: { orderBy: { index: 'asc' } } } } } } }
            });
            if (!playlist || !playlist.Songs?.length) throw new Error("karaoke_playlist_empty");

            const firstSong = playlist.Songs[0];
            let pSegments;

            if (mode === GameMode.Karaoke_Solo) {
                pSegments = players.map((p: any) => ({ playerId: Number(p.id), segmentId: 0 }));
            } else {
                const segmentIndices = shuffleArray(firstSong.Segments.map((_: any, idx: number) => idx));
                pSegments = players.map((p: any, idx: number) => ({
                    playerId: Number(p.id),
                    segmentId: segmentIndices[idx % segmentIndices.length]
                }));
            }

            return {
                Playlist: playlist,
                Scoreboard: scoreboard,
                currentSong: { Song: firstSong, pSegments },
                inputs: [],
                outputs: [],
                state: "pending",
                isVoteOpen: false,
                votes: [],
                currentSongIndex: 0
            };
        }

        case GameMode.SMASH_OR_PASS:
            return {
                order: shuffleArray(players.map((p: any) => String(p.id))),
                currentIndex: 0,
                submissions: [],
                isVotingOpen: false,
                Scoreboard: scoreboard
            };

        case GameMode.SMASH_OR_PASS_PLAYLIST: {
            const items = await prisma.sopPlaylist.findMany({
                where: { id: Number(playlistId) },
                include: { Items: true }
            });
            if (!items || items.length === 0) throw new Error("smash_or_pass_playlist_not_found");

            return {
                items: items[0].Items,
                currentIndex: 0,
                currentVotes: [],
                pickerId: null,
                Scoreboard: scoreboard
            };
        }

        case GameMode.UNO: {
            const defaultRules: GameRules = {
                jumpin: false,
                canPlayMultipleCards: false,
                uno: true,
                unoPenalty: 2,
                initialCards: 7,
                deckType: "standard",
                resetCardsToDraw: true,
                drawStackingMode: "linear",
                endCondition: "last_standing"
            };

            const unoPlayers: { [playerId: string]: UNOPlayer } = {};
            const playerOrderIds: string[] = [];

            for (const p of players) {
                const pid = String(p.id);
                unoPlayers[pid] = {
                    cards: [],
                    name: p.username || 'Anonymous',
                    hasSaidUno: false,
                    stillPlaying: true,
                };
                playerOrderIds.push(pid);
            }

            const unoState: UNO = {
                currentTurnPlayerId: playerOrderIds[0] || "",
                playerOrderIds: playerOrderIds,
                topCard: null,
                drawPile: [],
                backLog: [],
                drawStack: 0,
                players: unoPlayers,
                playersWhoOut: [],
                Scoreboard: scoreboard,
                gameRules: defaultRules,
                state: {
                    direction: 1,
                    activePhase: "lobby",
                    activePhaseData: { phase: "lobby" },
                }
            };

            return unoState;
        }


        default:
            return null;
    }
}

export function startUNOMatch(unoState: UNO, players: any[], customRules?: GameRules): UNO {
    const rules = customRules || unoState.gameRules;

    let deck = shuffleArray(buildUNODeck());

    const unoPlayers: { [playerId: string]: UNOPlayer } = {};
    const playerOrderIds: string[] = [];

    for (const p of players) {
        const pid = String(p.id);
        const hand: UNOCardInHand[] = [];
        for (let i = 0; i < rules.initialCards; i++) {
            const card = deck.pop();
            if (card) hand.push(cardToHand(card));
        }
        unoPlayers[pid] = {
            cards: hand,
            name: p.username || 'Anonymous',
            hasSaidUno: false,
            stillPlaying: true,
        };
        playerOrderIds.push(pid);
    }

    let topCard: UNOCard | null = null;
    const backLog: UNOCard[] = [];
    while (deck.length > 0) {
        const candidate = deck.pop()!;
        if (candidate.type === "wild" || candidate.type === "draw4") {
            backLog.push(candidate);
        } else {
            topCard = candidate;
            break;
        }
    }

    if (!topCard) {
        deck = shuffleArray([...backLog]);
        backLog.length = 0;
        topCard = deck.pop() || null;
    }

    const shuffledOrder = shuffleArray(playerOrderIds);

    unoState.gameRules = rules;
    unoState.playerOrderIds = shuffledOrder;
    unoState.currentTurnPlayerId = shuffledOrder[0] || "";
    unoState.topCard = topCard;
    unoState.drawPile = deck;
    unoState.backLog = backLog;
    unoState.players = unoPlayers;
    unoState.playersWhoOut = [];
    unoState.state = {
        direction: 1,
        activePhase: "play",
        activePhaseData: { phase: "play" },
    };

    return unoState;
}