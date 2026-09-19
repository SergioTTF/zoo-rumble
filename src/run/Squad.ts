import { BATTLE_RULES, SQUAD_RULES } from '../content/balance';
import { sandboxEncounter } from '../content/encounter';
import { ANIMALS } from '../content/animals';
import { SeededRandom } from '../simulation/rng/SeededRandom';
import type {
  AnimalId,
  BattleConfig,
  Position,
  StarLevel,
} from '../simulation/types';

export type Location =
  | { readonly kind: 'board'; readonly position: Position }
  | { readonly kind: 'bench'; readonly slot: number };
export interface OwnedAnimal {
  readonly instanceId: string;
  readonly animalId: AnimalId;
  readonly starLevel: StarLevel;
  readonly location: Location;
}
export interface Merge {
  readonly survivorId: string;
  readonly consumedIds: readonly string[];
  readonly starLevel: StarLevel;
}
export interface SquadState {
  readonly animals: readonly OwnedAnimal[];
  readonly nextId: number;
}
export function initialSquad(): SquadState {
  return {
    animals: sandboxEncounter()
      .units.filter((u) => u.team === 'player')
      .map((u) => ({
        instanceId: u.instanceId,
        animalId: u.animalId,
        starLevel: u.starLevel,
        location: { kind: 'board', position: { ...u.position } },
      })),
    nextId: 1,
  };
}
export function starterSquad(seed: string): SquadState {
  const pool = ANIMALS.filter((animal) => animal.tier === 1)
    .map((animal) => animal.id)
    .sort();
  const rng = new SeededRandom(`${seed}:starters`);
  const positions = [
    { x: 2, y: 1 },
    { x: 1, y: 2 },
  ];
  return {
    animals: positions.map((position, index) => {
      const choice = Math.floor(rng.next() * pool.length);
      const [animalId] = pool.splice(choice, 1);
      return {
        instanceId: `starter-${index + 1}`,
        animalId,
        starLevel: 1,
        location: { kind: 'board', position },
      };
    }),
    nextId: 1,
  };
}
const locationKey = (l: Location) =>
  l.kind === 'bench'
    ? `bench:${l.slot}`
    : `board:${l.position.x},${l.position.y}`;
const order = (a: OwnedAnimal, b: OwnedAnimal) => {
  if (a.location.kind !== b.location.kind)
    return a.location.kind === 'board' ? -1 : 1;
  const rank = (u: OwnedAnimal) =>
    u.location.kind === 'board'
      ? u.location.position.y * BATTLE_RULES.width + u.location.position.x
      : u.location.slot;
  return (
    rank(a) - rank(b) ||
    (a.instanceId < b.instanceId ? -1 : a.instanceId > b.instanceId ? 1 : 0)
  );
};
export function combineAnimals(animals: readonly OwnedAnimal[]): {
  animals: readonly OwnedAnimal[];
  merges: readonly Merge[];
} {
  let remaining = [...animals];
  const merges: Merge[] = [];
  for (;;) {
    const sorted = [...remaining].sort(order);
    const group = sorted
      .map((u) =>
        sorted.filter(
          (v) =>
            v.animalId === u.animalId &&
            v.starLevel === u.starLevel &&
            v.starLevel < 3,
        ),
      )
      .find((g) => g.length >= 3);
    if (!group) break;
    const [keeper, ...consumed] = group.slice(0, 3);
    const starLevel = (keeper.starLevel + 1) as StarLevel;
    const removed = new Set(consumed.map((u) => u.instanceId));
    remaining = remaining
      .filter((u) => !removed.has(u.instanceId))
      .map((u) =>
        u.instanceId === keeper.instanceId ? { ...u, starLevel } : u,
      );
    merges.push({
      survivorId: keeper.instanceId,
      consumedIds: [...removed],
      starLevel,
    });
  }
  return { animals: remaining, merges };
}
export function addCopies(
  state: SquadState,
  animalId: AnimalId,
  count: number,
): { squad: SquadState; merges: readonly Merge[]; error?: string } {
  if (
    !sandboxEncounter().animals.some((a) => a.id === animalId) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 9
  )
    return { squad: state, merges: [], error: 'Invalid animal or copy count.' };
  let nextId = state.nextId;
  const animals = [...state.animals];
  for (let i = 0; i < count; i++) {
    let slot = 0;
    while (
      animals.some(
        (u) => u.location.kind === 'bench' && u.location.slot === slot,
      )
    )
      slot++;
    animals.push({
      instanceId: `owned-${nextId++}`,
      animalId,
      starLevel: 1,
      location: { kind: 'bench', slot },
    });
  }
  const combined = combineAnimals(animals);
  const bench = combined.animals
    .filter((u) => u.location.kind === 'bench')
    .sort(order);
  if (bench.length > SQUAD_RULES.benchCapacity)
    return {
      squad: state,
      merges: [],
      error: 'Bench is full. Deploy or remove an animal.',
    };
  // Temporary overflow slots can be used when a batch immediately merges into valid storage.
  const occupied = new Set(
    bench
      .filter(
        (u) =>
          u.location.kind === 'bench' &&
          u.location.slot < SQUAD_RULES.benchCapacity,
      )
      .map((u) => (u.location.kind === 'bench' ? u.location.slot : -1)),
  );
  const normalized = combined.animals.map((u) => {
    if (
      u.location.kind !== 'bench' ||
      u.location.slot < SQUAD_RULES.benchCapacity
    )
      return u;
    let slot = 0;
    while (occupied.has(slot)) slot++;
    occupied.add(slot);
    return { ...u, location: { kind: 'bench' as const, slot } };
  });
  return { squad: { animals: normalized, nextId }, merges: combined.merges };
}
export function moveAnimal(
  state: SquadState,
  instanceId: string,
  destination: Location,
  capacity: number = SQUAD_RULES.deployedCapacity,
): { squad: SquadState; error?: string } {
  const source = state.animals.find((u) => u.instanceId === instanceId);
  if (!source) return { squad: state, error: 'Select an owned animal first.' };
  if (destination.kind === 'board') {
    const { x, y } = destination.position;
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      x >= SQUAD_RULES.deploymentColumns ||
      y < 0 ||
      y >= BATTLE_RULES.height
    )
      return { squad: state, error: 'Deploy in the three blue columns.' };
  } else if (
    !Number.isInteger(destination.slot) ||
    destination.slot < 0 ||
    destination.slot >= SQUAD_RULES.benchCapacity
  )
    return { squad: state, error: 'Invalid bench slot.' };
  const target = state.animals.find(
    (u) => locationKey(u.location) === locationKey(destination),
  );
  if (target?.instanceId === instanceId) return { squad: state };
  const boardCount = state.animals.filter(
    (u) => u.location.kind === 'board',
  ).length;
  if (
    source.location.kind === 'bench' &&
    destination.kind === 'board' &&
    !target &&
    boardCount >= capacity
  )
    return {
      squad: state,
      error: `Squad is full (${capacity}/${capacity}). Swap with a deployed animal.`,
    };
  return {
    squad: {
      ...state,
      animals: state.animals.map((u) =>
        u.instanceId === instanceId
          ? { ...u, location: destination }
          : u.instanceId === target?.instanceId
            ? { ...u, location: source.location }
            : u,
      ),
    },
  };
}
export function squadBattle(squad: SquadState, seed: string): BattleConfig {
  const encounter = sandboxEncounter(seed);
  return {
    ...encounter,
    units: [
      ...squad.animals.flatMap((u) =>
        u.location.kind === 'board'
          ? [
              {
                instanceId: u.instanceId,
                animalId: u.animalId,
                starLevel: u.starLevel,
                team: 'player' as const,
                position: { ...u.location.position },
              },
            ]
          : [],
      ),
      ...encounter.units.filter((u) => u.team === 'enemy'),
    ],
  };
}
