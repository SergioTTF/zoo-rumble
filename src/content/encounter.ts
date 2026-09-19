import type { BattleConfig } from '../simulation/types';
import { ANIMALS } from './animals';
import { TRAITS } from './traits';

export const DEFAULT_SEED = 'wildwood-001';
export function sandboxEncounter(seed = DEFAULT_SEED): BattleConfig {
  return {
    seed,
    animals: ANIMALS,
    traits: TRAITS,
    units: [
      {
        instanceId: 'player-bear',
        animalId: 'bear',
        starLevel: 1,
        team: 'player',
        position: { x: 2, y: 1 },
      },
      {
        instanceId: 'player-rabbit',
        animalId: 'rabbit',
        starLevel: 1,
        team: 'player',
        position: { x: 1, y: 2 },
      },
      {
        instanceId: 'enemy-wolf-1',
        animalId: 'wolf',
        starLevel: 1,
        team: 'enemy',
        position: { x: 5, y: 1 },
      },
      {
        instanceId: 'enemy-wolf-2',
        animalId: 'wolf',
        starLevel: 1,
        team: 'enemy',
        position: { x: 5, y: 2 },
      },
    ],
  };
}
