import { UNOCard } from '@/types';

export function getUNOCardImagePath(card: UNOCard | null | undefined): string {
  if (!card || !card.color || !card.type) {
    return '/cards/uno/back.svg';
  }

  const isSelectedColor = ['red', 'blue', 'green', 'yellow'].includes(card.color);

  if (card.type === 'wild' || (card.color === 'wild' && card.type !== 'draw4')) {
    if (isSelectedColor) {
      return `/cards/uno/wild_${card.color}.svg`;
    }
    return '/cards/uno/wild.svg';
  }

  if (card.type === 'draw4' || card.value === 'draw4') {
    if (isSelectedColor) {
      return `/cards/uno/wild_draw4_${card.color}.svg`;
    }
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
