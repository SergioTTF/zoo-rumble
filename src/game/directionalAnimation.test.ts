import { expect, it } from 'vitest';
import {
  directionalFrame,
  facingFor,
  type Facing,
} from './directionalAnimation';

it('plays dedicated actions in every direction and holds the final defeat frame', () => {
  const timings = [40, 60, 80, 60];
  const directions: Facing[] = ['left', 'front', 'rear', 'right'];
  directions.forEach((facing, row) => {
    const base = row * 4;
    for (const pose of ['idle', 'walk', 'attack', 'death'] as const) {
      const offset = { walk: 0, idle: 16, attack: 32, death: 48 }[pose];
      expect(
        [0, 40, 100, 180].map((time) =>
          directionalFrame(facing, pose, time, false, timings, true),
        ),
      ).toEqual([0, 1, 2, 3].map((frame) => offset + base + frame));
      expect(directionalFrame(facing, pose, 1000, false, timings, true)).toBe(
        offset + base + (pose === 'attack' || pose === 'death' ? 3 : 1),
      );
      expect(directionalFrame(facing, pose, 100, true, timings, true)).toBe(
        pose === 'death' ? 48 + base + 3 : 16 + base,
      );
    }
  });
});

it('chooses screen-facing directions and retains a facing at rest', () => {
  expect(facingFor(65, 31, 'left')).toBe('right');
  expect(facingFor(-65, 31, 'right')).toBe('left');
  expect(facingFor(0, 62, 'left')).toBe('front');
  expect(facingFor(0, -62, 'right')).toBe('rear');
  expect(facingFor(0, 0, 'rear')).toBe('rear');
});

it('never crosses directional rows and holds a contact pose for attacks and reduced motion', () => {
  const timings = [40, 60, 80, 60];
  const directions: Facing[] = ['left', 'front', 'rear', 'right'];
  directions.forEach((facing, row) => {
    const base = row * 4;
    expect(
      [0, 40, 100, 180, 240].map((time) =>
        directionalFrame(facing, 'walk', time, false, timings),
      ),
    ).toEqual([base, base + 1, base + 2, base + 3, base]);
    expect(directionalFrame(facing, 'idle', 500, false, timings)).toBe(base);
    expect(directionalFrame(facing, 'attack', 120, false, timings)).toBe(base);
    expect(directionalFrame(facing, 'walk', 120, true, timings)).toBe(base);
  });
});
