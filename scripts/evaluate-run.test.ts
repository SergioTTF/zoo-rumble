import { writeFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { ANIMALS } from '../src/content/animals';
import { TRAITS } from '../src/content/traits';
import { STAR_MULTIPLIERS } from '../src/content/balance';
import { Battle } from '../src/simulation/battle/Battle';
import {
  initialEconomy,
  purchase,
  buyXP,
  playerLevel,
  reroll,
  sell,
} from '../src/run/Economy';
import { starterSquad, moveAnimal, type OwnedAnimal } from '../src/run/Squad';
import {
  initialRun,
  nextPreparation,
  runBattle,
  settleRound,
} from '../src/run/Run';

// Deliberately simple policies: no opponent inspection or future shop knowledge.
function play(seed: string, focus: string) {
  let squad = starterSquad(seed);
  let economy = initialEconomy(seed);
  let run = initialRun();
  let purchases = 0;
  let merges = 0;
  let refreshes = 0;
  const rounds: {
    round: number;
    winner: string;
    seconds: number;
    level: number;
    gold: number;
  }[] = [];
  const score = (unit: OwnedAnimal) => {
    const animal = ANIMALS.find((a) => a.id === unit.animalId)!;
    const stats = animal.baseStats;
    const strength = Math.sqrt(
      (stats.health * stats.attack * 1000) / stats.attackIntervalMs,
    );
    return (
      strength *
      STAR_MULTIPLIERS[unit.starLevel] *
      (animal.traits.includes(focus) ? 1.3 : 1)
    );
  };
  while (run.phase === 'preparation') {
    // Buy capacity before filling it, retaining a purchase budget.
    while (
      playerLevel(economy.xp) < Math.min(6, run.round + 2) &&
      economy.gold >= 8
    ) {
      economy = buyXP(economy).economy;
    }
    for (let refresh = 0; refresh < 3; refresh++) {
      const offers = economy.shop
        .filter((offer) => offer !== null)
        .sort((a, b) => {
          const value = (id: string) => {
            const owned = squad.animals.filter(
              (u) => u.animalId === id && u.starLevel === 1,
            ).length;
            return (
              score({
                instanceId: '',
                animalId: id,
                starLevel: 1,
                location: { kind: 'bench', slot: 0 },
              }) * (owned === 2 ? 2 : owned === 1 ? 1.3 : 1)
            );
          };
          return (
            value(b.animalId) - value(a.animalId) || a.id.localeCompare(b.id)
          );
        });
      for (const offer of offers) {
        if (squad.animals.length >= 10) break;
        const bought = purchase(economy, squad, offer.id);
        if (!bought.error) {
          economy = bought.economy;
          squad = bought.squad;
          purchases++;
          merges += bought.merges.length;
        }
      }
      if (refresh === 2 || economy.gold < 3) break;
      economy = reroll(economy).economy;
      refreshes++;
    }
    const ranked = [...squad.animals].sort(
      (a, b) => score(b) - score(a) || a.instanceId.localeCompare(b.instanceId),
    );
    const deployed = ranked.slice(0, playerLevel(economy.xp));
    const kept = new Set(deployed.map((u) => u.instanceId));
    // Demote weak board units first; selected replacements then occupy empty cells.
    for (const unit of squad.animals.filter(
      (u) => u.location.kind === 'board' && !kept.has(u.instanceId),
    )) {
      const slot = Array.from({ length: 8 }, (_, i) => i).find(
        (i) =>
          !squad.animals.some(
            (u) => u.location.kind === 'bench' && u.location.slot === i,
          ),
      );
      if (slot !== undefined)
        squad = moveAnimal(
          squad,
          unit.instanceId,
          { kind: 'bench', slot },
          playerLevel(economy.xp),
        ).squad;
    }
    for (const unit of deployed.filter((u) => u.location.kind === 'bench')) {
      const position = Array.from({ length: 12 }, (_, i) => ({
        x: 2 - Math.floor(i / 4),
        y: i % 4,
      })).find(
        (p) =>
          !squad.animals.some(
            (u) =>
              u.location.kind === 'board' &&
              u.location.position.x === p.x &&
              u.location.position.y === p.y,
          ),
      );
      if (position)
        squad = moveAnimal(
          squad,
          unit.instanceId,
          { kind: 'board', position },
          playerLevel(economy.xp),
        ).squad;
    }
    // Release the weakest excess bench unit to avoid permanent storage lock.
    if (squad.animals.length >= 10) {
      const weakest = squad.animals
        .filter((u) => u.location.kind === 'bench')
        .sort((a, b) => score(a) - score(b))[0];
      if (weakest)
        ({ squad, economy } = sell(economy, squad, weakest.instanceId));
    }
    expect(economy.gold).toBeGreaterThanOrEqual(0);
    expect(
      squad.animals.filter((u) => u.location.kind === 'bench').length,
    ).toBeLessThanOrEqual(8);
    const locations = squad.animals.map((u) =>
      u.location.kind === 'bench'
        ? `bench:${u.location.slot}`
        : `board:${u.location.position.x},${u.location.position.y}`,
    );
    expect(new Set(locations).size).toBe(squad.animals.length);
    expect(
      squad.animals.filter((u) => u.location.kind === 'board').length,
    ).toBeLessThanOrEqual(playerLevel(economy.xp));
    const battle = new Battle(runBattle(squad, seed, run));
    while (!battle.isFinished()) {
      battle.step();
      battle.drainEvents();
    }
    const result = battle.result!;
    rounds.push({
      round: run.round,
      winner: result.winner,
      seconds: result.elapsedMs / 1000,
      level: playerLevel(economy.xp),
      gold: economy.gold,
    });
    ({ run, economy } = settleRound(run, economy, result));
    if (run.phase === 'result')
      ({ run, economy } = nextPreparation(run, economy));
    expect(run.attempts).toBeLessThanOrEqual(10);
  }
  expect(['won', 'lost']).toContain(run.phase);
  return {
    seed,
    policy: focus || 'generalist',
    outcome: run.phase,
    lives: run.lives,
    purchases,
    merges,
    refreshes,
    rounds,
  };
}

test('evaluate shop-funded full runs and reproduce each policy result', () => {
  const policies = ['', ...TRAITS.map((trait) => trait.id)];
  const runs = policies.flatMap((focus) =>
    Array.from({ length: 24 }, (_, i) => {
      const result = play(`m17-review-${i + 1}`, focus);
      expect(play(result.seed, focus)).toEqual(result);
      return result;
    }),
  );
  const summary = policies.map((focus) => {
    const group = runs.filter((r) => r.policy === (focus || 'generalist'));
    const fights = group.flatMap((r) => r.rounds);
    return {
      policy: focus || 'generalist',
      runs: group.length,
      wins: group.filter((r) => r.outcome === 'won').length,
      averageBattles:
        group.reduce((n, r) => n + r.rounds.length, 0) / group.length,
      averageFightSeconds:
        fights.reduce((n, r) => n + r.seconds, 0) / fights.length,
      averageMerges: group.reduce((n, r) => n + r.merges, 0) / group.length,
      lossesByRound: Array.from(
        { length: 8 },
        (_, i) =>
          fights.filter((f) => f.round === i + 1 && f.winner === 'enemy')
            .length,
      ),
    };
  });
  writeFileSync(
    'docs/milestone-17-results.json',
    JSON.stringify(
      {
        seeds: 'm17-review-1 through m17-review-24',
        policies,
        randomStarters: true,
        summary,
        runs,
      },
      null,
      2,
    ) + '\n',
  );
  console.table(summary);
}, 60_000);
