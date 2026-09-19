import { expect, it } from 'vitest';
import { abilityNotes, upgradeNotes } from './BattleAudio';

it('gives 2-star and 3-star upgrades distinct escalating signatures', () => {
  const two = upgradeNotes(2);
  const three = upgradeNotes(3);
  expect(two).toHaveLength(2);
  expect(three).toHaveLength(3);
  expect(three).not.toEqual(two);
  expect(two.every((note) => note.to > note.from)).toBe(true);
  expect(three.every((note) => note.to > note.from)).toBe(true);
  expect(three.at(-1)!.to).toBeGreaterThan(two.at(-1)!.to);
  expect(three.map((note) => note.delay)).toEqual([0, 0.08, 0.17]);
});

it('gives control, defense, burst, and rally abilities distinct cues', () => {
  const slam = abilityNotes('groundSlam');
  const guard = abilityNotes('loyalGuard');
  const dive = abilityNotes('skyDive');
  const rally = abilityNotes('battleCry');
  expect(
    new Set([slam, guard, dive, rally].map((notes) => JSON.stringify(notes)))
      .size,
  ).toBe(4);
  expect(slam[0]!.to).toBeLessThan(slam[0]!.from);
  expect(guard).toHaveLength(2);
  expect(rally).toHaveLength(2);
});
