import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { Hitster, HitsterTimelineItem, HitsterCard, HitsterTurnState } from "../../types/gamemode/HITSTER";
import { isFuzzyMatch } from "../../utils/fuzzyMatch";
import prisma from "../../db/prisma";

async function fetchRandomUnusedHitsterSongs(gameId: string, countToFetch: number): Promise<HitsterCard[]> {
    const used = await prisma.hitsterSongsUsed.findMany({
        where: { gameId },
        select: { songId: true }
    });
    const usedIds = used.map((u: any) => u.songId);

    const availableCount = await prisma.hitsterSong.count({
        where: { id: { notIn: usedIds } }
    });

    if (availableCount < countToFetch) return [];

    const selectedSongs: HitsterCard[] = [];
    const usedSkips = new Set<number>();
    const returnedIds: string[] = [];

    for (let i = 0; i < countToFetch; i++) {
        let skip;
        do {
            skip = Math.floor(Math.random() * availableCount);
        } while (usedSkips.has(skip));
        usedSkips.add(skip);

        const song = await prisma.hitsterSong.findFirst({
            where: { id: { notIn: usedIds } },
            skip
        });

        if (song) {
            selectedSongs.push(song as any);
            returnedIds.push(song.id);
        }
    }

    if (returnedIds.length > 0) {
        await prisma.hitsterSongsUsed.createMany({
            data: returnedIds.map(songId => ({ gameId, songId }))
        });
    }

    return selectedSongs;
}

export class HitsterHandler implements IGameModeHandler {

    async handleMessage(ctx: GameModeContext): Promise<void> {
        const hitsterData = ctx.game.currentGameModeData as Hitster | undefined;
        console.log(`[Hitster] received ${ctx.dataType}`);

        if (!hitsterData) {
            console.error(`[Hitster Handler] State error: currentGameModeData is missing for game ${ctx.game.id}`);
            return;
        }

        function broadcast(dataType: string = "hitster:state_updated") {
            ctx.broadcast({ type: dataType, payload: { hitsterData } });
        }

        try {
            switch (ctx.dataType) {
                case "hitster:ready": {
                    if (hitsterData.players[ctx.userId]) {
                        console.log(`[Hitster] User ${ctx.userId} is ready`);
                        hitsterData.players[ctx.userId].isReady = true;
                        broadcast("hitster:state_updated");
                    }
                    break;
                }

                case "hitster:unready": {
                    if (hitsterData.players[ctx.userId]) {
                        hitsterData.players[ctx.userId].isReady = false;
                        broadcast("hitster:state_updated");
                    }
                    break;
                }

                case "hitster:update_settings": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "only_host_can_update_settings" } });
                    }

                    const stealRule = ctx.payload.stealRule;
                    if (stealRule === 'BAD_GUESS' || stealRule === 'LOWER_HIGHER') {
                        hitsterData.stealRule = stealRule;
                        broadcast("hitster:state_updated");
                    }
                    break;
                }

                case "hitster:add_team": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "only_host_can_add_team" } });
                    }
                    if (hitsterData.teamOrder.length >= 6) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "max_teams_reached" } });
                    }
                    const newTeamId = `team${Date.now()}`;
                    const newTeamNum = hitsterData.teamOrder.length + 1;
                    hitsterData.teams[newTeamId] = {
                        teamId: newTeamId,
                        name: `Team ${newTeamNum}`,
                        playerIds: [],
                        leaderId: null,
                        timeline: [],
                        tokens: 3,
                        proposedGuesses: []
                    };
                    hitsterData.teamOrder.push(newTeamId);
                    broadcast("hitster:state_updated");
                    break;
                }

                case "hitster:remove_team": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "only_host_can_remove_team" } });
                    }
                    const targetTeamId = ctx.payload.teamId;
                    if (hitsterData.teamOrder.length <= 2) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "min_teams_reached" } });
                    }
                    if (!hitsterData.teams[targetTeamId]) return;

                    for (const pid of hitsterData.teams[targetTeamId].playerIds) {
                        if (hitsterData.players[pid]) {
                            hitsterData.players[pid].teamId = null;
                        }
                    }
                    delete hitsterData.teams[targetTeamId];
                    hitsterData.teamOrder = hitsterData.teamOrder.filter(id => id !== targetTeamId);
                    broadcast("hitster:state_updated");
                    break;
                }

                case "hitster:join_team": {
                    console.log(`[Hitster] HANDLING JOIN TEAM ${ctx.payload.teamId} for user ${ctx.userId}`)
                    const targetTeamId = ctx.payload.teamId;
                    if (!hitsterData.teams[targetTeamId] || !hitsterData.players[ctx.userId]) return;

                    const oldTeamId = hitsterData.players[ctx.userId].teamId;
                    if (oldTeamId && hitsterData.teams[oldTeamId]) {
                        hitsterData.teams[oldTeamId].playerIds = hitsterData.teams[oldTeamId].playerIds.filter(id => id !== ctx.userId);
                        if (hitsterData.teams[oldTeamId].leaderId === ctx.userId) {
                            hitsterData.teams[oldTeamId].leaderId = hitsterData.teams[oldTeamId].playerIds[0] || null;
                        }
                        hitsterData.teams[oldTeamId].proposedGuesses = hitsterData.teams[oldTeamId].proposedGuesses.filter(g => g.playerId !== ctx.userId);
                    }

                    hitsterData.teams[targetTeamId].playerIds.push(ctx.userId);
                    hitsterData.players[ctx.userId].teamId = targetTeamId;
                    if (!hitsterData.teams[targetTeamId].leaderId) {
                        hitsterData.teams[targetTeamId].leaderId = ctx.userId;
                    }

                    broadcast("hitster:state_updated");
                    break;
                }

                case "hitster:change_leader": {
                    const teamId = hitsterData.players[ctx.userId]?.teamId;
                    const newLeaderId = ctx.payload.playerId;

                    if (!teamId || !hitsterData.teams[teamId]) return;

                    if (ctx.game.lobby.host.id !== ctx.userId && hitsterData.teams[teamId].leaderId !== ctx.userId) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "not_authorized" } });
                    }

                    if (hitsterData.teams[teamId].playerIds.includes(newLeaderId)) {
                        hitsterData.teams[teamId].leaderId = newLeaderId;
                        broadcast("hitster:state_updated");
                    }
                    break;
                }

                case "hitster:propose_guess": {
                    const teamId = hitsterData.players[ctx.userId]?.teamId;
                    const index = typeof ctx.payload.index === "number" ? ctx.payload.index : -1;

                    if (!teamId || !hitsterData.teams[teamId] || index < 0) return;
                    if (hitsterData.teams[teamId].leaderId === ctx.userId) return;

                    let existing = hitsterData.teams[teamId].proposedGuesses.find(g => g.playerId === ctx.userId);
                    if (existing) {
                        existing.index = index;
                    } else {
                        hitsterData.teams[teamId].proposedGuesses.push({ playerId: ctx.userId, index });
                    }
                    broadcast("hitster:state_updated");
                    break;
                }

                case "hitster:start_game": {
                    if (ctx.game.lobby.host.id !== ctx.userId) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "only_host_can_start" } });
                    }

                    const allReady = Object.values(hitsterData.players).every(p => p.isReady);
                    if (!allReady) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "not_all_players_ready" } });
                    }

                    const allAssigned = Object.values(hitsterData.players).every(p => p.teamId !== null);
                    if (!allAssigned) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "not_all_players_assigned" } });
                    }

                    const activeTeams = hitsterData.teamOrder.filter(tid => hitsterData.teams[tid].playerIds.length > 0);
                    if (activeTeams.length < 2) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "not_enough_teams" } });
                    }

                    const leadersOk = activeTeams.every(tid => hitsterData.teams[tid].leaderId !== null);
                    if (!leadersOk) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "teams_missing_leaders" } });
                    }

                    const counts = activeTeams.map(tid => hitsterData.teams[tid].playerIds.length);
                    const min = Math.min(...counts);
                    const max = Math.max(...counts);
                    if (max - min > 1) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "teams_unbalanced" } });
                    }

                    const totalNeeded = activeTeams.length + 1;

                    await prisma.hitsterSongsUsed.deleteMany({ where: { gameId: ctx.game.id } });

                    const selectedSongs = await fetchRandomUnusedHitsterSongs(ctx.game.id, totalNeeded);
                    if (selectedSongs.length < totalNeeded) {
                        return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "not_enough_songs_in_db" } });
                    }

                    activeTeams.forEach((tid, i) => {
                        const song = selectedSongs[i];
                        hitsterData.teams[tid].timeline.push({ index: 0, card: song as any });
                    });

                    hitsterData.teamOrder = activeTeams;
                    hitsterData.currentTurnTeamId = hitsterData.teamOrder[0];
                    hitsterData.currentSong = selectedSongs[activeTeams.length] as any;
                    hitsterData.state = 'PLAYING';

                    hitsterData.turnState = {
                        phase: 'NAME_GUESS_ACTIVE',
                        nameGuessedCorrectly: false,
                        nameCallQueue: [],
                        nameGuessHistory: [],
                        activeTeamProposedIndex: null,
                        challenges: [],
                        challengeTimerEndsAt: null
                    };

                    broadcast("hitster:game_started");
                    break;
                }

                case "hitster:guess_name": {
                    const teamId = hitsterData.players[ctx.userId]?.teamId;
                    if (!teamId || !hitsterData.turnState || !hitsterData.currentSong) return;

                    const isNameActivePhase = hitsterData.turnState.phase === 'NAME_GUESS_ACTIVE';
                    const isPositionGuessPhase = hitsterData.turnState.phase === 'POSITION_GUESS';

                    let canGuess = false;
                    if (isNameActivePhase && teamId === hitsterData.currentTurnTeamId) canGuess = true;
                    else if (isPositionGuessPhase && hitsterData.turnState.nameCallQueue[0] === teamId) canGuess = true;

                    if (!canGuess) return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "not_your_turn_to_guess" } });

                    const guessText = ctx.payload.guess || "";
                    const targetText = `${hitsterData.currentSong.artist} - ${hitsterData.currentSong.title}`;

                    const isCorrect = isFuzzyMatch(guessText, targetText, 3);

                    if (isCorrect) {
                        hitsterData.teams[teamId].tokens += 1;
                        hitsterData.turnState.nameGuessedCorrectly = true;
                        hitsterData.turnState.nameCallQueue = [];
                        if (isNameActivePhase) hitsterData.turnState.phase = 'POSITION_GUESS';
                    } else {
                        hitsterData.turnState.nameGuessHistory.push({ teamId, guessText, isCorrect: false });
                        if (isNameActivePhase) {
                            hitsterData.turnState.phase = 'POSITION_GUESS';
                        } else if (isPositionGuessPhase) {
                            hitsterData.turnState.nameCallQueue.shift();
                        }
                    }

                    broadcast("hitster:state_updated");
                    break;
                }

                case "hitster:pass_name": {
                    const teamId = hitsterData.players[ctx.userId]?.teamId;
                    if (teamId !== hitsterData.currentTurnTeamId || hitsterData.turnState?.phase !== 'NAME_GUESS_ACTIVE') return;

                    hitsterData.turnState.phase = 'POSITION_GUESS';
                    broadcast("hitster:state_updated");
                    break;
                }

                case "hitster:call_name": {
                    const teamId = hitsterData.players[ctx.userId]?.teamId;
                    if (!teamId || !hitsterData.turnState || hitsterData.turnState.phase !== 'POSITION_GUESS') return;
                    if (teamId === hitsterData.currentTurnTeamId || hitsterData.turnState.nameGuessedCorrectly) return;

                    const hasFailed = hitsterData.turnState.nameGuessHistory.some(h => h.teamId === teamId);
                    if (hasFailed) return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "already_guessed_wrong" } });

                    if (!hitsterData.turnState.nameCallQueue.includes(teamId)) {
                        hitsterData.turnState.nameCallQueue.push(teamId);
                        broadcast("hitster:state_updated");
                    }
                    break;
                }

                case "hitster:lock_position": {
                    const teamId = hitsterData.players[ctx.userId]?.teamId;
                    if (!teamId || !hitsterData.turnState || hitsterData.turnState.phase !== 'POSITION_GUESS') return;
                    if (teamId !== hitsterData.currentTurnTeamId || hitsterData.teams[teamId].leaderId !== ctx.userId) return;
                    if (hitsterData.turnState.nameCallQueue.length > 0) return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "blocked_by_caller" } });

                    const index = ctx.payload.index;
                    if (typeof index !== 'number') return;

                    hitsterData.turnState.activeTeamProposedIndex = index;
                    hitsterData.turnState.phase = 'POSITION_CHALLENGE';
                    hitsterData.turnState.challengeTimerEndsAt = Date.now() + 10000;

                    broadcast("hitster:state_updated");

                    setTimeout(() => {
                        if (hitsterData && hitsterData.turnState && hitsterData.turnState.phase === 'POSITION_CHALLENGE') {
                            hitsterData.turnState.phase = 'REVEAL';
                            broadcast("hitster:state_updated");
                        }
                    }, 10000);
                    break;
                }

                case "hitster:challenge_position": {
                    const teamId = hitsterData.players[ctx.userId]?.teamId;
                    if (!teamId || !hitsterData.turnState || hitsterData.turnState.phase !== 'POSITION_CHALLENGE') return;
                    if (teamId === hitsterData.currentTurnTeamId) return;

                    const challengeType = ctx.payload.type;
                    if (!['BAD_GUESS', 'LOWER', 'HIGHER'].includes(challengeType)) return;
                    if (hitsterData.teams[teamId].tokens < 1) return ctx.send({ type: "hitster:error", payload: { notificationLevel: "toast", message: "not_enough_tokens" } });

                    const existing = hitsterData.turnState.challenges.find(c => c.teamId === teamId);
                    if (!existing) {
                        hitsterData.teams[teamId].tokens -= 1;
                        hitsterData.turnState.challenges.push({ teamId, type: challengeType });
                        broadcast("hitster:state_updated");
                    }
                    break;
                }

                case "hitster:host_override_name": {
                    if (ctx.game.lobby.host.id !== ctx.userId || !hitsterData.turnState || hitsterData.turnState.phase !== 'REVEAL') return;

                    const teamId = ctx.payload.teamId;
                    if (hitsterData.teams[teamId] && !hitsterData.turnState.nameGuessedCorrectly) {
                        hitsterData.teams[teamId].tokens += 1;
                        hitsterData.turnState.nameGuessedCorrectly = true;

                        const log = hitsterData.turnState.nameGuessHistory.find(h => h.teamId === teamId);
                        if (log) log.isCorrect = true;

                        broadcast("hitster:state_updated");
                    }
                    break;
                }

                case "hitster:next_turn": {
                    if (ctx.game.lobby.host.id !== ctx.userId || !hitsterData.turnState || hitsterData.turnState.phase !== 'REVEAL') return;

                    const actualYear = hitsterData.currentSong?.year;
                    const proposedIndex = hitsterData.turnState.activeTeamProposedIndex;
                    const activeTeam = hitsterData.teams[hitsterData.currentTurnTeamId!];

                    if (actualYear && proposedIndex !== null && activeTeam) {
                        const timeline = activeTeam.timeline;
                        let isCorrect = true;
                        let wasLower = false;
                        let wasHigher = false;

                        if (proposedIndex > 0 && timeline[proposedIndex - 1].card.year > actualYear) {
                            isCorrect = false;
                            wasLower = true;
                        }
                        if (proposedIndex < timeline.length && timeline[proposedIndex].card.year < actualYear) {
                            isCorrect = false;
                            wasHigher = true;
                        }

                        if (isCorrect) {
                            activeTeam.timeline.splice(proposedIndex, 0, { index: proposedIndex, card: hitsterData.currentSong! });
                        } else {
                            for (const challenge of hitsterData.turnState.challenges) {
                                let challengeWon = false;
                                if (challenge.type === 'BAD_GUESS') challengeWon = true;
                                else if (challenge.type === 'LOWER' && wasLower) challengeWon = true;
                                else if (challenge.type === 'HIGHER' && wasHigher) challengeWon = true;

                                if (challengeWon) {
                                    hitsterData.teams[challenge.teamId].timeline.push({ index: 0, card: hitsterData.currentSong! });
                                    break;
                                }
                            }
                        }

                        for (const tid in hitsterData.teams) {
                            hitsterData.teams[tid].timeline.sort((a, b) => a.card.year - b.card.year);
                            hitsterData.teams[tid].timeline.forEach((item, i) => item.index = i);
                        }
                    }

                    const currentIndex = hitsterData.teamOrder.indexOf(hitsterData.currentTurnTeamId!);
                    hitsterData.currentTurnTeamId = hitsterData.teamOrder[(currentIndex + 1) % hitsterData.teamOrder.length];

                    hitsterData.turnState = {
                        phase: 'NAME_GUESS_ACTIVE',
                        nameGuessedCorrectly: false,
                        nameCallQueue: [],
                        nameGuessHistory: [],
                        activeTeamProposedIndex: null,
                        challenges: [],
                        challengeTimerEndsAt: null
                    };

                    const newSongs = await fetchRandomUnusedHitsterSongs(ctx.game.id, 1);
                    if (newSongs.length > 0) {
                        hitsterData.currentSong = newSongs[0];
                    } else {
                        hitsterData.state = 'GAME_OVER';
                    }

                    broadcast("hitster:state_updated");
                    break;
                }

                default:
                    break;
            }
        } catch (error) {
            console.error(`[Hitster Class Handler Fatal Error] Crash prevented in case ${ctx.dataType}:`, error);
            ctx.send({ type: "Hitster:error", payload: { notificationLevel: "modal", message: "internal_server_error_in_module" } });
        }
    }
}
