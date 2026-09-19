export type AnimalId = string;
export type AnimalTier = 1 | 2 | 3 | 4 | 5;
export type StarLevel = 1 | 2 | 3;
export type TraitId = string;
export type TraitEffect =
  | { readonly kind: 'startingShield'; readonly ratio: number }
  | { readonly kind: 'retaliation'; readonly damage: number }
  | { readonly kind: 'allyDeathHeal'; readonly ratio: number }
  | {
      readonly kind: 'statBonus';
      readonly stat: 'health' | 'attack' | 'attackSpeed' | 'moveSpeed';
      readonly amount: number;
    }
  | {
      readonly kind: 'damageBelowHealth';
      readonly ratio: number;
      readonly multiplier: number;
    };
export interface TraitThreshold {
  readonly requiredUnits: number;
  readonly description: string;
  readonly effects: readonly TraitEffect[];
}
export interface TraitDefinition {
  readonly id: TraitId;
  readonly name: string;
  readonly thresholds: readonly TraitThreshold[];
}
export interface ActiveTrait {
  readonly team: Team;
  readonly traitId: TraitId;
  readonly count: number;
  readonly requiredUnits: number;
}
export type Team = 'player' | 'enemy';
export interface Position {
  readonly x: number;
  readonly y: number;
}
export interface AnimalStats {
  readonly health: number;
  readonly attack: number;
  readonly attackIntervalMs: number;
  readonly moveIntervalMs: number;
  readonly attackRange: number;
}
export type AbilityDefinition =
  | { readonly kind: 'extraAttack'; readonly every: number }
  | {
      readonly kind: 'executeDamage';
      readonly belowHealthRatio: number;
      readonly multiplier: number;
    };
export type SpecialAbilityDefinition =
  | {
      readonly kind: 'howl';
      readonly every: number;
      readonly attackSpeed: number;
      readonly durationMs: number;
      readonly radius: number;
    }
  | {
      readonly kind: 'bearHug';
      readonly every: number;
      readonly stunMs: number;
    }
  | {
      readonly kind: 'loyalGuard';
      readonly every: number;
      readonly shieldRatio: number;
    }
  | {
      readonly kind: 'pounce';
      readonly every: number;
      readonly bonusDamage: number;
    }
  | {
      readonly kind: 'chill';
      readonly every: number;
      readonly slow: number;
      readonly durationMs: number;
    }
  | {
      readonly kind: 'groundSlam';
      readonly every: number;
      readonly stunMs: number;
      readonly radius: number;
    }
  | {
      readonly kind: 'cackle';
      readonly every: number;
      readonly vulnerability: number;
      readonly durationMs: number;
    }
  | {
      readonly kind: 'skyDive';
      readonly every: number;
      readonly maxHealthDamageRatio: number;
    }
  | {
      readonly kind: 'bananaAid';
      readonly every: number;
      readonly healRatio: number;
    }
  | {
      readonly kind: 'battleCry';
      readonly every: number;
      readonly attackBonus: number;
      readonly durationMs: number;
      readonly radius: number;
    }
  | { readonly kind: 'featherGuard'; readonly every: number }
  | {
      readonly kind: 'cripplingBite';
      readonly every: number;
      readonly attackReduction: number;
      readonly durationMs: number;
    }
  | {
      readonly kind: 'squawk';
      readonly every: number;
      readonly durationMs: number;
    }
  | {
      readonly kind: 'chainStrike';
      readonly every: number;
      readonly damageRatio: number;
    }
  | {
      readonly kind: 'stoneSplash';
      readonly every: number;
      readonly damageRatio: number;
      readonly radius: number;
    };
export interface AnimalDefinition {
  readonly role?:
    'Tank' | 'Brawler' | 'Skirmisher' | 'Ranged hunter' | 'Ranged support';
  readonly id: AnimalId;
  readonly name: string;
  readonly tier: AnimalTier;
  readonly traits: readonly TraitId[];
  readonly baseStats: AnimalStats;
  readonly ability?: AbilityDefinition;
  readonly specialAbility?: SpecialAbilityDefinition;
  readonly assetKey: string;
}
export interface AnimalInstance {
  readonly instanceId: string;
  readonly animalId: AnimalId;
  readonly starLevel: StarLevel;
  readonly team: Team;
  readonly position: Position;
}
export interface BattleConfig {
  readonly seed: string;
  readonly animals: readonly AnimalDefinition[];
  readonly units: readonly AnimalInstance[];
  readonly traits?: readonly TraitDefinition[];
  readonly rules?: {
    readonly width?: number;
    readonly height?: number;
    readonly tickMs?: number;
    readonly maxDurationMs?: number;
  };
}
export interface UnitSnapshot extends AnimalInstance {
  readonly shield: number;
  readonly name: string;
  readonly health: number;
  readonly maxHealth: number;
  readonly attack: number;
  readonly attackRange: number;
  readonly targetId: string | null;
  readonly normalAttacks: number;
}
export interface BattleResult {
  readonly winner: Team;
  readonly reason: 'elimination' | 'timeout';
  readonly tick: number;
  readonly elapsedMs: number;
}
export interface BattleSnapshot {
  readonly tick: number;
  readonly elapsedMs: number;
  readonly width: number;
  readonly height: number;
  readonly units: readonly UnitSnapshot[];
  readonly result: BattleResult | null;
  readonly traits?: readonly ActiveTrait[];
}
interface EventBase {
  readonly tick: number;
  readonly sequence: number;
}
export type BattleEvent = EventBase &
  (
    | { readonly type: 'battleStarted'; readonly seed: string }
    | {
        readonly type: 'traitActivated';
        readonly team: Team;
        readonly traitId: TraitId;
        readonly requiredUnits: number;
      }
    | {
        readonly type: 'unitMoved';
        readonly unitId: string;
        readonly from: Position;
        readonly to: Position;
      }
    | {
        readonly type: 'unitAttacked';
        readonly unitId: string;
        readonly targetId: string;
        readonly extra: boolean;
      }
    | {
        readonly type: 'damageDealt';
        readonly unitId: string;
        readonly targetId: string;
        readonly damage: number;
        readonly healthAfter: number;
      }
    | {
        readonly type: 'abilityTriggered';
        readonly unitId: string;
        readonly ability:
          AbilityDefinition['kind'] | SpecialAbilityDefinition['kind'];
      }
    | {
        readonly type: 'statusApplied';
        readonly unitId: string;
        readonly targetId: string;
        readonly status:
          | 'howl'
          | 'stunned'
          | 'slowed'
          | 'guarded'
          | 'vulnerable'
          | 'rallied'
          | 'evasive'
          | 'weakened'
          | 'silenced';
        readonly durationMs: number;
      }
    | {
        readonly type: 'attackDodged';
        readonly unitId: string;
        readonly targetId: string;
      }
    | {
        readonly type: 'healingDone';
        readonly unitId: string;
        readonly targetId: string;
        readonly amount: number;
        readonly healthAfter: number;
      }
    | { readonly type: 'unitDied'; readonly unitId: string }
    | {
        readonly type: 'traitProc';
        readonly unitId: string;
        readonly effect: 'shield' | 'retaliation' | 'heal';
        readonly amount: number;
      }
    | { readonly type: 'battleEnded'; readonly result: BattleResult }
  );
export type EventPayload = BattleEvent extends infer E
  ? E extends BattleEvent
    ? Omit<E, keyof EventBase>
    : never
  : never;
