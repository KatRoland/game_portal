import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { UNO, UNOCard, UNOCardInHand, GameRules, UNOPhase, UNOPhaseData, UNOPlayer } from "../../types/gamemode/UNO";
import {
    shuffleArray,
    generateCardId,
    buildUNODeck,
    buildInfiniteDeck,
    cardToHand,
    generateStartHand,
    isValidCard,
} from "../../lib/unoHelper";

function getNextPlayerIndex(
    currentId: string,
    playerOrderIds: string[],
    direction: 1 | -1,
    players: { [playerId: string]: UNOPlayer },
    skip: number = 0
): string {
    const currentIndex = playerOrderIds.indexOf(currentId);
    const len = playerOrderIds.length;
    let steps = 1 + skip;
    let idx = currentIndex;

    while (steps > 0) {
        idx = (idx + direction + len) % len;
        if (players[playerOrderIds[idx]]?.stillPlaying) {
            steps--;
        }
    }

    return playerOrderIds[idx];
}

function drawCards(
    unoData: UNO,
    playerId: string,
    count: number
): void {
    const player = unoData.players[playerId];
    if (!player) return;

    for (let i = 0; i < count; i++) {
        if (unoData.gameRules.deckType === "infinite") {
            const pool = buildInfiniteDeck();
            const randomCard = pool[Math.floor(Math.random() * pool.length)];
            player.cards.push(cardToHand(randomCard));
        } else {
            if (unoData.drawPile.length === 0) {
                if (unoData.backLog.length === 0) {
                    console.warn("[UNO] Draw pile and backlog are both empty!");
                    break;
                }
                unoData.drawPile = shuffleArray(unoData.backLog);
                unoData.backLog = [];
            }
            const card = unoData.drawPile.pop();
            if (card) {
                player.cards.push(cardToHand(card));
            }
        }
    }
}

function broadcastState(ctx: GameModeContext, unoData: UNO): void {
    ctx.game.currentGameModeData = unoData;
    ctx.broadcast({
        type: "uno:card_played",
        payload: { unoData }
    });
}

export class UnoHandler implements IGameModeHandler {

    async handleMessage(ctx: GameModeContext): Promise<void> {
        const unoData = ctx.game.currentGameModeData as UNO | undefined;
        console.log(`[UNO] received ${ctx.dataType}`);

        if (!unoData) {
            console.error(`[Uno Handler] State error: currentGameModeData is missing for game ${ctx.game.id}`);
            return;
        }

        try {
            switch (ctx.dataType) {

                case "uno:start_round": {
                    console.log(`[UNO] HANDLING uno:start_round`);
                    const { gameId, rules } = ctx.payload || {};

                    if (gameId !== ctx.game.id) {
                        console.warn(`[Uno Handler] Game ID mismatch in uno:start_round`);
                        return;
                    }

                    if (ctx.userId !== ctx.game.lobby.host.id) {
                        ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "not_host" } });
                        return;
                    }

                    if (unoData.state.activePhase !== "lobby" || unoData.state.activePhaseData.phase !== "lobby") {
                        console.warn(`[Uno Handler] uno:start_round called when phase is not setup`);
                        return;
                    }

                    const players = ctx.game.lobby.players;

                    if (!players || players.length < 1 || players.length > 10) {
                        ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "invalid_player_count" } });
                        return;
                    }

                    const activeRules = rules ? { ...unoData.gameRules, ...rules } : unoData.gameRules;
                    let currentDeck: UNOCard[] = activeRules.deckType === "infinite"
                        ? buildInfiniteDeck()
                        : shuffleArray(buildUNODeck());

                    const unoPlayers: { [playerId: string]: UNOPlayer } = {};
                    for (const p of players) {
                        const [hand, remainingDeck] = generateStartHand(activeRules, currentDeck);
                        currentDeck = remainingDeck;
                        unoPlayers[String(p.id)] = {
                            cards: hand,
                            name: p.username || "Unknown",
                            hasSaidUno: false,
                            stillPlaying: true
                        };
                    }
                    const playerOrderIds = shuffleArray(players.map((p: any) => String(p.id)));

                    let topCard: UNOCard;
                    if (activeRules.deckType === "infinite") {
                        const validCards = currentDeck.filter(c => c.type !== "wild" && c.type !== "draw4");
                        topCard = validCards[Math.floor(Math.random() * validCards.length)];
                    } else {
                        topCard = currentDeck.pop()!;
                        while (topCard.type === "wild" || topCard.type === "draw4") {
                            currentDeck.push(topCard);
                            currentDeck = shuffleArray(currentDeck);
                            topCard = currentDeck.pop()!;
                        }
                    }

                    const newUnoState: UNO = {
                        ...unoData,
                        gameRules: activeRules,
                        currentTurnPlayerId: playerOrderIds[0],
                        playerOrderIds: playerOrderIds,
                        topCard: topCard,
                        drawPile: currentDeck,
                        backLog: [],
                        players: unoPlayers,
                        playersWhoOut: [],
                        state: {
                            ...unoData.state,
                            direction: 1,
                            activePhase: "play",
                            activePhaseData: { phase: "play" }
                        }
                    };
                    ctx.game.currentGameModeData = newUnoState;

                    ctx.broadcast({
                        type: "uno:round_started",
                        payload: {
                            unoData: newUnoState
                        }
                    });
                    break;
                }

                case "uno:play_card": {
                    console.log(`[UNO] HANDLING uno:play_card`);
                    const { gameId, cardId } = ctx.payload || {};

                    if (gameId !== ctx.game.id) {
                        console.warn(`[Uno Handler] Game ID mismatch in uno:play_card`);
                        return;
                    }

                    const currentPhase = unoData.state.activePhaseData.phase;
                    if (currentPhase !== "play") {
                        console.warn(`[Uno Handler] uno:play_card called when phase is ${currentPhase}`);
                        return;
                    }

                    if (String(ctx.userId) !== unoData.currentTurnPlayerId) {
                        ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "not_your_turn" } });
                        return;
                    }

                    const currentPlayer = unoData.players[String(ctx.userId)];

                    if (!currentPlayer) {
                        console.warn(`[Uno Handler] Current player not found`);
                        return;
                    }

                    const card = currentPlayer.cards.find(c => c.id === cardId);

                    if (!card) {
                        console.warn(`[Uno Handler] Card not found in player's hand`);
                        return;
                    }

                    const canPlay = isValidCard(card, unoData.topCard);

                    if (!canPlay) {
                        ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "invalid_card" } });
                        return;
                    }

                    if (card.type === "wild" || card.type === "draw4") {
                        currentPlayer.cards = currentPlayer.cards.filter(c => c.id !== cardId);

                        unoData.state.activePhase = "choose_color";
                        unoData.state.activePhaseData = {
                            phase: "choose_color",
                            pendingCard: { ...card }
                        };

                        broadcastState(ctx, unoData);
                        break;
                    }

                    if (card.type === "draw2") {
                        currentPlayer.cards = currentPlayer.cards.filter(c => c.id !== cardId);

                        if (unoData.topCard) {
                            unoData.backLog.push(unoData.topCard);
                        }
                        unoData.topCard = card;

                        const victimId = getNextPlayerIndex(
                            unoData.currentTurnPlayerId,
                            unoData.playerOrderIds,
                            unoData.state.direction,
                            unoData.players
                        );
                        drawCards(unoData, victimId, 2);

                        const nextTurnId = getNextPlayerIndex(
                            unoData.currentTurnPlayerId,
                            unoData.playerOrderIds,
                            unoData.state.direction,
                            unoData.players,
                            1
                        );

                        if (currentPlayer.cards.length === 0) {
                            currentPlayer.stillPlaying = false;
                            unoData.playersWhoOut.push({
                                index: unoData.playersWhoOut.length + 1,
                                playerId: String(ctx.userId)
                            });
                        }

                        unoData.currentTurnPlayerId = nextTurnId;
                        unoData.state.activePhase = "play";
                        unoData.state.activePhaseData = { phase: "play" };

                        broadcastState(ctx, unoData);
                        break;
                    }

                    if (card.type === "reverse") {
                        currentPlayer.cards = currentPlayer.cards.filter(c => c.id !== cardId);

                        if (unoData.topCard) {
                            unoData.backLog.push(unoData.topCard);
                        }
                        unoData.topCard = card;

                        unoData.state.direction = unoData.state.direction === 1 ? -1 : 1;

                        const activePlayers = unoData.playerOrderIds.filter(
                            id => unoData.players[id]?.stillPlaying
                        );

                        let nextTurnId: string;
                        if (activePlayers.length === 2) {
                            nextTurnId = unoData.currentTurnPlayerId;
                        } else {
                            nextTurnId = getNextPlayerIndex(
                                unoData.currentTurnPlayerId,
                                unoData.playerOrderIds,
                                unoData.state.direction,
                                unoData.players
                            );
                        }

                        if (currentPlayer.cards.length === 0) {
                            currentPlayer.stillPlaying = false;
                            unoData.playersWhoOut.push({
                                index: unoData.playersWhoOut.length + 1,
                                playerId: String(ctx.userId)
                            });
                            if (nextTurnId === unoData.currentTurnPlayerId) {
                                nextTurnId = getNextPlayerIndex(
                                    unoData.currentTurnPlayerId,
                                    unoData.playerOrderIds,
                                    unoData.state.direction,
                                    unoData.players
                                );
                            }
                        }

                        unoData.currentTurnPlayerId = nextTurnId;
                        unoData.state.activePhase = "play";
                        unoData.state.activePhaseData = { phase: "play" };

                        broadcastState(ctx, unoData);
                        break;
                    }

                    if (card.type === "skip") {
                        currentPlayer.cards = currentPlayer.cards.filter(c => c.id !== cardId);

                        if (unoData.topCard) {
                            unoData.backLog.push(unoData.topCard);
                        }
                        unoData.topCard = card;

                        const nextTurnId = getNextPlayerIndex(
                            unoData.currentTurnPlayerId,
                            unoData.playerOrderIds,
                            unoData.state.direction,
                            unoData.players,
                            1
                        );

                        if (currentPlayer.cards.length === 0) {
                            currentPlayer.stillPlaying = false;
                            unoData.playersWhoOut.push({
                                index: unoData.playersWhoOut.length + 1,
                                playerId: String(ctx.userId)
                            });
                        }

                        unoData.currentTurnPlayerId = nextTurnId;
                        unoData.state.activePhase = "play";
                        unoData.state.activePhaseData = { phase: "play" };

                        broadcastState(ctx, unoData);
                        break;
                    }

                    currentPlayer.cards = currentPlayer.cards.filter(c => c.id !== cardId);

                    if (unoData.topCard) {
                        unoData.backLog.push(unoData.topCard);
                    }
                    unoData.topCard = card;

                    let nextTurnId = getNextPlayerIndex(
                        unoData.currentTurnPlayerId,
                        unoData.playerOrderIds,
                        unoData.state.direction,
                        unoData.players
                    );

                    if (currentPlayer.cards.length === 0) {
                        currentPlayer.stillPlaying = false;
                        unoData.playersWhoOut.push({
                            index: unoData.playersWhoOut.length + 1,
                            playerId: String(ctx.userId)
                        });
                    }

                    unoData.currentTurnPlayerId = nextTurnId;
                    unoData.state.activePhase = "play";
                    unoData.state.activePhaseData = { phase: "play" };

                    broadcastState(ctx, unoData);
                    break;
                }

                case "uno:choose_color": {
                    console.log(`[UNO] HANDLING uno:choose_color`);
                    const { gameId, color } = ctx.payload || {};

                    if (gameId !== ctx.game.id) {
                        console.warn(`[Uno Handler] Game ID mismatch in uno:choose_color`);
                        return;
                    }

                    if (unoData.state.activePhaseData.phase !== "choose_color") {
                        console.warn(`[Uno Handler] uno:choose_color called when phase is not choose_color`);
                        return;
                    }

                    if (String(ctx.userId) !== unoData.currentTurnPlayerId) {
                        ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "not_your_turn" } });
                        return;
                    }

                    const validColors = ["red", "green", "blue", "yellow"];
                    if (!validColors.includes(color)) {
                        ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "invalid_color" } });
                        return;
                    }

                    const pendingCard = (unoData.state.activePhaseData as { phase: "choose_color"; pendingCard: UNOCard }).pendingCard;

                    const resolvedCard: UNOCard = {
                        ...pendingCard,
                        color: color as "red" | "green" | "blue" | "yellow"
                    };

                    if (unoData.topCard) {
                        unoData.backLog.push(unoData.topCard);
                    }
                    unoData.topCard = resolvedCard;

                    const currentPlayer = unoData.players[String(ctx.userId)];

                    if (currentPlayer && currentPlayer.cards.length === 0) {
                        currentPlayer.stillPlaying = false;
                        unoData.playersWhoOut.push({
                            index: unoData.playersWhoOut.length + 1,
                            playerId: String(ctx.userId)
                        });
                    }

                    if (pendingCard.type === "draw4") {
                        const victimId = getNextPlayerIndex(
                            unoData.currentTurnPlayerId,
                            unoData.playerOrderIds,
                            unoData.state.direction,
                            unoData.players
                        );
                        drawCards(unoData, victimId, 4);

                        const nextTurnId = getNextPlayerIndex(
                            unoData.currentTurnPlayerId,
                            unoData.playerOrderIds,
                            unoData.state.direction,
                            unoData.players,
                            1
                        );

                        unoData.currentTurnPlayerId = nextTurnId;
                    } else {
                        const nextTurnId = getNextPlayerIndex(
                            unoData.currentTurnPlayerId,
                            unoData.playerOrderIds,
                            unoData.state.direction,
                            unoData.players
                        );
                        unoData.currentTurnPlayerId = nextTurnId;
                    }

                    unoData.state.activePhase = "play";
                    unoData.state.activePhaseData = { phase: "play" };

                    broadcastState(ctx, unoData);
                    break;
                }

                case "uno:draw_card": {
                    console.log(`[UNO] HANDLING uno:draw_card`);
                    const { gameId } = ctx.payload || {};

                    if (gameId !== ctx.game.id) {
                        console.warn(`[Uno Handler] Game ID mismatch in uno:draw_card`);
                        return;
                    }

                    if (unoData.state.activePhaseData.phase !== "play") {
                        console.warn(`[Uno Handler] uno:draw_card called when phase is not play`);
                        return;
                    }

                    if (String(ctx.userId) !== unoData.currentTurnPlayerId) {
                        ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "not_your_turn" } });
                        return;
                    }

                    drawCards(unoData, String(ctx.userId), 1);

                    const nextTurnId = getNextPlayerIndex(
                        unoData.currentTurnPlayerId,
                        unoData.playerOrderIds,
                        unoData.state.direction,
                        unoData.players
                    );

                    unoData.currentTurnPlayerId = nextTurnId;
                    unoData.state.activePhase = "play";
                    unoData.state.activePhaseData = { phase: "play" };

                    broadcastState(ctx, unoData);
                    break;
                }

                default:
                    break;
            }
        } catch (error) {
            console.error(`[uno Class Handler Fatal Error] Crash prevented in case ${ctx.dataType}:`, error);
            ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "internal_server_error_in_module" } });
        }
    }
}
