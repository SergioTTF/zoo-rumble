import type { AnimalTier } from '../simulation/types';

export type PlayerLevel = 2 | 3 | 4 | 5 | 6;
export const ECONOMY_RULES = {
  preparationGold: 10,
  shopSlots: 5,
  rerollCost: 1,
  xpPurchaseCost: 4,
  xpPurchaseAmount: 4,
  roundXP: 2,
} as const;
export const LEVEL_XP: Readonly<Record<PlayerLevel, number>> = {
  2: 0,
  3: 4,
  4: 10,
  5: 18,
  6: 30,
};
export const TIER_COSTS: Readonly<Record<AnimalTier, number>> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};
export const SHOP_ODDS: Readonly<Record<PlayerLevel, readonly number[]>> = {
  2: [100, 0, 0, 0, 0],
  3: [75, 25, 0, 0, 0],
  4: [55, 30, 15, 0, 0],
  5: [40, 30, 20, 10, 0],
  6: [25, 25, 25, 15, 10],
};
