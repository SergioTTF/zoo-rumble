import { expect, it } from 'vitest';
import type { PresentationFrame } from './SandboxController';
import { SandboxController } from './SandboxController';
import { addCopies, initialSquad, squadBattle } from '../../run/Squad';

function observe(controller: SandboxController) {
  const frames: PresentationFrame[] = [];
  controller.subscribe((frame) => frames.push(frame));
  return frames;
}

it('advances only after start and honors playback speed', () => {
  const controller = new SandboxController('clock');
  const frames = observe(controller);
  controller.advance(1000, 1, false);
  expect(frames.at(-1)?.snapshot.tick).toBe(0);
  controller.start();
  controller.advance(50, 2, false);
  expect(frames.at(-1)?.snapshot.tick).toBe(1);
});

it('replays a customized squad and restores its preparation positions', () => {
  const controller = new SandboxController('custom');
  const frames = observe(controller);
  const squad = addCopies(initialSquad(), 'bear', 2).squad;
  const config = squadBattle(squad, 'custom');
  controller.prepare(config);
  const initial = frames.at(-1)?.snapshot;
  controller.start();
  for (let i = 0; i < 60; i++) controller.advance(100, 1, false);
  const first = frames.at(-1)?.snapshot;
  controller.replay();
  for (let i = 0; i < 60; i++) controller.advance(100, 1, false);
  expect(frames.at(-1)?.snapshot).toEqual(first);
  controller.prepare(config);
  expect(frames.at(-1)?.snapshot).toEqual(initial);
});

it('previews an empty squad without allowing a battle to start', () => {
  const controller = new SandboxController('empty');
  const frames = observe(controller);
  controller.prepare(squadBattle({ animals: [], nextId: 1 }, 'empty'));
  expect(frames.at(-1)?.snapshot.units).toHaveLength(2);
  controller.start();
  controller.stepOneTick();
  controller.advance(1000, 1, false);
  expect(frames.at(-1)?.status).toBe('ready');
  expect(frames.at(-1)?.snapshot.tick).toBe(0);
});

it('discards paused and hidden wall time', () => {
  const controller = new SandboxController('visibility');
  const frames = observe(controller);
  controller.start();
  controller.advance(500, 1, true);
  controller.setHidden(true);
  controller.advance(500, 1, false);
  controller.setHidden(false);
  controller.advance(99, 1, false);
  expect(frames.at(-1)?.snapshot.tick).toBe(0);
  controller.advance(1, 1, false);
  expect(frames.at(-1)?.snapshot.tick).toBe(1);
});

it('steps exactly once and restarts the same encounter', () => {
  const controller = new SandboxController('restartable');
  const frames = observe(controller);
  controller.stepOneTick();
  expect(frames.at(-1)?.snapshot.tick).toBe(1);
  controller.restart();
  expect(frames.at(-1)).toMatchObject({
    status: 'ready',
    reset: true,
    snapshot: { tick: 0 },
  });
  controller.stepOneTick();
  expect(frames.at(-1)?.snapshot).toEqual(frames.at(-3)?.snapshot);
});
