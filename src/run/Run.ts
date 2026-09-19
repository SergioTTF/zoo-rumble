import { ENCOUNTERS, RUN_RULES } from '../content/runBalance';
import { LEVEL_XP } from '../content/economy';
import { BATTLE_RULES } from '../content/balance';
import { SeededRandom } from '../simulation/rng/SeededRandom';
import type { AnimalInstance, BattleResult } from '../simulation/types';
import { generateShop, playerLevel, type EconomyState } from './Economy';
import { squadBattle, type SquadState } from './Squad';
export interface RunState {
  readonly round: number;
  readonly lives: number;
  readonly attempts: number;
  readonly phase: 'preparation' | 'result' | 'won' | 'lost';
}
export function initialRun(): RunState {
  return {
    round: 1,
    lives: RUN_RULES.lives,
    attempts: 0,
    phase: 'preparation',
  };
}
export function enemySquad(
  seed: string,
  round: number,
): readonly AnimalInstance[] {
  const encounter = ENCOUNTERS[round - 1];
  if (!encounter) throw new Error('Invalid encounter round.');
  const rng = new SeededRandom(`${seed}:enemy:${round}`);
  return Array.from({ length: encounter.count }, (_, i) => ({
    instanceId: `enemy-${round}-${i + 1}`,
    animalId: encounter.pool[Math.floor(rng.next() * encounter.pool.length)],
    starLevel:
      'elites' in encounter && i >= encounter.elites ? 1 : encounter.stars,
    team: 'enemy',
    position: {
      x: 5 + Math.floor(i / BATTLE_RULES.height),
      y: round === 1 ? i + 1 : i % BATTLE_RULES.height,
    },
  }));
}
export function runBattle(squad: SquadState, seed: string, run: RunState) {
  const config = squadBattle(squad, `${seed}:battle:${run.round}`);
  return {
    ...config,
    units: [
      ...config.units.filter((u) => u.team === 'player'),
      ...enemySquad(seed, run.round),
    ],
  };
}
export function settleRound(
  run: RunState,
  economy: EconomyState,
  result: BattleResult,
) {
  if (run.phase !== 'preparation') return { run, economy };
  const won = result.winner === 'player';
  const lives = run.lives - (won ? 0 : 1);
  const phase =
    lives === 0
      ? 'lost'
      : won && run.round === RUN_RULES.rounds
        ? 'won'
        : 'result';
  return {
    run: { ...run, lives, attempts: run.attempts + 1, phase } as RunState,
    economy: {
      ...economy,
      xp: Math.min(LEVEL_XP[6], economy.xp + RUN_RULES.roundXP),
    },
  };
}
export function nextPreparation(run: RunState, economy: EconomyState) {
  if (run.phase !== 'result') return { run, economy };
  const refresh = economy.refresh + 1;
  return {
    run: {
      ...run,
      round: Math.min(RUN_RULES.rounds, run.round + 1),
      phase: 'preparation',
    } as RunState,
    economy: {
      ...economy,
      gold: economy.gold + RUN_RULES.preparationGold,
      refresh,
      shop: generateShop(economy.seed, playerLevel(economy.xp), refresh),
    },
  };
}
