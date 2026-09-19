import { describe, expect, it } from 'vitest';
import { ENCOUNTERS } from '../content/runBalance';
import { Battle } from '../simulation/battle/Battle';
import type { BattleResult } from '../simulation/types';
import { initialEconomy } from './Economy';
import { initialSquad } from './Squad';
import {
  enemySquad,
  initialRun,
  nextPreparation,
  runBattle,
  settleRound,
} from './Run';

const win: BattleResult = {
  winner: 'player',
  reason: 'elimination',
  tick: 20,
  elapsedMs: 2000,
};
const loss: BattleResult = { ...win, winner: 'enemy' };
describe('run progression', () => {
  it('starts with three lives and an independently seeded, valid encounter for every round', () => {
    expect(initialRun()).toEqual({
      round: 1,
      lives: 3,
      attempts: 0,
      phase: 'preparation',
    });
    for (let round = 1; round <= 8; round++) {
      const enemies = enemySquad('seed', round);
      expect(enemies).toEqual(enemySquad('seed', round));
      expect(enemies).toHaveLength(ENCOUNTERS[round - 1].count);
      expect(
        new Set(enemies.map((u) => `${u.position.x},${u.position.y}`)).size,
      ).toBe(enemies.length);
      expect(new Set(enemies.map((u) => u.instanceId)).size).toBe(
        enemies.length,
      );
      expect(
        () =>
          new Battle(
            runBattle(initialSquad(), 'seed', { ...initialRun(), round }),
          ),
      ).not.toThrow();
    }
    expect(enemySquad('seed', 8)).not.toEqual(enemySquad('other', 8));
    expect(() => enemySquad('seed', 9)).toThrow();
  });
  it('settles once, carries gold, grants XP, and refreshes once on next preparation', () => {
    const start = initialEconomy('seed');
    const settled = settleRound(initialRun(), start, loss);
    expect(settled.run.lives).toBe(2);
    expect(settled.economy.gold).toBe(10);
    expect(settled.economy.xp).toBe(2);
    expect(settleRound(settled.run, settled.economy, win)).toEqual(settled);
    const next = nextPreparation(settled.run, settled.economy);
    expect(next.run.round).toBe(2);
    expect(next.economy.gold).toBe(20);
    expect(next.economy.refresh).toBe(1);
    expect(nextPreparation(next.run, next.economy)).toEqual(next);
  });
  it('ends on the third loss and cannot advance a terminal run', () => {
    let state = { run: initialRun(), economy: initialEconomy('seed') };
    for (let i = 0; i < 3; i++) {
      state = settleRound(state.run, state.economy, loss);
      if (i < 2) state = nextPreparation(state.run, state.economy);
    }
    expect(state.run).toMatchObject({ lives: 0, phase: 'lost', attempts: 3 });
    expect(nextPreparation(state.run, state.economy)).toEqual(state);
    expect(settleRound(state.run, state.economy, win)).toEqual(state);
  });
  it('wins eight encounters and retries a failed finale with identical opposition', () => {
    let state = { run: initialRun(), economy: initialEconomy('seed') };
    for (let i = 1; i < 8; i++) {
      state = settleRound(state.run, state.economy, win);
      state = nextPreparation(state.run, state.economy);
    }
    const config = runBattle(initialSquad(), 'seed', state.run);
    state = settleRound(state.run, state.economy, loss);
    state = nextPreparation(state.run, state.economy);
    expect(state.run).toMatchObject({
      round: 8,
      lives: 2,
      phase: 'preparation',
    });
    expect(runBattle(initialSquad(), 'seed', state.run)).toEqual(config);
    state = settleRound(state.run, state.economy, win);
    expect(state.run.phase).toBe('won');
    expect(state.run.attempts).toBe(9);
    expect(nextPreparation(state.run, state.economy)).toEqual(state);
  });
  it('runs all encounters headlessly with repeatable streams and restored owned units', () => {
    const squad = initialSquad();
    const before = JSON.stringify(squad);
    for (let round = 1; round <= 8; round++) {
      const config = runBattle(squad, 'seed', { ...initialRun(), round });
      const execute = () => {
        const battle = new Battle(config);
        while (!battle.isFinished()) battle.step();
        return { events: battle.drainEvents(), result: battle.result };
      };
      expect(execute()).toEqual(execute());
    }
    expect(JSON.stringify(squad)).toBe(before);
  });
});
