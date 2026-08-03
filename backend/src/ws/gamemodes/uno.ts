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
                        drawStack: 0,
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
                    const { gameId, cardId, cardIds: rawCardIds } = ctx.payload || {};

                    if (gameId !== ctx.game.id) {
                        console.warn(`[Uno Handler] Game ID mismatch in uno:play_card`);
                        return;
                    }

                    const currentPhase = unoData.state.activePhaseData.phase;
                    if (currentPhase !== "play" && currentPhase !== "draw_pending") {
                        console.warn(`[Uno Handler] uno:play_card called when phase is ${currentPhase}`);
                        return;
                    }

                    const playerId = String(ctx.userId);
                    const currentPlayer = unoData.players[playerId];

                    if (!currentPlayer) {
                        console.warn(`[Uno Handler] Player not found`);
                        return;
                    }

                    const cardIds: string[] = rawCardIds || (cardId ? [cardId] : []);
                    if (cardIds.length === 0) {
                        console.warn(`[Uno Handler] No card IDs provided`);
                        return;
                    }

                    const cards: UNOCardInHand[] = [];
                    for (const cid of cardIds) {
                        const found = currentPlayer.cards.find(c => c.id === cid);
                        if (!found) {
                            ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "card_not_found" } });
                            return;
                        }
                        cards.push(found);
                    }

                    const firstCard = cards[0];

                    if (cards.length > 1) {
                        if (!unoData.gameRules.canPlayMultipleCards) {
                            ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "multiple_cards_not_allowed" } });
                            return;
                        }
                        if (!cards.every(c => c.type === firstCard.type && c.color === firstCard.color && c.value === firstCard.value)) {
                            ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "cards_must_be_identical" } });
                            return;
                        }
                        if (firstCard.type === "wild") {
                            ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "cannot_multi_play_wild" } });
                            return;
                        }
                    }

                    const isCurrentTurn = playerId === unoData.currentTurnPlayerId;

                    if (!isCurrentTurn) {
                        if (!unoData.gameRules.jumpin || currentPhase !== "play") {
                            ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "not_your_turn" } });
                            return;
                        }
                        if (!unoData.topCard ||
                            firstCard.type !== unoData.topCard.type ||
                            firstCard.color !== unoData.topCard.color ||
                            firstCard.value !== unoData.topCard.value) {
                            ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "not_your_turn" } });
                            return;
                        }
                        unoData.currentTurnPlayerId = playerId;
                    }

                    if (currentPhase === "draw_pending") {
                        const pendingData = unoData.state.activePhaseData as { phase: "draw_pending"; drawAmount: number; drawType: "draw2" | "draw4" };
                        if (firstCard.type !== pendingData.drawType) {
                            ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "must_counter_or_draw" } });
                            return;
                        }
                    } else {
                        if (!isValidCard(firstCard, unoData.topCard)) {
                            ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "invalid_card" } });
                            return;
                        }
                    }

                    const cardIdSet = new Set(cardIds);
                    const hadCardsBefore = currentPlayer.cards.length;
                    currentPlayer.cards = currentPlayer.cards.filter(c => !cardIdSet.has(c.id));

                    if (
                        unoData.gameRules.uno &&
                        hadCardsBefore >= 2 &&
                        currentPlayer.cards.length === 1 &&
                        !currentPlayer.hasSaidUno
                    ) {
                        const penaltyAmount = unoData.gameRules.unoPenalty || 2;
                        drawCards(unoData, playerId, penaltyAmount);
                        currentPlayer.hasSaidUno = false;
                        ctx.send({
                            type: "uno:error",
                            payload: { notificationLevel: "toast", message: `uno_penalty_drew_${penaltyAmount}_cards` }
                        });
                    }

                    currentPlayer.hasSaidUno = false;

                    if (unoData.topCard) {
                        unoData.backLog.push(unoData.topCard);
                    }
                    for (let i = 0; i < cards.length - 1; i++) {
                        unoData.backLog.push(cards[i]);
                    }
                    unoData.topCard = cards[cards.length - 1];

                    const count = cards.length;

                    if (firstCard.type === "wild" || firstCard.type === "draw4") {
                        if (firstCard.type === "draw4") {
                            const baseAmount = 4;
                            if (unoData.gameRules.drawStackingMode === "multiply") {
                                unoData.drawStack = Math.max(unoData.drawStack, 1);
                                for (let i = 0; i < count; i++) unoData.drawStack *= baseAmount;
                            } else {
                                unoData.drawStack += count * baseAmount;
                            }
                        }

                        unoData.state.activePhase = "choose_color";
                        unoData.state.activePhaseData = {
                            phase: "choose_color",
                            pendingCard: { ...firstCard }
                        };

                        broadcastState(ctx, unoData);
                        break;
                    }

                    if (firstCard.type === "draw2") {
                        const baseAmount = 2;
                        if (unoData.gameRules.drawStackingMode === "multiply") {
                            unoData.drawStack = Math.max(unoData.drawStack, 1);
                            for (let i = 0; i < count; i++) unoData.drawStack *= baseAmount;
                        } else {
                            unoData.drawStack += count * baseAmount;
                        }

                        const nextTurnId = getNextPlayerIndex(
                            unoData.currentTurnPlayerId,
                            unoData.playerOrderIds,
                            unoData.state.direction,
                            unoData.players
                        );

                        if (currentPlayer.cards.length === 0) {
                            currentPlayer.stillPlaying = false;
                            unoData.playersWhoOut.push({
                                index: unoData.playersWhoOut.length + 1,
                                playerId: playerId
                            });
                        }

                        unoData.currentTurnPlayerId = nextTurnId;
                        unoData.state.activePhase = "draw_pending";
                        unoData.state.activePhaseData = {
                            phase: "draw_pending",
                            drawAmount: unoData.drawStack,
                            drawType: "draw2"
                        };

                        broadcastState(ctx, unoData);
                        break;
                    }

                    if (firstCard.type === "reverse") {
                        if (count % 2 === 1) {
                            unoData.state.direction = unoData.state.direction === 1 ? -1 : 1;
                        }

                        const activePlayers = unoData.playerOrderIds.filter(
                            id => unoData.players[id]?.stillPlaying
                        );

                        let nextTurnId: string;
                        if (activePlayers.length === 2 && count % 2 === 1) {
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
                                playerId: playerId
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

                    if (firstCard.type === "skip") {
                        const nextTurnId = getNextPlayerIndex(
                            unoData.currentTurnPlayerId,
                            unoData.playerOrderIds,
                            unoData.state.direction,
                            unoData.players,
                            count
                        );

                        if (currentPlayer.cards.length === 0) {
                            currentPlayer.stillPlaying = false;
                            unoData.playersWhoOut.push({
                                index: unoData.playersWhoOut.length + 1,
                                playerId: playerId
                            });
                        }

                        unoData.currentTurnPlayerId = nextTurnId;
                        unoData.state.activePhase = "play";
                        unoData.state.activePhaseData = { phase: "play" };

                        broadcastState(ctx, unoData);
                        break;
                    }

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
                            playerId: playerId
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
                        const nextTurnId = getNextPlayerIndex(
                            unoData.currentTurnPlayerId,
                            unoData.playerOrderIds,
                            unoData.state.direction,
                            unoData.players
                        );

                        unoData.currentTurnPlayerId = nextTurnId;
                        unoData.state.activePhase = "draw_pending";
                        unoData.state.activePhaseData = {
                            phase: "draw_pending",
                            drawAmount: unoData.drawStack,
                            drawType: "draw4"
                        };
                    } else {
                        const nextTurnId = getNextPlayerIndex(
                            unoData.currentTurnPlayerId,
                            unoData.playerOrderIds,
                            unoData.state.direction,
                            unoData.players
                        );
                        unoData.currentTurnPlayerId = nextTurnId;
                        unoData.state.activePhase = "play";
                        unoData.state.activePhaseData = { phase: "play" };
                    }

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

                    const drawPhase = unoData.state.activePhaseData.phase;
                    if (drawPhase !== "play" && drawPhase !== "draw_pending") {
                        console.warn(`[Uno Handler] uno:draw_card called when phase is ${drawPhase}`);
                        return;
                    }

                    if (String(ctx.userId) !== unoData.currentTurnPlayerId) {
                        ctx.send({ type: "uno:error", payload: { notificationLevel: "modal", message: "not_your_turn" } });
                        return;
                    }

                    const drawPlayer = unoData.players[String(ctx.userId)];

                    if (drawPhase === "draw_pending") {
                        drawCards(unoData, String(ctx.userId), unoData.drawStack);
                        unoData.drawStack = 0;
                    } else {
                        drawCards(unoData, String(ctx.userId), 1);
                    }

                    if (drawPlayer) {
                        drawPlayer.hasSaidUno = false;
                    }

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

                case "uno:say_uno": {
                    console.log(`[UNO] HANDLING uno:say_uno`);
                    const { gameId } = ctx.payload || {};

                    if (gameId !== ctx.game.id) {
                        console.warn(`[Uno Handler] Game ID mismatch in uno:say_uno`);
                        return;
                    }

                    const sayPlayerId = String(ctx.userId);
                    const sayPlayer = unoData.players[sayPlayerId];

                    if (!sayPlayer || !sayPlayer.stillPlaying) {
                        ctx.send({ type: "uno:error", payload: { notificationLevel: "toast", message: "player_not_found" } });
                        return;
                    }

                    sayPlayer.hasSaidUno = true;

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
