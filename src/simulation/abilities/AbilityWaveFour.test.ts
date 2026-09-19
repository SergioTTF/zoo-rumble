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

const unit = (
  instanceId: string,
  animalId: string,
  team: 'player' | 'enemy',
  x: number,
  y: number,
) => ({
  instanceId,
  animalId,
  team,
  starLevel: 1 as const,
  position: { x, y },
});

describe('final roster ability wave', () => {
  it('Feather Guard blocks exactly the next incoming hit', () => {
    const chicken = animal('chicken', { kind: 'featherGuard', every: 1 });
    const enemy = animal('enemy', undefined, { attack: 30 });
    const { battle, events } = run({
      seed: 'feathers',
      animals: [chicken, enemy],
      units: [
        unit('a-chicken', 'chicken', 'player', 0, 0),
        unit('z-enemy', 'enemy', 'enemy', 1, 0),
      ],
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'attackDodged',
        unitId: 'z-enemy',
        targetId: 'a-chicken',
      }),
    );
    expect(battle.snapshot.units[0]?.health).toBe(100);
  });

  it('Crippling Bite reduces damage from later same-tick attacks', () => {
    const jackal = animal('jackal', {
      kind: 'cripplingBite',
      every: 1,
      attackReduction: 0.25,
      durationMs: 300,
    });
    const enemy = animal('enemy', undefined, { attack: 20 });
    const { events } = run({
      seed: 'cripple',
      animals: [jackal, enemy],
      units: [
        unit('a-jackal', 'jackal', 'player', 0, 0),
        unit('z-enemy', 'enemy', 'enemy', 1, 0),
      ],
    });
    expect(
      events.find(
        (event) => event.type === 'damageDealt' && event.unitId === 'z-enemy',
      ),
    ).toMatchObject({ damage: 15 });
  });

  it('Squawk suppresses the target special while allowing its normal attack', () => {
    const parrot = animal('parrot', {
      kind: 'squawk',
      every: 1,
      durationMs: 300,
    });
    const enemy = animal('enemy', {
      kind: 'pounce',
      every: 1,
      bonusDamage: 1,
    });
    const { events } = run({
      seed: 'squawk',
      animals: [parrot, enemy],
      units: [
        unit('a-parrot', 'parrot', 'player', 0, 0),
        unit('z-enemy', 'enemy', 'enemy', 1, 0),
      ],
    });
    expect(
      events.some(
        (event) => event.type === 'unitAttacked' && event.unitId === 'z-enemy',
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.type === 'abilityTriggered' &&
          event.unitId === 'z-enemy' &&
          event.ability === 'pounce',
      ),
    ).toBe(false);
  });

  it('Chain Strike selects the closest secondary target and damages it', () => {
    const owl = animal('owl', {
      kind: 'chainStrike',
      every: 1,
      damageRatio: 0.6,
    });
    const enemy = animal('enemy', undefined, { health: 1000, attack: 1 });
    const { events } = run({
      seed: 'chain',
      animals: [owl, enemy],
      units: [
        unit('a-owl', 'owl', 'player', 0, 0),
        unit('b-primary', 'enemy', 'enemy', 1, 0),
        unit('c-secondary', 'enemy', 'enemy', 2, 0),
      ],
    });
    expect(
      events
        .filter(
          (event) => event.type === 'damageDealt' && event.unitId === 'a-owl',
        )
        .map((event) =>
          event.type === 'damageDealt'
            ? [event.targetId, event.damage]
            : ['', 0],
        ),
    ).toEqual([
      ['b-primary', 10],
      ['c-secondary', 6],
    ]);
  });

  it('Stone Splash hits nearby enemies around the primary target only', () => {
    const chimp = animal('chimp', {
      kind: 'stoneSplash',
      every: 1,
      damageRatio: 0.5,
      radius: 1,
    });
    const enemy = animal('enemy', undefined, { health: 1000, attack: 1 });
    const { events } = run({
      seed: 'splash',
      animals: [chimp, enemy],
      units: [
        unit('a-chimp', 'chimp', 'player', 0, 0),
        unit('b-primary', 'enemy', 'enemy', 1, 0),
        unit('c-near', 'enemy', 'enemy', 1, 1),
        unit('d-far', 'enemy', 'enemy', 4, 0),
      ],
    });
    expect(
      events
        .filter(
          (event) => event.type === 'damageDealt' && event.unitId === 'a-chimp',
        )
        .map((event) =>
          event.type === 'damageDealt'
            ? [event.targetId, event.damage]
            : ['', 0],
        ),
    ).toEqual([
      ['b-primary', 10],
      ['c-near', 5],
    ]);
  });
});
