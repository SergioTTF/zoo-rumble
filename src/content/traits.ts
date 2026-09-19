import type { TraitDefinition } from '../simulation/types';
export const TRAITS: readonly TraitDefinition[] = [
  {
    id: 'hardy',
    name: 'Hardy',
    thresholds: [
      {
        requiredUnits: 1,
        description:
          'Hardy animals retaliate for 3 damage after each incoming hit. Retaliation cannot trigger retaliation.',
        effects: [{ kind: 'retaliation', damage: 3 }],
      },
    ],
  },
  {
    id: 'scavenger',
    name: 'Scavenger',
    thresholds: [
      {
        requiredUnits: 1,
        description:
          'Living Scavengers heal 8% of maximum health when an ally falls.',
        effects: [{ kind: 'allyDeathHeal', ratio: 0.08 }],
      },
      {
        requiredUnits: 4,
        description:
          'Living Scavengers heal 18% of maximum health when an ally falls.',
        effects: [{ kind: 'allyDeathHeal', ratio: 0.18 }],
      },
    ],
  },
  {
    id: 'woodland',
    name: 'Woodland',
    thresholds: [
      {
        requiredUnits: 2,
        description:
          'Woodland animals begin battle with a shield worth 10% of maximum health.',
        effects: [{ kind: 'startingShield', ratio: 0.1 }],
      },
      {
        requiredUnits: 4,
        description:
          'Woodland animals begin battle with a shield worth 20% of maximum health.',
        effects: [{ kind: 'startingShield', ratio: 0.2 }],
      },
      {
        requiredUnits: 6,
        description:
          'Woodland animals begin battle with a shield worth 35% of maximum health.',
        effects: [{ kind: 'startingShield', ratio: 0.35 }],
      },
    ],
  },
  {
    id: 'canine',
    name: 'Canine',
    thresholds: [
      {
        requiredUnits: 2,
        description: 'Canines attack 15% faster.',
        effects: [{ kind: 'statBonus', stat: 'attackSpeed', amount: 0.15 }],
      },
      {
        requiredUnits: 4,
        description: 'Canines attack 35% faster.',
        effects: [{ kind: 'statBonus', stat: 'attackSpeed', amount: 0.35 }],
      },
    ],
  },
  {
    id: 'bird',
    name: 'Bird',
    thresholds: [
      {
        requiredUnits: 2,
        description: 'Birds move 20% faster and attack 10% faster.',
        effects: [
          { kind: 'statBonus', stat: 'moveSpeed', amount: 0.2 },
          { kind: 'statBonus', stat: 'attackSpeed', amount: 0.1 },
        ],
      },
      {
        requiredUnits: 3,
        description: 'Birds move 35% faster and attack 25% faster.',
        effects: [
          { kind: 'statBonus', stat: 'moveSpeed', amount: 0.35 },
          { kind: 'statBonus', stat: 'attackSpeed', amount: 0.25 },
        ],
      },
    ],
  },
  {
    id: 'primate',
    name: 'Primate',
    thresholds: [
      {
        requiredUnits: 2,
        description: 'Primates gain 15% attack and 10% health.',
        effects: [
          { kind: 'statBonus', stat: 'attack', amount: 0.15 },
          { kind: 'statBonus', stat: 'health', amount: 0.1 },
        ],
      },
      {
        requiredUnits: 3,
        description: 'Primates gain 30% attack and 20% health.',
        effects: [
          { kind: 'statBonus', stat: 'attack', amount: 0.3 },
          { kind: 'statBonus', stat: 'health', amount: 0.2 },
        ],
      },
    ],
  },
  {
    id: 'predator',
    name: 'Predator',
    thresholds: [
      {
        requiredUnits: 2,
        description: 'Predators deal 15% extra damage below 40% enemy health.',
        effects: [{ kind: 'damageBelowHealth', ratio: 0.4, multiplier: 1.15 }],
      },
      {
        requiredUnits: 4,
        description: 'Predators deal 30% extra damage below 40% enemy health.',
        effects: [{ kind: 'damageBelowHealth', ratio: 0.4, multiplier: 1.3 }],
      },
    ],
  },
];
