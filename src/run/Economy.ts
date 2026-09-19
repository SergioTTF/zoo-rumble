import { ANIMALS } from '../content/animals';
import {
  ECONOMY_RULES,
  LEVEL_XP,
  SHOP_ODDS,
  TIER_COSTS,
  type PlayerLevel,
} from '../content/economy';
import { SeededRandom } from '../simulation/rng/SeededRandom';
import type { AnimalDefinition, AnimalTier } from '../simulation/types';
import { addCopies, type Merge, type SquadState } from './Squad';

export interface ShopOffer {
  readonly id: string;
  readonly animalId: string;
  readonly tier: AnimalTier;
  readonly cost: number;
}
export interface EconomyState {
  readonly seed: string;
  readonly gold: number;
  readonly xp: number;
  readonly refresh: number;
  readonly shop: readonly (ShopOffer | null)[];
}
export function playerLevel(xp: number): PlayerLevel {
  return ([6, 5, 4, 3, 2] as const).find((level) => xp >= LEVEL_XP[level]) ?? 2;
}
export function availableShopOdds(
  level: PlayerLevel,
  animals: readonly AnimalDefinition[] = ANIMALS,
): readonly number[] {
  const weights = SHOP_ODDS[level].map((weight, index) =>
    animals.some((a) => a.tier === index + 1) ? weight : 0,
  );
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total === 0) throw new Error('No animals available at this level.');
  return weights.map((w) => w / total);
}
export function generateShop(
  seed: string,
  level: PlayerLevel,
  refresh: number,
  animals: readonly AnimalDefinition[] = ANIMALS,
): readonly ShopOffer[] {
  const rng = new SeededRandom(`${seed}:shop:${refresh}`);
  const odds = availableShopOdds(level, animals);
  return Array.from({ length: ECONOMY_RULES.shopSlots }, (_, slot) => {
    const roll = rng.next();
    let cumulative = 0;
    let tier: AnimalTier = 1;
    for (let index = 0; index < odds.length; index++) {
      cumulative += odds[index];
      if (roll < cumulative) {
        tier = (index + 1) as AnimalTier;
        break;
      }
    }
    const pool = animals
      .filter((a) => a.tier === tier)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const animal = pool[Math.floor(rng.next() * pool.length)];
    return {
      id: `${refresh}:${slot}`,
      animalId: animal.id,
      tier,
      cost: TIER_COSTS[tier],
    };
  });
}
export function initialEconomy(seed: string): EconomyState {
  return {
    seed,
    gold: ECONOMY_RULES.preparationGold,
    xp: 0,
    refresh: 0,
    shop: generateShop(seed, 2, 0),
  };
}
export function reroll(economy: EconomyState): {
  economy: EconomyState;
  error?: string;
} {
  if (economy.gold < ECONOMY_RULES.rerollCost)
    return { economy, error: 'Not enough gold to reroll.' };
  const refresh = economy.refresh + 1;
  return {
    economy: {
      ...economy,
      gold: economy.gold - ECONOMY_RULES.rerollCost,
      refresh,
      shop: generateShop(economy.seed, playerLevel(economy.xp), refresh),
    },
  };
}
export function buyXP(economy: EconomyState): {
  economy: EconomyState;
  error?: string;
} {
  if (playerLevel(economy.xp) === 6)
    return { economy, error: 'Maximum level reached.' };
  if (economy.gold < ECONOMY_RULES.xpPurchaseCost)
    return { economy, error: 'Not enough gold to buy XP.' };
  return {
    economy: {
      ...economy,
      gold: economy.gold - ECONOMY_RULES.xpPurchaseCost,
      xp: Math.min(LEVEL_XP[6], economy.xp + ECONOMY_RULES.xpPurchaseAmount),
    },
  };
}
export function purchase(
  economy: EconomyState,
  squad: SquadState,
  offerId: string,
): {
  economy: EconomyState;
  squad: SquadState;
  merges: readonly Merge[];
  error?: string;
} {
  const offer = economy.shop.find((offer) => offer?.id === offerId);
  if (!offer)
    return {
      economy,
      squad,
      merges: [],
      error: 'That offer is no longer available.',
    };
  if (economy.gold < offer.cost)
    return { economy, squad, merges: [], error: 'Not enough gold.' };
  const added = addCopies(squad, offer.animalId, 1);
  if (added.error) return { economy, squad, merges: [], error: added.error };
  return {
    squad: added.squad,
    merges: added.merges,
    economy: {
      ...economy,
      gold: economy.gold - offer.cost,
      shop: economy.shop.map((current) =>
        current?.id === offerId ? null : current,
      ),
    },
  };
}
export function sell(
  economy: EconomyState,
  squad: SquadState,
  instanceId: string,
): { economy: EconomyState; squad: SquadState; error?: string } {
  const unit = squad.animals.find((u) => u.instanceId === instanceId);
  const animal = ANIMALS.find((a) => a.id === unit?.animalId);
  if (!unit || !animal)
    return { economy, squad, error: 'Animal is no longer owned.' };
  return {
    economy: { ...economy, gold: economy.gold + TIER_COSTS[animal.tier] },
    squad: {
      ...squad,
      animals: squad.animals.filter((u) => u.instanceId !== instanceId),
    },
  };
}
