import { IGameModeHandler, GameModeContext } from "../../types/GameModeHandler";
import { UNO, UNOCard, UNOCardInHand, GameRules, UNOPhase, UNOPhaseData, UNOPlayer } from "../../types/gamemode/UNO";
import {
    shuffleArray,
    generateCardId,
    buildUNODeck,
    buildInfiniteDeck,
    cardToHand,
    generateStartHand,
} from "../../lib/unoHelper";

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
                        ctx.send({ type: "uno:error", message: "not_host" });
                        return;
                    }

                    if (unoData.state.activePhase !== "lobby" || unoData.state.activePhaseData.phase !== "lobby") {
                        console.warn(`[Uno Handler] uno:start_round called when phase is not setup`);
                        return;
                    }

                    const players = ctx.game.lobby.players;

                    if (!players || players.length < 1 || players.length > 10) {
                        ctx.send({ type: "uno:error", message: "invalid_player_count" });
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
                        topCard: topCard,
                        drawPile: currentDeck,
                        players: unoPlayers,
                        state: {
                            ...unoData.state,
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


                }

                default:
                    break;
            }
        } catch (error) {
            console.error(`[uno Class Handler Fatal Error] Crash prevented in case ${ctx.dataType}:`, error);
            ctx.send({ type: "uno:error", message: "internal_server_error_in_module" });
        }
    }
}
