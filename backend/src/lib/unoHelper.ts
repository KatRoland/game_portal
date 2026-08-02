import { UNO, UNOCard, UNOCardInHand, UNOPlayer, GameRules } from "../types/gamemode/UNO";

export function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


export function generateCardId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildUNODeck(): UNOCard[] {
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

export function buildInfiniteDeck(): UNOCard[] {
    const colors: Array<"red" | "green" | "blue" | "yellow"> = ["red", "green", "blue", "yellow"];
    const deck: UNOCard[] = [];

    for (const color of colors) {
        // 0-9 (1 copy of each number card)
        for (let n = 0; n <= 9; n++) {
            deck.push({ type: "number", color, value: n });
        }
        // skip, reverse, draw2 (1 copy of each action card per color)
        deck.push({ type: "skip", color, value: "skip" });
        deck.push({ type: "reverse", color, value: "reverse" });
        deck.push({ type: "draw2", color, value: "draw2" });
    }

    // wild, draw4 (1 copy of each wild card)
    deck.push({ type: "wild", color: "wild", value: "wild" });
    deck.push({ type: "draw4", color: "wild", value: "draw4" });

    return deck;
}

export function cardToHand(card: UNOCard): UNOCardInHand {
    return { ...card, id: generateCardId() };
}

export function generateStartHand(rules: GameRules, deck: UNOCard[]): [UNOCardInHand[], UNOCard[]] {
    const cardsPerPlayer = rules.initialCards;

    const cardsDealt: UNOCardInHand[] = [];
    const deckCopy = [...deck];

    if (rules.deckType === "infinite") {
        for (let i = 0; i < cardsPerPlayer; i++) {
            if (deck.length === 0) break;
            const randomIndex = Math.floor(Math.random() * deck.length);
            const card = deck[randomIndex];
            cardsDealt.push(cardToHand(card));
        }
        // In infinite mode, cards are not popped; the deck remains full
        return [cardsDealt, deckCopy];
    }

    for (let i = 0; i < cardsPerPlayer; i++) {
        const card = deckCopy.shift();
        if (card) {
            cardsDealt.push(cardToHand(card));
        } else {
            // This should not happen in a standard deck
            console.error("Deck ran out of cards during initial hand generation");
        }
    }

    return [cardsDealt, deckCopy];
}