import { describe, expect, it } from 'vitest';
import { Battle } from '../battle/Battle';
import type {
  AnimalDefinition,
  BattleConfig,
  BattleEvent,
  SpecialAbilityDefinition,
} from '../types';

const animal = (
  id: string,
  specialAbility?: SpecialAbilityDefinition,
  overrides: Partial<AnimalDefinition['baseStats']> = {},
): AnimalDefinition => ({
  id,
  name: id,
  tier: 1,
  traits: [],
  assetKey: id,
  baseStats: {
    health: 100,
    attack: 10,
    attackRange: 20,
    attackIntervalMs: 100,
    moveIntervalMs: 100,
    ...overrides,
  },
  specialAbility,
});

const run = (config: BattleConfig, ticks = 1) => {
  const battle = new Battle(config);
  const events: BattleEvent[] = [...battle.drainEvents()];
  for (let tick = 0; tick < ticks && !battle.isFinished(); tick++) {
    battle.step();
    events.push(...battle.drainEvents());
  }
  return { battle, events };
};

describe('third special ability wave', () => {
  it('Cackle makes later same-tick and future hits deal more damage', () => {
    const hyena = animal('hyena', {
      kind: 'cackle',
      every: 1,
      vulnerability: 0.2,
      durationMs: 300,
    });
    const ally = animal('ally');
    const target = animal('target', undefined, { health: 1000, attack: 1 });
    const { events } = run({
      seed: 'cackle',
      animals: [hyena, ally, target],
      units: [
        {
          instanceId: 'a-hyena',
          animalId: 'hyena',
          team: 'player',
          starLevel: 1,
          position: { x: 0, y: 0 },
        },
        {
          instanceId: 'b-ally',
          animalId: 'ally',
          team: 'player',
          starLevel: 1,
          position: { x: 0, y: 1 },
        },
        {
          instanceId: 'z-target',
          animalId: 'target',
          team: 'enemy',
          starLevel: 1,
          position: { x: 1, y: 0 },
        },
      ],
    });
    expect(
      events
        .filter((event) => event.type === 'damageDealt')
        .map((event) => (event.type === 'damageDealt' ? event.damage : 0)),
    ).toEqual([10, 12, 1]);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'statusApplied',
        status: 'vulnerable',
        targetId: 'z-target',
      }),
    );
  });

  it('Sky Dive deals rounded bonus damage from target maximum health', () => {
    const eagle = animal('eagle', {
      kind: 'skyDive',
      every: 1,
      maxHealthDamageRatio: 0.12,
    });
    const target = animal('target', undefined, { health: 205, attack: 1 });
    const { events } = run({
      seed: 'dive',
      animals: [eagle, target],
      units: [
        {
          instanceId: 'a-eagle',
          animalId: 'eagle',
          team: 'player',
          starLevel: 1,
          position: { x: 0, y: 0 },
        },
        {
          instanceId: 'z-target',
          animalId: 'target',
          team: 'enemy',
          starLevel: 1,
          position: { x: 1, y: 0 },
        },
      ],
    });
    expect(
      events
        .filter(
          (event) => event.type === 'damageDealt' && event.unitId === 'a-eagle',
        )
        .map((event) => (event.type === 'damageDealt' ? event.damage : 0)),
    ).toEqual([10, 25]);
  });

  it('Banana Aid heals the most wounded ally without overhealing', () => {
    const monkey = animal('monkey', {
      kind: 'bananaAid',
      every: 1,
      healRatio: 0.2,
    });
    const friend = animal('friend');
    const enemy = animal('enemy', undefined, { attack: 30 });
    const { battle, events } = run({
      seed: 'aid',
      animals: [monkey, friend, enemy],
      units: [
        {
          instanceId: 'a-enemy',
          animalId: 'enemy',
          team: 'enemy',
          starLevel: 1,
          position: { x: 1, y: 0 },
        },
        {
          instanceId: 'b-friend',
          animalId: 'friend',
          team: 'player',
          starLevel: 1,
          position: { x: 0, y: 0 },
        },
        {
          instanceId: 'c-monkey',
          animalId: 'monkey',
          team: 'player',
          starLevel: 1,
          position: { x: 7, y: 5 },
        },
      ],
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'healingDone',
        unitId: 'c-monkey',
        targetId: 'b-friend',
        amount: 20,
        healthAfter: 90,
      }),
    );
    expect(
      battle.snapshot.units.find((unit) => unit.instanceId === 'b-friend')
        ?.health,
    ).toBe(90);
  });

  it('Battle Cry buffs nearby allies before their later same-tick actions', () => {
    const baboon = animal('baboon', {
      kind: 'battleCry',
      every: 1,
      attackBonus: 0.25,
      durationMs: 300,
      radius: 2,
    });
    const ally = animal('ally');
    const target = animal('target', undefined, { health: 1000, attack: 1 });
    const { events } = run({
      seed: 'cry',
      animals: [baboon, ally, target],
      units: [
        {
          instanceId: 'a-baboon',
          animalId: 'baboon',
          team: 'player',
          starLevel: 1,
          position: { x: 0, y: 0 },
        },
        {
          instanceId: 'b-ally',
          animalId: 'ally',
          team: 'player',
          starLevel: 1,
          position: { x: 0, y: 1 },
        },
        {
          instanceId: 'z-target',
          animalId: 'target',
          team: 'enemy',
          starLevel: 1,
          position: { x: 1, y: 0 },
        },
      ],
    });
    expect(
      events
        .filter(
          (event) => event.type === 'damageDealt' && event.unitId === 'b-ally',
        )
        .map((event) => (event.type === 'damageDealt' ? event.damage : 0)),
    ).toEqual([13]);
    expect(
      events
        .filter(
          (event) =>
            event.type === 'statusApplied' && event.status === 'rallied',
        )
        .map((event) => (event.type === 'statusApplied' ? event.targetId : '')),
    ).toEqual(['a-baboon', 'b-ally']);
  });

  it('replays the new ability events deterministically', () => {
    const hyena = animal('hyena', {
      kind: 'cackle',
      every: 2,
      vulnerability: 0.2,
      durationMs: 300,
    });
    const target = animal('target', undefined, { health: 1000, attack: 1 });
    const config: BattleConfig = {
      seed: 'wave-three-repeat',
      animals: [hyena, target],
      units: [
        {
          instanceId: 'hyena',
          animalId: 'hyena',
          team: 'player',
          starLevel: 1,
          position: { x: 0, y: 0 },
        },
        {
          instanceId: 'target',
          animalId: 'target',
          team: 'enemy',
          starLevel: 1,
          position: { x: 1, y: 0 },
        },
      ],
    };
    expect(run(config, 8).events).toEqual(run(config, 8).events);
  });
});
