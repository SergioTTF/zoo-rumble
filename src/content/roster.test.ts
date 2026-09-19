import { expect, it } from 'vitest';
import { abilityDescription, ANIMALS } from './animals';
import { TRAITS } from './traits';
import { Battle } from '../simulation/battle/Battle';
import { initialRun, runBattle } from '../run/Run';
import type { SquadState } from '../run/Squad';
import { enemySquad } from '../run/Run';

it('provides sixteen unique, valid animals with valid traits and playable combat', () => {
  expect(ANIMALS).toHaveLength(16);
  expect(new Set(ANIMALS.map((a) => a.id)).size).toBe(16);
  for (const animal of ANIMALS) {
    expect(abilityDescription(animal)).not.toContain('future milestone');
    for (const trait of animal.traits)
      expect(TRAITS.some((t) => t.id === trait)).toBe(true);
    const battle = new Battle(
      runBattle(
        {
          animals: [
            {
              instanceId: 'owned-test',
              animalId: animal.id,
              starLevel: 1,
              location: { kind: 'board', position: { x: 2, y: 1 } },
            },
          ],
          nextId: 1,
        },
        'roster',
        initialRun(),
      ),
    );
    while (!battle.isFinished()) battle.step();
    expect(battle.result).not.toBeNull();
  }
});

it('introduces upgraded enemies gradually rather than upgrading the entire late squad', () => {
  expect(
    [6, 7, 8].map(
      (r) => enemySquad('balance', r).filter((u) => u.starLevel === 2).length,
    ),
  ).toEqual([1, 2, 2]);
});

it('keeps upgraded six-unit compositions competitive across encounter seeds', () => {
  const teams = [
    ['dog', 'wolf', 'fox', 'hyena', 'jackal', 'eagle'],
    ['monkey', 'chimpanzee', 'baboon', 'gorilla', 'owl', 'penguin'],
    ['chicken', 'parrot', 'penguin', 'owl', 'eagle', 'bear'],
  ];
  for (const team of teams) {
    const squad: SquadState = {
      nextId: 6,
      animals: team.map((animalId, i) => ({
        instanceId: `owned-${i}`,
        animalId,
        starLevel: 2,
        location: { kind: 'board', position: { x: i < 4 ? 2 : 1, y: i % 4 } },
      })),
    };
    const wins = Array.from({ length: 8 }, (_, seed) => {
      const battle = new Battle(
        runBattle(squad, `balance-${seed}`, { ...initialRun(), round: 8 }),
      );
      while (!battle.isFinished()) battle.step();
      return battle.result?.winner === 'player';
    }).filter(Boolean).length;
    expect(wins).toBeGreaterThanOrEqual(1);
  }
});
