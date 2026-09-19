import type { AbilityDefinition, TraitEffect } from '../types';

export function damageForHit(
  baseDamage: number,
  ability: AbilityDefinition | undefined,
  targetHealth: number,
  targetMaxHealth: number,
  effects: readonly TraitEffect[] = [],
): { damage: number; triggered: boolean } {
  const triggered =
    ability?.kind === 'executeDamage' &&
    targetHealth / targetMaxHealth < ability.belowHealthRatio;
  const traitMultiplier = effects.reduce(
    (multiplier, effect) =>
      multiplier *
      (effect.kind === 'damageBelowHealth' &&
      targetHealth / targetMaxHealth < effect.ratio
        ? effect.multiplier
        : 1),
    1,
  );
  return {
    damage: Math.round(
      baseDamage * (triggered ? ability.multiplier : 1) * traitMultiplier,
    ),
    triggered,
  };
}
export function grantsExtraAttack(
  ability: AbilityDefinition | undefined,
  normalAttackCount: number,
): boolean {
  return (
    ability?.kind === 'extraAttack' && normalAttackCount % ability.every === 0
  );
}
