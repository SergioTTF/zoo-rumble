import { describe, expect, it } from 'vitest';
import { Battle } from '../simulation/battle/Battle';
import {
  addCopies,
  combineAnimals,
  initialSquad,
  starterSquad,
  moveAnimal,
  squadBattle,
  type OwnedAnimal,
  type SquadState,
} from './Squad';

const empty = (): SquadState => ({ animals: [], nextId: 1 });
it('draws two distinct tier-one starters deterministically from the run seed', () => {
  const pairs = new Set<string>();
  const species = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const seed = `starter-check-${i}`;
    const squad = starterSquad(seed);
    expect(starterSquad(seed)).toEqual(squad);
    expect(squad.animals).toHaveLength(2);
    expect(new Set(squad.animals.map((u) => u.animalId)).size).toBe(2);
    for (const unit of squad.animals) {
      expect(['rabbit', 'dog', 'chicken', 'monkey']).toContain(unit.animalId);
      expect(unit.starLevel).toBe(1);
      expect(unit.location.kind).toBe('board');
      species.add(unit.animalId);
    }
    pairs.add(squad.animals.map((u) => u.animalId).join(','));
  }
  expect(species.size).toBe(4);
  expect(pairs.size).toBe(12);
});
describe('automatic upgrades', () => {
  it('merges three copies into 2 stars and nine into 3 stars', () => {
    expect(addCopies(empty(), 'wolf', 3).squad.animals).toMatchObject([
      { animalId: 'wolf', starLevel: 2 },
    ]);
    const nine = addCopies(empty(), 'wolf', 9);
    expect(nine.squad.animals).toHaveLength(1);
    expect(nine.squad.animals[0].starLevel).toBe(3);
    expect(nine.merges).toHaveLength(4);
  });
  it('chains with existing 2-star copies and preserves the deployed survivor', () => {
    const base: OwnedAnimal[] = [
      {
        instanceId: 'board',
        animalId: 'wolf',
        starLevel: 2,
        location: { kind: 'board', position: { x: 2, y: 1 } },
      },
      {
        instanceId: 'bench',
        animalId: 'wolf',
        starLevel: 2,
        location: { kind: 'bench', slot: 0 },
      },
    ];
    const result = addCopies({ animals: base, nextId: 1 }, 'wolf', 3);
    expect(result.squad.animals).toEqual([{ ...base[0], starLevel: 3 }]);
    expect(result.merges).toHaveLength(2);
  });
  it('combines copies across bench and board independent of input ordering', () => {
    const state = initialSquad();
    const copies = addCopies(state, 'bear', 2);
    expect(
      copies.squad.animals.find((u) => u.animalId === 'bear'),
    ).toMatchObject({
      instanceId: 'player-bear',
      starLevel: 2,
      location: { kind: 'board', position: { x: 2, y: 1 } },
    });
    const animals = addCopies(empty(), 'rabbit', 2).squad.animals;
    const three = [
      ...animals,
      {
        ...animals[0],
        instanceId: 'third',
        location: { kind: 'bench' as const, slot: 2 },
      },
    ];
    expect(combineAnimals(three)).toEqual(combineAnimals([...three].reverse()));
  });
  it('never merges 3-star animals or different species', () => {
    const stars = addCopies(empty(), 'wolf', 9).squad.animals[0];
    const trio = [
      stars,
      { ...stars, instanceId: 'second' },
      { ...stars, instanceId: 'third' },
    ];
    expect(combineAnimals(trio).merges).toEqual([]);
    let state = addCopies(empty(), 'wolf', 2).squad;
    state = addCopies(state, 'rabbit', 1).squad;
    expect(state.animals).toHaveLength(3);
  });
  it('checks storage after merging and rejects overflow atomically', () => {
    const animals: OwnedAnimal[] = Array.from({ length: 8 }, (_, slot) => ({
      instanceId: `max-${slot}`,
      animalId: 'bear',
      starLevel: 3,
      location: { kind: 'bench', slot },
    }));
    const full = { animals, nextId: 1 };
    expect(addCopies(full, 'wolf', 1)).toMatchObject({
      squad: full,
      error: expect.any(String),
      merges: [],
    });
    const almost = { animals: animals.slice(0, 7), nextId: 1 };
    const merged = addCopies(almost, 'wolf', 9);
    expect(merged.error).toBeUndefined();
    expect(merged.squad.animals).toHaveLength(8);
    expect(merged.squad.animals.at(-1)?.location).toEqual({
      kind: 'bench',
      slot: 7,
    });
  });
});
describe('deployment and combat isolation', () => {
  it('rejects overcapacity and invalid cells without changing state', () => {
    const state = addCopies(initialSquad(), 'wolf', 1).squad;
    const id = state.animals.at(-1)!.instanceId;
    expect(
      moveAnimal(state, id, { kind: 'board', position: { x: 0, y: 0 } }).squad,
    ).toBe(state);
    expect(
      moveAnimal(state, id, { kind: 'board', position: { x: 5, y: 0 } }).error,
    ).toBeTruthy();
    expect(
      moveAnimal(state, id, { kind: 'bench', slot: 8 }).error,
    ).toBeTruthy();
  });
  it('swaps board/bench, board/board, and bench/bench', () => {
    let state = addCopies(initialSquad(), 'wolf', 2).squad;
    const id = state.animals.at(-1)!.instanceId;
    state = moveAnimal(state, id, {
      kind: 'board',
      position: { x: 2, y: 1 },
    }).squad;
    expect(
      state.animals.find((u) => u.instanceId === 'player-bear')?.location,
    ).toEqual({ kind: 'bench', slot: 1 });
    state = moveAnimal(state, id, {
      kind: 'board',
      position: { x: 1, y: 2 },
    }).squad;
    expect(
      state.animals.find((u) => u.instanceId === 'player-rabbit')?.location,
    ).toEqual({ kind: 'board', position: { x: 2, y: 1 } });
    state = moveAnimal(state, 'player-bear', { kind: 'bench', slot: 0 }).squad;
    expect(
      state.animals.find((u) => u.instanceId === 'player-bear')?.location,
    ).toEqual({ kind: 'bench', slot: 0 });
  });
  it('scales health/attack and preserves owned positions through a battle', () => {
    const state = addCopies(initialSquad(), 'bear', 2).squad;
    const before = JSON.stringify(state);
    const battle = new Battle(squadBattle(state, 'scaled'));
    expect(
      battle.snapshot.units.find((u) => u.animalId === 'bear'),
    ).toMatchObject({ health: 324, attack: 36, starLevel: 2 });
    while (!battle.isFinished()) battle.step();
    expect(JSON.stringify(state)).toBe(before);
    const restored = new Battle(squadBattle(state, 'scaled'));
    expect(
      restored.snapshot.units.find((u) => u.animalId === 'bear'),
    ).toMatchObject({ health: 324, position: { x: 2, y: 1 } });
  });
});

it('allows deployment in the two added rows and rejects the seventh row', () => {
  let squad = initialSquad();
  for (const y of [4, 5]) {
    const moved = moveAnimal(squad, 'player-bear', {
      kind: 'board',
      position: { x: 2, y },
    });
    expect(moved.error).toBeUndefined();
    squad = moved.squad;
  }
  expect(
    moveAnimal(squad, 'player-bear', {
      kind: 'board',
      position: { x: 2, y: 6 },
    }).squad,
  ).toBe(squad);
});
