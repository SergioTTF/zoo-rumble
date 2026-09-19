import { describe, expect, it } from 'vitest';
import { ANIMALS } from '../content/animals';
import { LEVEL_XP, SHOP_ODDS } from '../content/economy';
import type { AnimalDefinition, AnimalTier } from '../simulation/types';
import { addCopies, initialSquad, moveAnimal, type OwnedAnimal } from './Squad';
import {
  availableShopOdds,
  buyXP,
  generateShop,
  initialEconomy,
  playerLevel,
  purchase,
  reroll,
  sell,
  type EconomyState,
} from './Economy';

const roster: AnimalDefinition[] = ([1, 2, 3, 4, 5] as const).map((tier) => ({
  ...ANIMALS[0],
  id: `tier-${tier}`,
  tier,
}));
describe('seeded tier shop', () => {
  it('generates five deterministic offers independent of content input ordering', () => {
    expect(generateShop('seed', 6, 0, roster)).toEqual(
      generateShop('seed', 6, 0, [...roster].reverse()),
    );
    expect(generateShop('seed', 6, 0, roster)).toHaveLength(5);
    expect(generateShop('seed', 6, 1, roster)).not.toEqual(
      generateShop('seed', 6, 0, roster),
    );
  });
  it('never rolls locked tiers and can reach all five tiers at level six', () => {
    const found = new Set<AnimalTier>();
    for (let refresh = 0; refresh < 200; refresh++) {
      for (const level of [2, 3, 4, 5, 6] as const) {
        for (const offer of generateShop('tiers', level, refresh, roster)) {
          expect(SHOP_ODDS[level][offer.tier - 1]).toBeGreaterThan(0);
          expect(offer.cost).toBe(offer.tier);
          if (level === 6) found.add(offer.tier);
        }
      }
    }
    expect([...found].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('redistributes absent-tier odds and keeps an unlimited shop pool', () => {
    expect(availableShopOdds(6)).toEqual([0.25, 0.25, 0.25, 0.15, 0.1]);
    const sandboxRoster = ANIMALS.filter((a) =>
      ['bear', 'rabbit', 'wolf'].includes(a.id),
    );
    expect(availableShopOdds(6, sandboxRoster)).toEqual([
      1 / 3,
      1 / 3,
      1 / 3,
      0,
      0,
    ]);
    expect(
      generateShop(
        'rabbits',
        2,
        0,
        ANIMALS.filter((a) => a.id === 'rabbit'),
      ).every((o) => o.animalId === 'rabbit'),
    ).toBe(true);
    expect(() => generateShop('empty', 2, 0, [])).toThrow(/No animals/);
  });
});
describe('economy transactions', () => {
  it('starts with ten gold, level two, and an initial free shop', () => {
    const state = initialEconomy('start');
    expect(state).toMatchObject({ gold: 10, xp: 0, refresh: 0 });
    expect(playerLevel(state.xp)).toBe(2);
  });
  it('buys once, deducts gold, and automatically upgrades across board and bench', () => {
    let economy: EconomyState = {
      ...initialEconomy('buy'),
      shop: generateShop(
        'buy',
        2,
        0,
        ANIMALS.filter((a) => a.id === 'rabbit'),
      ),
    };
    let squad = initialSquad();
    const first = purchase(economy, squad, economy.shop[0]!.id);
    expect(first.economy.gold).toBe(9);
    expect(first.economy.shop[0]).toBeNull();
    expect(
      purchase(first.economy, first.squad, economy.shop[0]!.id).error,
    ).toBeTruthy();
    economy = first.economy;
    squad = first.squad;
    const second = purchase(economy, squad, economy.shop[1]!.id);
    expect(second.merges).toHaveLength(1);
    expect(
      second.squad.animals.find((u) => u.animalId === 'rabbit'),
    ).toMatchObject({
      instanceId: 'player-rabbit',
      starLevel: 2,
      location: { kind: 'board' },
    });
    expect(second.economy.gold).toBe(8);
  });
  it('rejects purchases, rerolls, and XP without sufficient gold', () => {
    const economy = { ...initialEconomy('poor'), gold: 0 };
    const squad = initialSquad();
    expect(purchase(economy, squad, economy.shop[0]!.id)).toMatchObject({
      economy,
      squad,
      error: expect.any(String),
    });
    expect(reroll(economy)).toMatchObject({
      economy,
      error: expect.any(String),
    });
    expect(buyXP(economy)).toMatchObject({
      economy,
      error: expect.any(String),
    });
  });
  it('rolls back a full-bench purchase including gold, shop and instance IDs', () => {
    const animals: OwnedAnimal[] = Array.from({ length: 8 }, (_, slot) => ({
      instanceId: `max-${slot}`,
      animalId: 'bear',
      starLevel: 3,
      location: { kind: 'bench', slot },
    }));
    const squad = { animals, nextId: 10 };
    const economy = initialEconomy('full');
    const result = purchase(economy, squad, economy.shop[0]!.id);
    expect(result.squad).toBe(squad);
    expect(result.economy).toBe(economy);
    expect(result.error).toBeTruthy();
  });
  it('allows a purchase on a full bench if that purchase immediately merges', () => {
    const pair = addCopies({ animals: [], nextId: 1 }, 'rabbit', 2).squad;
    const animals: OwnedAnimal[] = [
      ...pair.animals,
      ...Array.from({ length: 6 }, (_, i) => ({
        instanceId: `max-${i}`,
        animalId: 'bear',
        starLevel: 3 as const,
        location: { kind: 'bench' as const, slot: i + 2 },
      })),
    ];
    const economy = {
      ...initialEconomy('merge-full'),
      shop: generateShop(
        'merge-full',
        2,
        0,
        ANIMALS.filter((a) => a.id === 'rabbit'),
      ),
    };
    expect(
      purchase(economy, { animals, nextId: 3 }, economy.shop[0]!.id).error,
    ).toBeUndefined();
  });
  it('sells upgraded units for their base tier cost and cannot sell twice', () => {
    const economy = initialEconomy('sell');
    const squad = addCopies(initialSquad(), 'bear', 2).squad;
    const result = sell(economy, squad, 'player-bear');
    expect(result.economy.gold).toBe(13);
    expect(
      result.squad.animals.some((u) => u.instanceId === 'player-bear'),
    ).toBe(false);
    expect(
      sell(result.economy, result.squad, 'player-bear').error,
    ).toBeTruthy();
  });
  it('uses cumulative level thresholds, caps at six, and applies rarity odds on reroll', () => {
    let economy = { ...initialEconomy('levels'), gold: 100 };
    const oldShop = economy.shop;
    economy = buyXP(economy).economy;
    expect(economy).toMatchObject({ gold: 96, xp: 4 });
    expect(playerLevel(economy.xp)).toBe(3);
    expect(economy.shop).toBe(oldShop);
    expect(reroll(economy).economy.shop).toEqual(
      generateShop(economy.seed, 3, 1),
    );
    for (const [level, xp] of Object.entries(LEVEL_XP))
      expect(playerLevel(xp)).toBe(Number(level));
    for (let i = 0; i < 10; i++) economy = buyXP(economy).economy;
    expect(economy.xp).toBe(30);
    expect(playerLevel(economy.xp)).toBe(6);
    expect(buyXP(economy).economy).toBe(economy);
  });
  it('raises deployed capacity with level', () => {
    const squad = addCopies(initialSquad(), 'wolf', 1).squad;
    const id = squad.animals.at(-1)!.instanceId;
    expect(
      moveAnimal(squad, id, { kind: 'board', position: { x: 0, y: 0 } }, 2)
        .error,
    ).toBeTruthy();
    expect(
      moveAnimal(squad, id, { kind: 'board', position: { x: 0, y: 0 } }, 3)
        .error,
    ).toBeUndefined();
  });
  it('replays an entire economy command sequence without battle RNG consumption', () => {
    const sequence = () => {
      let economy = initialEconomy('commands');
      let squad = initialSquad();
      const buy = purchase(economy, squad, economy.shop[0]!.id);
      economy = buy.economy;
      squad = buy.squad;
      economy = buyXP(economy).economy;
      economy = reroll(economy).economy;
      const sold = sell(economy, squad, 'player-bear');
      return { economy: sold.economy, squad: sold.squad };
    };
    expect(sequence()).toEqual(sequence());
  });
});
