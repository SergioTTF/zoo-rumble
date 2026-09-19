import type { AnimalDefinition } from '../simulation/types';
export const ANIMALS: readonly AnimalDefinition[] = [
  {
    id: 'bear',
    role: 'Tank',
    name: 'Bear',
    tier: 3,
    traits: ['woodland', 'hardy'],
    assetKey: 'bear',
    baseStats: {
      health: 180,
      attack: 20,
      attackIntervalMs: 1400,
      moveIntervalMs: 600,
      attackRange: 1,
    },
    specialAbility: { kind: 'bearHug', every: 3, stunMs: 1000 },
  },
  {
    id: 'rabbit',
    role: 'Skirmisher',
    name: 'Rabbit',
    tier: 1,
    traits: ['woodland'],
    assetKey: 'rabbit',
    baseStats: {
      health: 65,
      attack: 9,
      attackIntervalMs: 400,
      moveIntervalMs: 300,
      attackRange: 1,
    },
    ability: { kind: 'extraAttack', every: 4 },
  },
  {
    id: 'wolf',
    role: 'Brawler',
    name: 'Wolf',
    tier: 2,
    traits: ['canine', 'predator'],
    assetKey: 'wolf',
    baseStats: {
      health: 90,
      attack: 18,
      attackIntervalMs: 1000,
      moveIntervalMs: 500,
      attackRange: 1,
    },
    ability: { kind: 'executeDamage', belowHealthRatio: 0.4, multiplier: 1.5 },
    specialAbility: {
      kind: 'howl',
      every: 3,
      attackSpeed: 0.3,
      durationMs: 2000,
      radius: 2,
    },
  },
  {
    id: 'dog',
    role: 'Brawler',
    name: 'Dog',
    tier: 1,
    traits: ['canine'],
    assetKey: 'dog',
    baseStats: {
      health: 105,
      attack: 10,
      attackIntervalMs: 1000,
      moveIntervalMs: 500,
      attackRange: 1,
    },
    specialAbility: { kind: 'loyalGuard', every: 4, shieldRatio: 0.15 },
  },
  {
    id: 'fox',
    role: 'Skirmisher',
    name: 'Fox',
    tier: 2,
    traits: ['canine', 'predator', 'woodland', 'scavenger'],
    assetKey: 'fox',
    baseStats: {
      health: 75,
      attack: 17,
      attackIntervalMs: 800,
      moveIntervalMs: 400,
      attackRange: 1,
    },
    specialAbility: { kind: 'pounce', every: 4, bonusDamage: 0.8 },
  },
  {
    id: 'hyena',
    role: 'Brawler',
    name: 'Hyena',
    tier: 4,
    traits: ['predator', 'scavenger'],
    assetKey: 'hyena',
    baseStats: {
      health: 135,
      attack: 26,
      attackIntervalMs: 800,
      moveIntervalMs: 400,
      attackRange: 1,
    },
    ability: { kind: 'executeDamage', belowHealthRatio: 0.4, multiplier: 1.5 },
    specialAbility: {
      kind: 'cackle',
      every: 3,
      vulnerability: 0.2,
      durationMs: 1600,
    },
  },
  {
    id: 'chicken',
    role: 'Skirmisher',
    name: 'Chicken',
    tier: 1,
    traits: ['bird'],
    assetKey: 'chicken',
    baseStats: {
      health: 55,
      attack: 12,
      attackIntervalMs: 700,
      moveIntervalMs: 400,
      attackRange: 1,
    },
    specialAbility: { kind: 'featherGuard', every: 4 },
  },
  {
    id: 'penguin',
    role: 'Tank',
    name: 'Penguin',
    tier: 2,
    traits: ['bird', 'hardy'],
    assetKey: 'penguin',
    baseStats: {
      health: 140,
      attack: 13,
      attackIntervalMs: 1200,
      moveIntervalMs: 600,
      attackRange: 1,
    },
    specialAbility: { kind: 'chill', every: 3, slow: 0.3, durationMs: 1500 },
  },
  {
    id: 'eagle',
    role: 'Ranged hunter',
    name: 'Eagle',
    tier: 4,
    traits: ['bird', 'predator'],
    assetKey: 'eagle',
    baseStats: {
      health: 95,
      attack: 25,
      attackIntervalMs: 1000,
      moveIntervalMs: 300,
      attackRange: 3,
    },
    specialAbility: {
      kind: 'skyDive',
      every: 3,
      maxHealthDamageRatio: 0.12,
    },
  },
  {
    id: 'monkey',
    role: 'Ranged support',
    name: 'Monkey',
    tier: 1,
    traits: ['primate', 'woodland'],
    assetKey: 'monkey',
    baseStats: {
      health: 80,
      attack: 13,
      attackIntervalMs: 900,
      moveIntervalMs: 400,
      attackRange: 2,
    },
    specialAbility: { kind: 'bananaAid', every: 3, healRatio: 0.18 },
  },
  {
    id: 'baboon',
    role: 'Brawler',
    name: 'Baboon',
    tier: 3,
    traits: ['primate', 'predator'],
    assetKey: 'baboon',
    baseStats: {
      health: 115,
      attack: 20,
      attackIntervalMs: 1000,
      moveIntervalMs: 500,
      attackRange: 1,
    },
    ability: { kind: 'extraAttack', every: 4 },
    specialAbility: {
      kind: 'battleCry',
      every: 4,
      attackBonus: 0.25,
      durationMs: 1800,
      radius: 2,
    },
  },
  {
    id: 'gorilla',
    role: 'Tank',
    name: 'Gorilla',
    tier: 5,
    traits: ['primate', 'hardy'],
    assetKey: 'gorilla',
    baseStats: {
      health: 270,
      attack: 38,
      attackIntervalMs: 1400,
      moveIntervalMs: 700,
      attackRange: 1,
    },
    specialAbility: { kind: 'groundSlam', every: 3, stunMs: 500, radius: 1 },
  },
  {
    id: 'jackal',
    role: 'Skirmisher',
    name: 'Jackal',
    tier: 3,
    traits: ['canine', 'predator', 'scavenger'],
    assetKey: 'jackal',
    baseStats: {
      health: 110,
      attack: 22,
      attackIntervalMs: 900,
      moveIntervalMs: 400,
      attackRange: 1,
    },
    ability: { kind: 'executeDamage', belowHealthRatio: 0.4, multiplier: 1.3 },
    specialAbility: {
      kind: 'cripplingBite',
      every: 3,
      attackReduction: 0.25,
      durationMs: 1600,
    },
  },
  {
    id: 'parrot',
    role: 'Ranged support',
    name: 'Parrot',
    tier: 2,
    traits: ['bird'],
    assetKey: 'parrot',
    baseStats: {
      health: 75,
      attack: 12,
      attackIntervalMs: 700,
      moveIntervalMs: 400,
      attackRange: 2,
    },
    ability: { kind: 'extraAttack', every: 6 },
    specialAbility: { kind: 'squawk', every: 5, durationMs: 1500 },
  },
  {
    id: 'owl',
    role: 'Ranged hunter',
    name: 'Owl',
    tier: 3,
    traits: ['bird', 'predator', 'woodland', 'scavenger'],
    assetKey: 'owl',
    baseStats: {
      health: 90,
      attack: 22,
      attackIntervalMs: 1100,
      moveIntervalMs: 500,
      attackRange: 3,
    },
    specialAbility: { kind: 'chainStrike', every: 3, damageRatio: 0.6 },
  },
  {
    id: 'chimpanzee',
    role: 'Brawler',
    name: 'Chimpanzee',
    tier: 2,
    traits: ['primate', 'woodland'],
    assetKey: 'chimpanzee',
    baseStats: {
      health: 95,
      attack: 15,
      attackIntervalMs: 900,
      moveIntervalMs: 400,
      attackRange: 1,
    },
    ability: { kind: 'extraAttack', every: 5 },
    specialAbility: {
      kind: 'stoneSplash',
      every: 4,
      damageRatio: 0.5,
      radius: 1,
    },
  },
];

export function abilityDescription(animal: AnimalDefinition): string {
  const special = animal.specialAbility;
  if (special?.kind === 'howl')
    return `Howl: every ${special.every} attacks, nearby Wolves attack ${Math.round(special.attackSpeed * 100)}% faster for ${special.durationMs / 1000}s.`;
  if (special?.kind === 'bearHug')
    return `Bear Hug: every ${special.every} attacks, stun the current target for ${special.stunMs / 1000}s.`;
  if (special?.kind === 'loyalGuard')
    return `Loyal Guard: every ${special.every} attacks, shield the most wounded ally for ${Math.round(special.shieldRatio * 100)}% max health.`;
  if (special?.kind === 'pounce')
    return `Pounce: every ${special.every} attacks, deal ${Math.round(special.bonusDamage * 100)}% bonus damage.`;
  if (special?.kind === 'chill')
    return `Chill: every ${special.every} attacks, slow the target by ${Math.round(special.slow * 100)}% for ${special.durationMs / 1000}s.`;
  if (special?.kind === 'groundSlam')
    return `Ground Slam: every ${special.every} attacks, stun nearby enemies for ${special.stunMs / 1000}s.`;
  if (special?.kind === 'cackle')
    return `Cackle: every ${special.every} attacks, make the target take ${Math.round(special.vulnerability * 100)}% more damage for ${special.durationMs / 1000}s.`;
  if (special?.kind === 'skyDive')
    return `Sky Dive: every ${special.every} attacks, deal bonus damage equal to ${Math.round(special.maxHealthDamageRatio * 100)}% of the target's max health.`;
  if (special?.kind === 'bananaAid')
    return `Banana Aid: every ${special.every} attacks, heal the most wounded ally for ${Math.round(special.healRatio * 100)}% max health.`;
  if (special?.kind === 'battleCry')
    return `Battle Cry: every ${special.every} attacks, nearby allies deal ${Math.round(special.attackBonus * 100)}% more damage for ${special.durationMs / 1000}s.`;
  if (special?.kind === 'featherGuard')
    return `Feather Guard: every ${special.every} attacks, dodge the next incoming hit.`;
  if (special?.kind === 'cripplingBite')
    return `Crippling Bite: every ${special.every} attacks, reduce the target's damage by ${Math.round(special.attackReduction * 100)}% for ${special.durationMs / 1000}s.`;
  if (special?.kind === 'squawk')
    return `Squawk: every ${special.every} attacks, suppress the target's special ability for ${special.durationMs / 1000}s.`;
  if (special?.kind === 'chainStrike')
    return `Chain Strike: every ${special.every} attacks, arc ${Math.round(special.damageRatio * 100)}% attack damage to another enemy.`;
  if (special?.kind === 'stoneSplash')
    return `Stone Splash: every ${special.every} attacks, deal ${Math.round(special.damageRatio * 100)}% attack damage around the target.`;
  if (animal.ability?.kind === 'extraAttack')
    return `Flurry: every ${animal.ability.every} attacks grants an immediate extra hit.`;
  if (animal.ability?.kind === 'executeDamage')
    return `Execute: deals ${Math.round((animal.ability.multiplier - 1) * 100)}% bonus damage below ${Math.round(animal.ability.belowHealthRatio * 100)}% health.`;
  return 'Special ability coming in a future milestone.';
}
