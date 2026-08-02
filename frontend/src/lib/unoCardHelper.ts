import { UNOCard } from '@/types';

export function getUNOCardImagePath(card: UNOCard | null | undefined): string {
  if (!card) {
    return '/cards/uno/back.svg';
  }

  if (card.color === 'wild' || card.type === 'wild') {
    if (card.type === 'draw4' || card.value === 'draw4') {
      return '/cards/uno/wild_draw4.svg';
    }
    return '/cards/uno/wild.svg';
  }

  if (card.type === 'draw4' || card.value === 'draw4') {
    return '/cards/uno/wild_draw4.svg';
  }

  if (card.type === 'number') {
    return `/cards/uno/${card.color}_${card.value}.svg`;
  }

  return `/cards/uno/${card.color}_${card.type}.svg`;
}

export function getUNOCardBackPath(): string {
  return '/cards/uno/back.svg';
}
