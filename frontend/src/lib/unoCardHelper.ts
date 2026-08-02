import { UNOCard } from '@/types';

/**
 * Returns the relative URL path to the SVG image for a given UNO card.
 * All card SVG files are stored in /cards/uno/ directory under public folder.
 */
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
