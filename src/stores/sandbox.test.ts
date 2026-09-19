import { expect, it } from 'vitest';
import { useSandbox } from './sandbox';
import { initialRun, runBattle } from '../run/Run';
import { Battle } from '../simulation/battle/Battle';
import { starterSquad } from '../run/Squad';

it('previews valid added-row drops, suppresses invalid tiles, and clears after dragging', () => {
  useSandbox.setState({ status: 'ready' });
  useSandbox.getState().resetSquad();
  const state = useSandbox.getState();
  state.setDragging('player-bear');
  state.setDropPreview({ x: 2, y: 5 });
  expect(useSandbox.getState().dropPreview).toEqual({ x: 2, y: 5 });
  state.setDropPreview({ x: 5, y: 5 });
  expect(useSandbox.getState().dropPreview).toBeNull();
  state.setDropPreview({ x: 2, y: 5 });
  state.setDragging(null);
  expect(useSandbox.getState().dropPreview).toBeNull();
});

it('creates fresh runs but recreates seeded starters when a seed is applied', () => {
  useSandbox.setState({ status: 'ready' });
  useSandbox.getState().newRun();
  const first = useSandbox.getState();
  first.newRun();
  const second = useSandbox.getState();
  expect(second.seed).not.toBe(first.seed);
  expect(second.squad).toEqual(starterSquad(second.seed));
  expect(second.economy.seed).toBe(second.seed);
  second.setSeed(first.seed);
  expect(useSandbox.getState().squad).toEqual(first.squad);
});

it('locks all collection commands during combat and results', () => {
  useSandbox.setState({ status: 'ready' });
  useSandbox.getState().resetSquad();
  const squad = useSandbox.getState().squad;
  for (const status of ['running', 'finished'] as const) {
    useSandbox.setState({ status });
    const state = useSandbox.getState();
    state.add('wolf', 3);
    state.resetSquad(true);
    state.remove('player-bear');
    state.move('player-bear', { kind: 'bench', slot: 0 });
    const economy = useSandbox.getState().economy;
    state.buy(economy.shop[0]!.id);
    state.buyXP();
    state.reroll();
    state.sell('player-bear');
    state.addGold();
    state.demoTrait('canine');
    state.setSeed('locked');
    expect(useSandbox.getState().squad).toBe(squad);
    expect(useSandbox.getState().economy).toBe(economy);
  }
  useSandbox.setState({ status: 'ready' });
});

it('settles bridge results once, advances atomically, and resets a run', () => {
  useSandbox.setState({ status: 'ready', run: initialRun() });
  useSandbox.getState().newRun();
  const start = useSandbox.getState();
  const battle = new Battle(runBattle(start.squad, start.seed, start.run));
  while (!battle.isFinished()) battle.step();
  const frame = {
    status: 'finished' as const,
    snapshot: battle.snapshot,
    events: [],
    reset: false,
  };
  start.receiveFrame(frame);
  const settled = useSandbox.getState();
  expect(settled.run.attempts).toBe(1);
  expect(settled.economy.xp).toBe(2);
  start.receiveFrame({ ...frame, status: 'running' });
  start.nextRound();
  expect(useSandbox.getState().run).toBe(settled.run);
  start.receiveFrame(frame);
  expect(useSandbox.getState().economy).toBe(settled.economy);
  start.nextRound();
  const next = useSandbox.getState();
  expect(next.run.round).toBe(2);
  expect(next.squad).toBe(start.squad);
  expect(next.economy.gold).toBe(20);
  start.nextRound();
  expect(useSandbox.getState().economy).toBe(next.economy);
  useSandbox.setState({ status: 'running' });
  start.newRun();
  expect(useSandbox.getState().run).toBe(next.run);
  useSandbox.setState({ status: 'finished' });
  start.newRun();
  expect(useSandbox.getState().run).toEqual(initialRun());
  expect(useSandbox.getState().economy.xp).toBe(0);
});
