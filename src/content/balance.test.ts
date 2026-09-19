import { expect, it } from 'vitest';
import { BATTLE_RULES } from './balance';

it('uses the specified logical battlefield and fixed clock', () => {
  expect(BATTLE_RULES).toEqual({
    width: 8,
    height: 6,
    tickMs: 100,
    maxDurationMs: 60_000,
  });
});
