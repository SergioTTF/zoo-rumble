import { describe, expect, it } from 'vitest';
import { ANIMALS } from '../../content/animals';
import { sandboxEncounter } from '../../content/encounter';
import { damageForHit } from '../abilities/effects';
import { nextPathCell } from '../grid/pathfinding';
import { SeededRandom } from '../rng/SeededRandom';
import type {
  AnimalDefinition,
  AnimalInstance,
  BattleConfig,
  BattleEvent,
} from '../types';
import { Battle } from './Battle';

function definition(
  id: string,
  overrides: Partial<AnimalDefinition['baseStats']> = {},
  ability?: AnimalDefinition['ability'],
): AnimalDefinition {
  return {
    id,
    name: id,
    tier: 1,
    traits: [],
    assetKey: id,
    baseStats: {
      health: 1000,
      attack: 10,
      attackIntervalMs: 1000,
      moveIntervalMs: 500,
      attackRange: 1,
      ...overrides,
    },
    ability,
  };
}
function unit(
  instanceId: string,
  animalId: string,
  team: AnimalInstance['team'],
  x: number,
  y = 1,
): AnimalInstance {
  return { instanceId, animalId, team, starLevel: 1, position: { x, y } };
}
function duel(
  a = definition('a'),
  b = definition('b'),
  seed = 'test',
): BattleConfig {
  return {
    seed,
    animals: [a, b],
    units: [
      unit('a-player', a.id, 'player', 2),
      unit('b-enemy', b.id, 'enemy', 3),
    ],
  };
}
function run(config: BattleConfig) {
  const battle = new Battle(config);
  const events: BattleEvent[] = [...battle.drainEvents()];
  while (!battle.isFinished()) {
    battle.step();
    events.push(...battle.drainEvents());
  }
  return { result: battle.result, events, snapshot: battle.snapshot };
}

describe('fixed combat clock and attacks', () => {
  it('starts at tick zero and uses individual attack intervals', () => {
    const battle = new Battle(
      duel(
        definition('a', { attackIntervalMs: 400 }),
        definition('b', { attackIntervalMs: 1000 }),
      ),
    );
    expect(battle.drainEvents()[0]).toMatchObject({
      type: 'battleStarted',
      tick: 0,
      sequence: 0,
    });
    const events: BattleEvent[] = [];
    for (let i = 0; i < 12; i++) {
      battle.step();
      events.push(...battle.drainEvents());
    }
    expect(
      events
        .filter((e) => e.type === 'unitAttacked' && e.unitId === 'a-player')
        .map((e) => e.tick),
    ).toEqual([1, 5, 9]);
    expect(
      events
        .filter((e) => e.type === 'unitAttacked' && e.unitId === 'b-enemy')
        .map((e) => e.tick),
    ).toEqual([1, 11]);
  });
  it('orders non-grid-aligned due times before IDs', () => {
    const battle = new Battle(
      duel(
        definition('a', { attackIntervalMs: 550 }),
        definition('b', { attackIntervalMs: 510 }),
      ),
    );
    const events: BattleEvent[] = [];
    for (let i = 0; i < 7; i++) {
      battle.step();
      events.push(...battle.drainEvents());
    }
    expect(
      events
        .filter((e) => e.type === 'unitAttacked' && e.tick === 7)
        .map((e) => 'unitId' in e && e.unitId),
    ).toEqual(['b-enemy', 'a-player']);
  });
  it('resolves exact lethal ties by ID and prevents dead attackers striking', () => {
    const { result, events, snapshot } = run(
      duel(definition('a', { health: 10 }), definition('b', { health: 10 })),
    );
    expect(result).toMatchObject({
      winner: 'player',
      reason: 'elimination',
      tick: 1,
    });
    expect(events.map((e) => e.type)).toEqual([
      'battleStarted',
      'unitAttacked',
      'damageDealt',
      'unitDied',
      'battleEnded',
    ]);
    expect(snapshot.units.find((u) => u.team === 'enemy')?.health).toBe(0);
  });
  it('does not change finished state or emit further events', () => {
    const battle = new Battle(duel(definition('a', { attack: 2000 })));
    battle.step();
    battle.drainEvents();
    const snapshot = battle.snapshot;
    battle.step();
    battle.step();
    expect(battle.snapshot).toEqual(snapshot);
    expect(battle.drainEvents()).toEqual([]);
  });
});

describe('movement and targeting', () => {
  it('finds a shortest orthogonal path with fixed neighbor ties', () => {
    expect(
      nextPathCell({ x: 1, y: 1 }, { x: 3, y: 3 }, 1, 8, 4, new Set(['3,3'])),
    ).toEqual({ x: 2, y: 1 });
    expect(
      nextPathCell(
        { x: 1, y: 1 },
        { x: 3, y: 1 },
        1,
        8,
        4,
        new Set(['2,1', '3,1']),
      ),
    ).toEqual({ x: 1, y: 2 });
  });
  it('waits if every path is blocked', () => {
    expect(
      nextPathCell(
        { x: 1, y: 1 },
        { x: 4, y: 1 },
        1,
        8,
        4,
        new Set(['2,1', '1,2', '0,1', '1,0']),
      ),
    ).toBeNull();
    const config = duel();
    const battle = new Battle({
      ...config,
      rules: { width: 3, height: 1 },
      units: [
        unit('a-player', 'a', 'player', 0, 0),
        unit('b-blocker', 'a', 'player', 1, 0),
        unit('c-enemy', 'b', 'enemy', 2, 0),
      ],
    });
    for (let i = 0; i < 10; i++) battle.step();
    expect(
      battle.snapshot.units.find((u) => u.instanceId === 'a-player')?.position,
    ).toEqual({ x: 0, y: 0 });
  });
  it('uses movement cooldowns, occupied cells, and never attacks on a movement tick', () => {
    const battle = new Battle({
      ...duel(),
      units: [
        unit('a-player', 'a', 'player', 0),
        unit('b-enemy', 'b', 'enemy', 5),
      ],
    });
    for (let i = 0; i < 4; i++) battle.step();
    expect(battle.snapshot.units[0].position.x).toBe(0);
    battle.drainEvents();
    battle.step();
    const events = battle.drainEvents();
    expect(events.filter((e) => e.type === 'unitMoved')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'unitAttacked')).toHaveLength(0);
    for (let i = 0; i < 30 && !battle.isFinished(); i++) {
      battle.step();
      const living = battle.snapshot.units.filter((u) => u.health > 0);
      expect(
        new Set(living.map((u) => `${u.position.x},${u.position.y}`)).size,
      ).toBe(living.length);
    }
  });
  it('prefers distance, then health, then instance ID', () => {
    const a = definition('a');
    const weak = definition('weak', { health: 500 });
    const config: BattleConfig = {
      seed: 'target',
      animals: [a, weak],
      units: [
        unit('player', 'a', 'player', 2),
        unit('z-near', 'a', 'enemy', 3),
        unit('a-weak-far', 'weak', 'enemy', 5),
      ],
    };
    const near = new Battle(config);
    near.step();
    expect(
      near.snapshot.units.find((u) => u.instanceId === 'player')?.targetId,
    ).toBe('z-near');
    const low = new Battle({
      ...config,
      units: [
        config.units[0],
        unit('z-strong', 'a', 'enemy', 3),
        unit('b-weak', 'weak', 'enemy', 1),
      ],
    });
    low.step();
    expect(
      low.snapshot.units.find((u) => u.instanceId === 'player')?.targetId,
    ).toBe('b-weak');
    const ids = new Battle({
      ...config,
      units: [
        config.units[0],
        unit('z-enemy', 'a', 'enemy', 3),
        unit('a-enemy', 'a', 'enemy', 1),
      ],
    });
    ids.step();
    expect(
      ids.snapshot.units.find((u) => u.instanceId === 'player')?.targetId,
    ).toBe('a-enemy');
  });
  it('retains a living target and retargets after death', () => {
    const config: BattleConfig = {
      seed: 'retain',
      animals: [
        definition('a', { attack: 20 }),
        definition('weak', { health: 30 }),
      ],
      units: [
        unit('a-player', 'a', 'player', 2),
        unit('b-first', 'weak', 'enemy', 3),
        unit('c-second', 'a', 'enemy', 1),
      ],
    };
    const battle = new Battle(config);
    battle.step();
    expect(battle.snapshot.units[0].targetId).toBe('b-first');
    for (let i = 0; i < 10; i++) battle.step();
    expect(
      battle.snapshot.units.find((u) => u.instanceId === 'b-first')?.health,
    ).toBe(0);
    battle.step();
    expect(battle.snapshot.units[0].targetId).toBe('c-second');
  });
});

describe('content abilities', () => {
  it('adds exactly one extra attack every fourth normal Rabbit attack', () => {
    const rabbit = ANIMALS.find((a) => a.id === 'rabbit')!;
    const battle = new Battle(
      duel(
        { ...rabbit, baseStats: { ...rabbit.baseStats, health: 5000 } },
        definition('dummy', { health: 5000, attack: 1 }),
      ),
    );
    const events: BattleEvent[] = [];
    for (let i = 0; i < 30; i++) {
      battle.step();
      events.push(...battle.drainEvents());
    }
    expect(
      events.filter(
        (e) => e.type === 'unitAttacked' && e.unitId === 'a-player' && !e.extra,
      ),
    ).toHaveLength(8);
    expect(
      events
        .filter((e) => e.type === 'unitAttacked' && e.extra)
        .map((e) => e.tick),
    ).toEqual([13, 29]);
    expect(battle.snapshot.units[0].normalAttacks).toBe(8);
  });
  it('does not strike a dead target with Rabbit’s extra attack', () => {
    const battle = run(
      duel(
        definition(
          'rabbit',
          { attack: 10, attackIntervalMs: 100 },
          { kind: 'extraAttack', every: 4 },
        ),
        definition('dummy', { health: 40, attack: 1 }),
      ),
    );
    expect(
      battle.events.filter((e) => e.type === 'unitAttacked' && e.extra),
    ).toHaveLength(0);
  });
  it('checks Wolf’s strict below-40% threshold before each hit and rounds damage', () => {
    const wolf = ANIMALS.find((a) => a.id === 'wolf')!;
    expect(damageForHit(18, wolf.ability, 40, 100)).toEqual({
      damage: 18,
      triggered: false,
    });
    expect(damageForHit(18, wolf.ability, 39, 100)).toEqual({
      damage: 27,
      triggered: true,
    });
    expect(damageForHit(9, wolf.ability, 39, 100).damage).toBe(14);
    const battle = new Battle(
      duel(
        { ...wolf, baseStats: { ...wolf.baseStats, health: 5000 } },
        definition('dummy', { health: 100, attack: 1 }),
      ),
    );
    const events: BattleEvent[] = [];
    for (let i = 0; i < 41; i++) {
      battle.step();
      events.push(...battle.drainEvents());
    }
    expect(
      events
        .filter((e) => e.type === 'damageDealt' && e.unitId === 'a-player')
        .map((e) => 'damage' in e && e.damage),
    ).toEqual([18, 18, 18, 18, 27]);
    expect(
      events.some(
        (e) => e.type === 'abilityTriggered' && e.ability === 'executeDamage',
      ),
    ).toBe(true);
  });
});

describe('determinism, timeout, and ownership', () => {
  it('replays identical events and results headlessly', () => {
    const first = run(sandboxEncounter());
    expect(run(sandboxEncounter())).toEqual(first);
    expect(first.result?.reason).toBe('elimination');
    expect(first.events.map((e) => e.sequence)).toEqual(
      first.events.map((_, i) => i),
    );
    expect(first.events[0].type).toBe('battleStarted');
    expect(first.events.at(-1)?.type).toBe('battleEnded');
  });
  it('does not depend on the input array order', () => {
    const config = sandboxEncounter();
    expect(run({ ...config, units: [...config.units].reverse() })).toEqual(
      run(config),
    );
  });
  it('scores timeout by team health fraction before survivor count', () => {
    const config = duel(
      definition('a', { health: 100, attack: 50 }),
      definition('b', { health: 1000, attack: 10 }),
    );
    expect(
      run({ ...config, rules: { maxDurationMs: 100 } }).result,
    ).toMatchObject({ winner: 'enemy', reason: 'timeout' });
  });
  it('uses survivor count when health fractions tie', () => {
    const config: BattleConfig = {
      seed: 'count',
      animals: [definition('a')],
      rules: { maxDurationMs: 100 },
      units: [
        unit('p1', 'a', 'player', 0, 0),
        unit('p2', 'a', 'player', 0, 3),
        unit('e1', 'a', 'enemy', 7, 0),
      ],
    };
    expect(run(config).result).toMatchObject({
      winner: 'player',
      reason: 'timeout',
    });
  });
  it('uses repeatable seeded tiebreaks only for exact timeout ties', () => {
    const config = {
      ...duel(),
      rules: { maxDurationMs: 100 },
      units: [
        unit('a-player', 'a', 'player', 0),
        unit('b-enemy', 'b', 'enemy', 7),
      ],
    };
    expect(run(config)).toEqual(run(config));
    const winners = new Set(
      Array.from(
        { length: 20 },
        (_, i) => run({ ...config, seed: `seed-${i}` }).result?.winner,
      ),
    );
    expect(winners.size).toBe(2);
    const rng = new SeededRandom('repeat');
    const other = new SeededRandom('repeat');
    expect(Array.from({ length: 100 }, () => rng.next())).toEqual(
      Array.from({ length: 100 }, () => other.next()),
    );
  });
  it('copies input and freezes exposed snapshots and events', () => {
    const config = duel();
    const battle = new Battle(config);
    const initial = battle.snapshot;
    expect(Object.isFrozen(initial.units[0].position)).toBe(true);
    expect(Object.isFrozen(battle.drainEvents()[0])).toBe(true);
    (config.animals[0].baseStats as { attack: number }).attack = 999;
    (config.units[0].position as { x: number }).x = 7;
    battle.step();
    expect(battle.snapshot.units.find((u) => u.team === 'enemy')?.health).toBe(
      990,
    );
    expect(initial.units[0].health).toBe(1000);
  });
  it('rejects invalid initial states', () => {
    const config = duel();
    expect(() => new Battle({ ...config, units: [] })).toThrow();
    expect(
      () =>
        new Battle({
          ...config,
          units: [
            config.units[0],
            { ...config.units[1], position: config.units[0].position },
          ],
        }),
    ).toThrow(/occupied/);
    expect(() => new Battle({ ...config, rules: { tickMs: 0 } })).toThrow();
    expect(
      () =>
        new Battle({
          ...config,
          units: [{ ...config.units[0], animalId: 'unknown' }, config.units[1]],
        }),
    ).toThrow(/Unknown/);
    expect(
      () =>
        new Battle({
          ...config,
          units: [{ ...config.units[0], starLevel: 4 as 1 }, config.units[1]],
        }),
    ).toThrow(/star level/);
  });
});
