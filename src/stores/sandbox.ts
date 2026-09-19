import {
  initialRun,
  settleRound,
  nextPreparation,
  type RunState,
} from '../run/Run';
import { create } from 'zustand';
import { sandboxEncounter } from '../content/encounter';
import { Battle } from '../simulation/battle/Battle';
import { ANIMALS } from '../content/animals';
import { TRAITS } from '../content/traits';
import { LEVEL_XP, type PlayerLevel } from '../content/economy';
import {
  initialEconomy,
  generateShop,
  playerLevel,
  purchase,
  reroll,
  buyXP,
  sell,
  type EconomyState,
} from '../run/Economy';
import {
  addCopies,
  initialSquad,
  starterSquad,
  moveAnimal,
  type Location,
  type Merge,
  type SquadState,
} from '../run/Squad';
import type { BattleSnapshot } from '../simulation/types';
import type {
  PresentationFrame,
  SandboxStatus,
} from '../game/bridge/SandboxController';
export type Speed = 1 | 2 | 4 | 10;
const freshSeed = () => crypto.randomUUID();
const openingSeed = freshSeed();
interface SandboxState {
  soundEnabled: boolean;
  reducedMotion: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  draggingId: string | null;
  dropPreview: import('../simulation/types').Position | null;
  setDropPreview: (
    position: import('../simulation/types').Position | null,
  ) => void;
  setDragging: (id: string | null) => void;
  run: RunState;
  nextRound: () => void;
  newRun: () => void;
  speed: Speed;
  paused: boolean;
  seed: string;
  status: SandboxStatus;
  snapshot: BattleSnapshot;
  squad: SquadState;
  economy: EconomyState;
  selectedId: string | null;
  message: string;
  merges: readonly Merge[];
  mergeVersion: number;
  setSpeed: (speed: Speed) => void;
  setPaused: (paused: boolean) => void;
  setSeed: (seed: string) => void;
  select: (id: string | null) => void;
  move: (id: string, location: Location) => void;
  add: (animalId: string, count: number) => void;
  remove: (id: string) => void;
  buy: (offerId: string) => void;
  reroll: () => void;
  buyXP: () => void;
  sell: (id: string) => void;
  addGold: () => void;
  demoTrait: (traitId: string) => void;
  resetSquad: (clear?: boolean) => void;
  receiveFrame: (frame: PresentationFrame) => void;
}
export const useSandbox = create<SandboxState>((set) => ({
  soundEnabled: false,
  reducedMotion: false,
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  draggingId: null,
  dropPreview: null,
  setDropPreview: (position) =>
    set((s) => {
      const dropPreview =
        s.status === 'ready' &&
        s.draggingId &&
        position &&
        !moveAnimal(
          s.squad,
          s.draggingId,
          { kind: 'board', position },
          playerLevel(s.economy.xp),
        ).error
          ? position
          : null;
      return s.dropPreview?.x === dropPreview?.x &&
        s.dropPreview?.y === dropPreview?.y
        ? {}
        : { dropPreview };
    }),
  setDragging: (id) =>
    set((s) => ({
      draggingId: s.status === 'ready' ? id : null,
      ...(id === null ? { dropPreview: null } : {}),
    })),
  run: initialRun(),
  nextRound: () =>
    set((s) =>
      s.status === 'finished' && s.run.phase === 'result'
        ? {
            ...nextPreparation(s.run, s.economy),
            status: 'ready',
            selectedId: null,
            merges: [],
            message:
              'New round: +10 gold, free shop refresh. Your animals are fully healed.',
          }
        : {},
    ),
  newRun: () =>
    set((s) => {
      if (s.status === 'running') return {};
      const seed = freshSeed();
      return {
        run: initialRun(),
        seed,
        squad: starterSquad(seed),
        economy: initialEconomy(seed),
        status: 'ready',
        paused: false,
        merges: [],
        selectedId: null,
        message: 'A new adventure begins!',
      };
    }),
  speed: 1,
  paused: false,
  seed: openingSeed,
  status: 'ready',
  snapshot: new Battle(sandboxEncounter()).snapshot,
  squad: starterSquad(openingSeed),
  economy: initialEconomy(openingSeed),
  selectedId: null,
  message:
    'Drag animals to reveal placement tiles, or hold Tab. Three matching copies upgrade automatically.',
  merges: [],
  mergeVersion: 0,
  setSpeed: (speed) => set({ speed }),
  setPaused: (paused) => set({ paused }),
  setSeed: (seed) =>
    set((s) =>
      s.status === 'ready'
        ? {
            run: initialRun(),
            seed,
            economy: initialEconomy(seed),
            squad: starterSquad(seed),
            selectedId: null,
            merges: [],
            message: 'Seed applied. Economy and squad reset.',
          }
        : {},
    ),
  select: (selectedId) =>
    set((s) => (s.status === 'ready' ? { selectedId } : {})),
  move: (id, location) =>
    set((s) => {
      if (s.status !== 'ready') return {};
      const result = moveAnimal(
        s.squad,
        id,
        location,
        playerLevel(s.economy.xp),
      );
      return {
        squad: result.squad,
        selectedId: result.error ? s.selectedId : null,
        message: result.error ?? 'Position updated.',
      };
    }),
  add: (animalId, count) =>
    set((s) => {
      if (s.status !== 'ready') return {};
      const result = addCopies(s.squad, animalId, count);
      return {
        squad: result.squad,
        merges: result.merges,
        mergeVersion: s.mergeVersion + 1,
        selectedId: null,
        message:
          result.error ??
          (result.merges.length
            ? `Upgrade! ${result.merges.length} merge${result.merges.length === 1 ? '' : 's'} completed.`
            : 'Animal added to your bench.'),
      };
    }),
  remove: (id) =>
    set((s) =>
      s.status === 'ready'
        ? {
            squad: {
              ...s.squad,
              animals: s.squad.animals.filter((u) => u.instanceId !== id),
            },
            selectedId: null,
            message: 'Animal removed.',
          }
        : {},
    ),
  buy: (offerId) =>
    set((s) => {
      if (s.status !== 'ready') return {};
      const result = purchase(s.economy, s.squad, offerId);
      return {
        economy: result.economy,
        squad: result.squad,
        merges: result.merges,
        mergeVersion: s.mergeVersion + 1,
        selectedId: null,
        message:
          result.error ??
          (result.merges.length
            ? 'Purchased and upgraded!'
            : 'Purchased. Deploy your new animal from the bench.'),
      };
    }),
  reroll: () =>
    set((s) => {
      if (s.status !== 'ready') return {};
      const result = reroll(s.economy);
      return {
        economy: result.economy,
        message: result.error ?? 'Shop refreshed.',
      };
    }),
  buyXP: () =>
    set((s) => {
      if (s.status !== 'ready') return {};
      const result = buyXP(s.economy);
      const level = playerLevel(result.economy.xp);
      return {
        economy: result.economy,
        message:
          result.error ??
          (level > playerLevel(s.economy.xp)
            ? `Level ${level}! Deploy up to ${level} animals. New rarity odds apply on the next reroll.`
            : 'XP purchased.'),
      };
    }),
  sell: (id) =>
    set((s) => {
      if (s.status !== 'ready') return {};
      const result = sell(s.economy, s.squad, id);
      return {
        economy: result.economy,
        squad: result.squad,
        selectedId: null,
        message: result.error ?? 'Animal sold for its base tier cost.',
      };
    }),
  addGold: () =>
    set((s) =>
      s.status === 'ready'
        ? {
            economy: { ...s.economy, gold: s.economy.gold + 10 },
            message: 'Debug: added 10 gold.',
          }
        : {},
    ),
  demoTrait: (traitId) =>
    set((s) => {
      if (s.status !== 'ready' || !TRAITS.some((t) => t.id === traitId))
        return {};
      const members = ANIMALS.filter((a) => a.traits.includes(traitId)).slice(
        0,
        4,
      );
      const level = Math.max(2, members.length) as PlayerLevel;
      const refresh = s.economy.refresh + 1;
      return {
        squad: {
          animals: members.map((a, index) => ({
            instanceId: `owned-${s.squad.nextId + index}`,
            animalId: a.id,
            starLevel: 1 as const,
            location: { kind: 'board' as const, position: { x: 2, y: index } },
          })),
          nextId: s.squad.nextId + members.length,
        },
        economy: {
          ...s.economy,
          gold: 50,
          xp: LEVEL_XP[level],
          refresh,
          shop: generateShop(s.seed, level, refresh),
        },
        selectedId: null,
        merges: [],
        message: `Debug: loaded ${traitId} squad. Inspect active traits and start a battle.`,
      };
    }),
  resetSquad: (clear = false) =>
    set((s) =>
      s.status === 'ready'
        ? {
            squad: clear
              ? { animals: [], nextId: s.squad.nextId }
              : initialSquad(),
            economy: clear ? s.economy : initialEconomy(s.seed),
            selectedId: null,
            merges: [],
            message: clear
              ? 'Squad cleared. Add animals with the sandbox tools.'
              : 'Original encounter restored.',
          }
        : {},
    ),
  receiveFrame: (frame) =>
    set((s) => ({
      ...(frame.status === 'finished' && frame.snapshot.result
        ? settleRound(s.run, s.economy, frame.snapshot.result)
        : {}),
      status: frame.status,
      draggingId: null,
      snapshot: frame.snapshot,
      ...(frame.reset ? { paused: false } : {}),
    })),
}));
