import { BATTLE_RULES } from '../../content/balance';
import { effectsForAnimal, resolvedStats, teamTraits } from '../traits/Traits';
import { damageForHit, grantsExtraAttack } from '../abilities/effects';
import { cellKey, distance, nextPathCell } from '../grid/pathfinding';
import { SeededRandom } from '../rng/SeededRandom';
import type {
  AnimalDefinition,
  AnimalInstance,
  BattleConfig,
  BattleEvent,
  BattleResult,
  BattleSnapshot,
  EventPayload,
  Position,
  Team,
  TraitEffect,
  ActiveTrait,
} from '../types';

interface RuntimeUnit {
  instance: AnimalInstance;
  definition: AnimalDefinition;
  position: Position;
  health: number;
  shield: number;
  targetId: string | null;
  normalAttacks: number;
  attackDueMs: number;
  moveDueMs: number;
  stunnedUntilMs: number;
  howlUntilMs: number;
  howlAttackSpeed: number;
  slowedUntilMs: number;
  slowAmount: number;
  vulnerableUntilMs: number;
  vulnerability: number;
  attackBuffUntilMs: number;
  attackBuffAmount: number;
  dodgeCharges: number;
  weakenedUntilMs: number;
  attackReduction: number;
  silencedUntilMs: number;
  traitEffects: readonly TraitEffect[];
}
const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export class Battle {
  private readonly units: RuntimeUnit[];
  private readonly rules: {
    width: number;
    height: number;
    tickMs: number;
    maxDurationMs: number;
  };
  private readonly rng: SeededRandom;
  private tick = 0;
  private sequence = 0;
  private events: BattleEvent[] = [];
  private terminalResult: BattleResult | null = null;
  private readonly activeTraits: readonly ActiveTrait[];

  constructor(config: BattleConfig) {
    this.rules = { ...BATTLE_RULES, ...config.rules };
    for (const value of Object.values(this.rules)) {
      if (!Number.isSafeInteger(value) || value <= 0)
        throw new Error('Battle rules must be positive integers.');
    }
    this.rng = new SeededRandom(config.seed);
    const traits = (config.traits ?? []).map((t) => ({
      ...t,
      thresholds: t.thresholds.map((threshold) => ({
        ...threshold,
        effects: threshold.effects.map((effect) => ({ ...effect })),
      })),
    }));
    const traitIds = new Set<string>();
    for (const trait of traits) {
      if (traitIds.has(trait.id))
        throw new Error('Duplicate trait definition.');
      traitIds.add(trait.id);
      const thresholds = new Set<number>();
      for (const threshold of trait.thresholds) {
        if (
          !Number.isInteger(threshold.requiredUnits) ||
          threshold.requiredUnits < 1 ||
          thresholds.has(threshold.requiredUnits)
        )
          throw new Error('Invalid trait threshold.');
        thresholds.add(threshold.requiredUnits);
        for (const effect of threshold.effects) {
          if (
            (effect.kind === 'startingShield' ||
              effect.kind === 'allyDeathHeal') &&
            (!Number.isFinite(effect.ratio) ||
              effect.ratio <= 0 ||
              effect.ratio > 1)
          )
            throw new Error('Invalid trait health ratio.');
          if (
            effect.kind === 'retaliation' &&
            (!Number.isSafeInteger(effect.damage) || effect.damage <= 0)
          )
            throw new Error('Invalid retaliation damage.');
          if (
            effect.kind === 'statBonus' &&
            (!Number.isFinite(effect.amount) || effect.amount < 0)
          )
            throw new Error('Invalid trait bonus.');
          if (
            effect.kind === 'damageBelowHealth' &&
            (!Number.isFinite(effect.ratio) ||
              effect.ratio <= 0 ||
              effect.ratio > 1 ||
              !Number.isFinite(effect.multiplier) ||
              effect.multiplier <= 0)
          )
            throw new Error('Invalid conditional damage bonus.');
        }
      }
    }
    const statuses = {
      player: teamTraits(config.units, config.animals, traits, 'player'),
      enemy: teamTraits(config.units, config.animals, traits, 'enemy'),
    };
    this.activeTraits = Object.freeze(
      (['player', 'enemy'] as const).flatMap((team) =>
        statuses[team].flatMap((status) =>
          status.active
            ? [
                Object.freeze({
                  team,
                  traitId: status.definition.id,
                  count: status.count,
                  requiredUnits: status.active.requiredUnits,
                }),
              ]
            : [],
        ),
      ),
    );
    const definitions = new Map<string, AnimalDefinition>();
    for (const animal of config.animals) {
      if (definitions.has(animal.id))
        throw new Error('Duplicate animal definition.');
      const stats = animal.baseStats;
      if (
        Object.values(stats).some(
          (value) => !Number.isSafeInteger(value) || value <= 0,
        )
      )
        throw new Error('Animal stats must be positive integers.');
      if (
        stats.attackIntervalMs < this.rules.tickMs ||
        stats.moveIntervalMs < this.rules.tickMs
      )
        throw new Error('Intervals must be at least one tick.');
      if (
        animal.ability?.kind === 'extraAttack' &&
        (!Number.isSafeInteger(animal.ability.every) ||
          animal.ability.every < 1)
      )
        throw new Error('Extra attack cadence must be positive.');
      if (
        animal.ability?.kind === 'executeDamage' &&
        (!Number.isFinite(animal.ability.multiplier) ||
          animal.ability.multiplier <= 0 ||
          !Number.isFinite(animal.ability.belowHealthRatio) ||
          animal.ability.belowHealthRatio <= 0 ||
          animal.ability.belowHealthRatio > 1)
      )
        throw new Error('Invalid damage ability.');
      const special = animal.specialAbility;
      if (
        special &&
        (!Number.isSafeInteger(special.every) || special.every < 1)
      )
        throw new Error('Invalid special cadence.');
      if (
        special?.kind === 'bearHug' &&
        (!Number.isSafeInteger(special.stunMs) ||
          special.stunMs < this.rules.tickMs)
      )
        throw new Error('Invalid stun duration.');
      if (
        special?.kind === 'howl' &&
        (!Number.isFinite(special.attackSpeed) ||
          special.attackSpeed <= 0 ||
          !Number.isSafeInteger(special.durationMs) ||
          special.durationMs < this.rules.tickMs ||
          !Number.isSafeInteger(special.radius) ||
          special.radius < 0)
      )
        throw new Error('Invalid howl ability.');
      if (
        special?.kind === 'loyalGuard' &&
        (!Number.isFinite(special.shieldRatio) ||
          special.shieldRatio <= 0 ||
          special.shieldRatio > 1)
      )
        throw new Error('Invalid guard ability.');
      if (
        special?.kind === 'pounce' &&
        (!Number.isFinite(special.bonusDamage) || special.bonusDamage <= 0)
      )
        throw new Error('Invalid pounce ability.');
      if (
        special?.kind === 'chill' &&
        (!Number.isFinite(special.slow) ||
          special.slow <= 0 ||
          special.slow > 1 ||
          !Number.isSafeInteger(special.durationMs) ||
          special.durationMs < this.rules.tickMs)
      )
        throw new Error('Invalid chill ability.');
      if (
        special?.kind === 'groundSlam' &&
        (!Number.isSafeInteger(special.stunMs) ||
          special.stunMs < this.rules.tickMs ||
          !Number.isSafeInteger(special.radius) ||
          special.radius < 1)
      )
        throw new Error('Invalid ground slam ability.');
      if (
        special?.kind === 'cackle' &&
        (!Number.isFinite(special.vulnerability) ||
          special.vulnerability <= 0 ||
          special.vulnerability > 1 ||
          !Number.isSafeInteger(special.durationMs) ||
          special.durationMs < this.rules.tickMs)
      )
        throw new Error('Invalid cackle ability.');
      if (
        special?.kind === 'skyDive' &&
        (!Number.isFinite(special.maxHealthDamageRatio) ||
          special.maxHealthDamageRatio <= 0 ||
          special.maxHealthDamageRatio > 1)
      )
        throw new Error('Invalid sky dive ability.');
      if (
        special?.kind === 'bananaAid' &&
        (!Number.isFinite(special.healRatio) ||
          special.healRatio <= 0 ||
          special.healRatio > 1)
      )
        throw new Error('Invalid healing ability.');
      if (
        special?.kind === 'battleCry' &&
        (!Number.isFinite(special.attackBonus) ||
          special.attackBonus <= 0 ||
          special.attackBonus > 1 ||
          !Number.isSafeInteger(special.durationMs) ||
          special.durationMs < this.rules.tickMs ||
          !Number.isSafeInteger(special.radius) ||
          special.radius < 0)
      )
        throw new Error('Invalid battle cry ability.');
      if (
        special?.kind === 'cripplingBite' &&
        (!Number.isFinite(special.attackReduction) ||
          special.attackReduction <= 0 ||
          special.attackReduction >= 1 ||
          !Number.isSafeInteger(special.durationMs) ||
          special.durationMs < this.rules.tickMs)
      )
        throw new Error('Invalid crippling bite ability.');
      if (
        special?.kind === 'squawk' &&
        (!Number.isSafeInteger(special.durationMs) ||
          special.durationMs < this.rules.tickMs)
      )
        throw new Error('Invalid squawk ability.');
      if (
        (special?.kind === 'chainStrike' || special?.kind === 'stoneSplash') &&
        (!Number.isFinite(special.damageRatio) ||
          special.damageRatio <= 0 ||
          special.damageRatio > 1)
      )
        throw new Error('Invalid area damage ability.');
      if (
        special?.kind === 'stoneSplash' &&
        (!Number.isSafeInteger(special.radius) || special.radius < 1)
      )
        throw new Error('Invalid splash radius.');
      definitions.set(animal.id, {
        ...animal,
        traits: [...animal.traits],
        baseStats: { ...stats },
        ability: animal.ability ? { ...animal.ability } : undefined,
        specialAbility: animal.specialAbility
          ? { ...animal.specialAbility }
          : undefined,
      });
    }
    const ids = new Set<string>();
    const occupied = new Set<string>();
    this.units = config.units
      .map((instance) => {
        const definition = definitions.get(instance.animalId);
        if (!definition) throw new Error('Unknown animal definition.');
        const { x, y } = instance.position;
        if (
          !Number.isInteger(x) ||
          !Number.isInteger(y) ||
          x < 0 ||
          y < 0 ||
          x >= this.rules.width ||
          y >= this.rules.height
        )
          throw new Error('Unit outside battlefield.');
        if (
          !instance.instanceId ||
          ids.has(instance.instanceId) ||
          occupied.has(cellKey(instance.position))
        )
          throw new Error('Duplicate instance or occupied cell.');
        if (![1, 2, 3].includes(instance.starLevel))
          throw new Error('Invalid star level.');
        if (instance.team !== 'player' && instance.team !== 'enemy')
          throw new Error('Invalid team.');
        const traitEffects = effectsForAnimal(
          definition,
          statuses[instance.team],
        );
        const scaledDefinition = {
          ...definition,
          baseStats: resolvedStats(
            definition,
            instance.starLevel,
            traitEffects,
            this.rules.tickMs,
          ),
        };
        if (instance.team !== 'player' && instance.team !== 'enemy')
          throw new Error('Invalid team.');
        ids.add(instance.instanceId);
        occupied.add(cellKey(instance.position));
        return {
          instance: { ...instance, position: { x, y } },
          definition: scaledDefinition,
          position: { x, y },
          health: scaledDefinition.baseStats.health,
          shield: traitEffects.reduce(
            (sum, effect) =>
              sum +
              (effect.kind === 'startingShield'
                ? Math.round(scaledDefinition.baseStats.health * effect.ratio)
                : 0),
            0,
          ),
          targetId: null,
          normalAttacks: 0,
          attackDueMs: 0,
          moveDueMs: scaledDefinition.baseStats.moveIntervalMs,
          stunnedUntilMs: 0,
          howlUntilMs: 0,
          howlAttackSpeed: 0,
          slowedUntilMs: 0,
          slowAmount: 0,
          vulnerableUntilMs: 0,
          vulnerability: 0,
          attackBuffUntilMs: 0,
          attackBuffAmount: 0,
          dodgeCharges: 0,
          weakenedUntilMs: 0,
          attackReduction: 0,
          silencedUntilMs: 0,
          traitEffects,
        };
      })
      .sort((a, b) => compareIds(a.instance.instanceId, b.instance.instanceId));
    if (
      !this.units.some((u) => u.instance.team === 'player') ||
      !this.units.some((u) => u.instance.team === 'enemy')
    )
      throw new Error('Both teams require at least one unit.');
    this.emit({ type: 'battleStarted', seed: config.seed });
    for (const trait of this.activeTraits)
      this.emit({
        type: 'traitActivated',
        team: trait.team,
        traitId: trait.traitId,
        requiredUnits: trait.requiredUnits,
      });
    for (const unit of this.units)
      if (unit.shield > 0)
        this.emit({
          type: 'traitProc',
          unitId: unit.instance.instanceId,
          effect: 'shield',
          amount: unit.shield,
        });
  }

  get result(): BattleResult | null {
    return this.terminalResult;
  }
  isFinished(): boolean {
    return this.terminalResult !== null;
  }
  get snapshot(): BattleSnapshot {
    return Object.freeze({
      tick: this.tick,
      elapsedMs: this.tick * this.rules.tickMs,
      width: this.rules.width,
      height: this.rules.height,
      units: Object.freeze(
        this.units.map((unit) =>
          Object.freeze({
            ...unit.instance,
            position: Object.freeze({ ...unit.position }),
            name: unit.definition.name,
            health: unit.health,
            shield: unit.shield,
            maxHealth: unit.definition.baseStats.health,
            attack: unit.definition.baseStats.attack,
            attackRange: unit.definition.baseStats.attackRange,
            targetId: unit.targetId,
            normalAttacks: unit.normalAttacks,
          }),
        ),
      ),
      result: this.result,
      traits: this.activeTraits,
    });
  }
  drainEvents(): readonly BattleEvent[] {
    const drained = Object.freeze(this.events);
    this.events = [];
    return drained;
  }
  private emit(payload: EventPayload) {
    this.events.push(
      Object.freeze({
        ...payload,
        tick: this.tick,
        sequence: this.sequence++,
      }) as BattleEvent,
    );
  }
  private targetFor(unit: RuntimeUnit): RuntimeUnit | undefined {
    const current = this.units.find(
      (other) =>
        other.instance.instanceId === unit.targetId &&
        other.health > 0 &&
        other.instance.team !== unit.instance.team,
    );
    if (current) return current;
    const target = this.units
      .filter(
        (other) =>
          other.health > 0 && other.instance.team !== unit.instance.team,
      )
      .sort(
        (a, b) =>
          distance(unit.position, a.position) -
            distance(unit.position, b.position) ||
          a.health - b.health ||
          compareIds(a.instance.instanceId, b.instance.instanceId),
      )[0];
    unit.targetId = target?.instance.instanceId ?? null;
    return target;
  }
  step(): void {
    if (this.isFinished()) return;
    this.tick++;
    const now = this.tick * this.rules.tickMs;
    const moved = new Set<string>();
    const movementOrder = this.units
      .filter((u) => u.health > 0 && u.stunnedUntilMs <= now)
      .sort(
        (a, b) =>
          a.moveDueMs - b.moveDueMs ||
          compareIds(a.instance.instanceId, b.instance.instanceId),
      );
    for (const unit of movementOrder) {
      const target = this.targetFor(unit);
      if (
        !target ||
        distance(unit.position, target.position) <=
          unit.definition.baseStats.attackRange ||
        now < unit.moveDueMs
      )
        continue;
      const occupied = new Set(
        this.units
          .filter((u) => u.health > 0 && u !== unit)
          .map((u) => cellKey(u.position)),
      );
      const to = nextPathCell(
        unit.position,
        target.position,
        unit.definition.baseStats.attackRange,
        this.rules.width,
        this.rules.height,
        occupied,
      );
      unit.moveDueMs = now + this.moveInterval(unit, now);
      if (!to) continue;
      const from = Object.freeze({ ...unit.position });
      unit.position = to;
      moved.add(unit.instance.instanceId);
      this.emit({
        type: 'unitMoved',
        unitId: unit.instance.instanceId,
        from,
        to: Object.freeze({ ...to }),
      });
    }
    const attackOrder = this.units
      .filter(
        (u) =>
          u.health > 0 &&
          u.stunnedUntilMs <= now &&
          !moved.has(u.instance.instanceId) &&
          u.attackDueMs <= now,
      )
      .sort(
        (a, b) =>
          a.attackDueMs - b.attackDueMs ||
          compareIds(a.instance.instanceId, b.instance.instanceId),
      );
    for (const unit of attackOrder) {
      if (unit.health <= 0 || unit.stunnedUntilMs > now) continue;
      const target = this.targetFor(unit);
      if (
        !target ||
        distance(unit.position, target.position) >
          unit.definition.baseStats.attackRange
      )
        continue;
      unit.attackDueMs = now + this.attackInterval(unit, now);
      unit.normalAttacks++;
      this.hit(unit, target, false);
      if (this.isFinished()) return;
      if (unit.health > 0 && unit.silencedUntilMs <= now)
        this.triggerSpecial(unit, target, now);
      if (this.isFinished()) return;
      if (
        unit.health > 0 &&
        grantsExtraAttack(unit.definition.ability, unit.normalAttacks)
      ) {
        this.emit({
          type: 'abilityTriggered',
          unitId: unit.instance.instanceId,
          ability: 'extraAttack',
        });
        if (target.health > 0) this.hit(unit, target, true);
        if (this.isFinished()) return;
      }
    }
    if (now >= this.rules.maxDurationMs)
      this.finish(this.timeoutWinner(), 'timeout');
  }
  private attackInterval(unit: RuntimeUnit, now: number) {
    const boost = unit.howlUntilMs > now ? unit.howlAttackSpeed : 0;
    const slow = unit.slowedUntilMs > now ? unit.slowAmount : 0;
    return Math.max(
      this.rules.tickMs,
      Math.round(
        (unit.definition.baseStats.attackIntervalMs * (1 + slow)) / (1 + boost),
      ),
    );
  }
  private moveInterval(unit: RuntimeUnit, now: number) {
    const slow = unit.slowedUntilMs > now ? unit.slowAmount : 0;
    return Math.max(
      this.rules.tickMs,
      Math.round(unit.definition.baseStats.moveIntervalMs * (1 + slow)),
    );
  }
  private triggerSpecial(unit: RuntimeUnit, target: RuntimeUnit, now: number) {
    const ability = unit.definition.specialAbility;
    if (
      !ability ||
      target.health <= 0 ||
      unit.normalAttacks % ability.every !== 0
    )
      return;
    this.emit({
      type: 'abilityTriggered',
      unitId: unit.instance.instanceId,
      ability: ability.kind,
    });
    if (ability.kind === 'bearHug') {
      target.stunnedUntilMs = Math.max(
        target.stunnedUntilMs,
        now + ability.stunMs,
      );
      this.emit({
        type: 'statusApplied',
        unitId: unit.instance.instanceId,
        targetId: target.instance.instanceId,
        status: 'stunned',
        durationMs: ability.stunMs,
      });
      return;
    }
    if (ability.kind === 'loyalGuard') {
      const ally = this.units
        .filter(
          (candidate) =>
            candidate.health > 0 &&
            candidate.instance.team === unit.instance.team,
        )
        .sort(
          (a, b) =>
            a.health / a.definition.baseStats.health -
              b.health / b.definition.baseStats.health ||
            compareIds(a.instance.instanceId, b.instance.instanceId),
        )[0];
      if (!ally) return;
      const amount = Math.round(
        ally.definition.baseStats.health * ability.shieldRatio,
      );
      ally.shield = Math.min(
        Math.round(ally.definition.baseStats.health * 0.5),
        ally.shield + amount,
      );
      this.emit({
        type: 'statusApplied',
        unitId: unit.instance.instanceId,
        targetId: ally.instance.instanceId,
        status: 'guarded',
        durationMs: 0,
      });
      return;
    }
    if (ability.kind === 'pounce') {
      this.applyDamage(
        unit,
        target,
        Math.round(unit.definition.baseStats.attack * ability.bonusDamage),
      );
      return;
    }
    if (ability.kind === 'chill') {
      target.slowedUntilMs = Math.max(
        target.slowedUntilMs,
        now + ability.durationMs,
      );
      target.slowAmount = Math.max(target.slowAmount, ability.slow);
      this.emit({
        type: 'statusApplied',
        unitId: unit.instance.instanceId,
        targetId: target.instance.instanceId,
        status: 'slowed',
        durationMs: ability.durationMs,
      });
      return;
    }
    if (ability.kind === 'groundSlam') {
      for (const enemy of this.units) {
        if (
          enemy.health <= 0 ||
          enemy.instance.team === unit.instance.team ||
          distance(unit.position, enemy.position) > ability.radius
        )
          continue;
        enemy.stunnedUntilMs = Math.max(
          enemy.stunnedUntilMs,
          now + ability.stunMs,
        );
        this.emit({
          type: 'statusApplied',
          unitId: unit.instance.instanceId,
          targetId: enemy.instance.instanceId,
          status: 'stunned',
          durationMs: ability.stunMs,
        });
      }
      return;
    }
    if (ability.kind === 'cackle') {
      target.vulnerableUntilMs = Math.max(
        target.vulnerableUntilMs,
        now + ability.durationMs,
      );
      target.vulnerability = Math.max(
        target.vulnerability,
        ability.vulnerability,
      );
      this.emit({
        type: 'statusApplied',
        unitId: unit.instance.instanceId,
        targetId: target.instance.instanceId,
        status: 'vulnerable',
        durationMs: ability.durationMs,
      });
      return;
    }
    if (ability.kind === 'skyDive') {
      this.applyDamage(
        unit,
        target,
        this.modifiedDamage(
          unit,
          target,
          Math.round(
            target.definition.baseStats.health * ability.maxHealthDamageRatio,
          ),
          now,
        ),
      );
      return;
    }
    if (ability.kind === 'bananaAid') {
      const ally = this.units
        .filter(
          (candidate) =>
            candidate.health > 0 &&
            candidate.health < candidate.definition.baseStats.health &&
            candidate.instance.team === unit.instance.team,
        )
        .sort(
          (a, b) =>
            a.health / a.definition.baseStats.health -
              b.health / b.definition.baseStats.health ||
            compareIds(a.instance.instanceId, b.instance.instanceId),
        )[0];
      if (!ally) return;
      const amount = Math.min(
        ally.definition.baseStats.health - ally.health,
        Math.round(ally.definition.baseStats.health * ability.healRatio),
      );
      ally.health += amount;
      this.emit({
        type: 'healingDone',
        unitId: unit.instance.instanceId,
        targetId: ally.instance.instanceId,
        amount,
        healthAfter: ally.health,
      });
      return;
    }
    if (ability.kind === 'battleCry') {
      for (const ally of this.units) {
        if (
          ally.health <= 0 ||
          ally.instance.team !== unit.instance.team ||
          distance(unit.position, ally.position) > ability.radius
        )
          continue;
        ally.attackBuffUntilMs = Math.max(
          ally.attackBuffUntilMs,
          now + ability.durationMs,
        );
        ally.attackBuffAmount = Math.max(
          ally.attackBuffAmount,
          ability.attackBonus,
        );
        this.emit({
          type: 'statusApplied',
          unitId: unit.instance.instanceId,
          targetId: ally.instance.instanceId,
          status: 'rallied',
          durationMs: ability.durationMs,
        });
      }
      return;
    }
    if (ability.kind === 'featherGuard') {
      unit.dodgeCharges = 1;
      this.emit({
        type: 'statusApplied',
        unitId: unit.instance.instanceId,
        targetId: unit.instance.instanceId,
        status: 'evasive',
        durationMs: 0,
      });
      return;
    }
    if (ability.kind === 'cripplingBite') {
      target.weakenedUntilMs = Math.max(
        target.weakenedUntilMs,
        now + ability.durationMs,
      );
      target.attackReduction = Math.max(
        target.attackReduction,
        ability.attackReduction,
      );
      this.emit({
        type: 'statusApplied',
        unitId: unit.instance.instanceId,
        targetId: target.instance.instanceId,
        status: 'weakened',
        durationMs: ability.durationMs,
      });
      return;
    }
    if (ability.kind === 'squawk') {
      target.silencedUntilMs = Math.max(
        target.silencedUntilMs,
        now + ability.durationMs,
      );
      this.emit({
        type: 'statusApplied',
        unitId: unit.instance.instanceId,
        targetId: target.instance.instanceId,
        status: 'silenced',
        durationMs: ability.durationMs,
      });
      return;
    }
    if (ability.kind === 'chainStrike') {
      const secondary = this.units
        .filter(
          (enemy) =>
            enemy.health > 0 &&
            enemy.instance.team !== unit.instance.team &&
            enemy !== target,
        )
        .sort(
          (a, b) =>
            distance(target.position, a.position) -
              distance(target.position, b.position) ||
            a.health - b.health ||
            compareIds(a.instance.instanceId, b.instance.instanceId),
        )[0];
      if (secondary)
        this.applyDamage(
          unit,
          secondary,
          this.modifiedDamage(
            unit,
            secondary,
            Math.round(unit.definition.baseStats.attack * ability.damageRatio),
            now,
          ),
        );
      return;
    }
    if (ability.kind === 'stoneSplash') {
      for (const enemy of this.units) {
        if (
          enemy.health <= 0 ||
          enemy.instance.team === unit.instance.team ||
          enemy === target ||
          distance(target.position, enemy.position) > ability.radius
        )
          continue;
        this.applyDamage(
          unit,
          enemy,
          this.modifiedDamage(
            unit,
            enemy,
            Math.round(unit.definition.baseStats.attack * ability.damageRatio),
            now,
          ),
        );
        if (this.isFinished()) return;
      }
      return;
    }
    for (const ally of this.units) {
      if (
        ally.health <= 0 ||
        ally.instance.team !== unit.instance.team ||
        ally.definition.id !== 'wolf' ||
        distance(unit.position, ally.position) > ability.radius
      )
        continue;
      ally.howlUntilMs = Math.max(ally.howlUntilMs, now + ability.durationMs);
      ally.howlAttackSpeed = Math.max(
        ally.howlAttackSpeed,
        ability.attackSpeed,
      );
      ally.attackDueMs = Math.min(
        ally.attackDueMs,
        now +
          Math.max(
            this.rules.tickMs,
            Math.round(
              ally.definition.baseStats.attackIntervalMs /
                (1 + ability.attackSpeed),
            ),
          ),
      );
      this.emit({
        type: 'statusApplied',
        unitId: unit.instance.instanceId,
        targetId: ally.instance.instanceId,
        status: 'howl',
        durationMs: ability.durationMs,
      });
    }
  }
  private hit(unit: RuntimeUnit, target: RuntimeUnit, extra: boolean) {
    this.emit({
      type: 'unitAttacked',
      unitId: unit.instance.instanceId,
      targetId: target.instance.instanceId,
      extra,
    });
    const hit = damageForHit(
      unit.definition.baseStats.attack,
      unit.definition.ability,
      target.health,
      target.definition.baseStats.health,
      unit.traitEffects,
    );
    if (hit.triggered)
      this.emit({
        type: 'abilityTriggered',
        unitId: unit.instance.instanceId,
        ability: 'executeDamage',
      });
    this.applyDamage(
      unit,
      target,
      this.modifiedDamage(
        unit,
        target,
        hit.damage,
        this.tick * this.rules.tickMs,
      ),
    );
    if (this.isFinished() || target.health <= 0 || unit.health <= 0) return;
    const retaliation = target.traitEffects.reduce(
      (sum, effect) =>
        sum + (effect.kind === 'retaliation' ? effect.damage : 0),
      0,
    );
    if (retaliation > 0) {
      this.emit({
        type: 'traitProc',
        unitId: target.instance.instanceId,
        effect: 'retaliation',
        amount: retaliation,
      });
      this.applyDamage(target, unit, retaliation);
    }
  }
  private modifiedDamage(
    attacker: RuntimeUnit,
    target: RuntimeUnit,
    damage: number,
    now: number,
  ) {
    const attackBonus =
      attacker.attackBuffUntilMs > now ? attacker.attackBuffAmount : 0;
    const attackReduction =
      attacker.weakenedUntilMs > now ? attacker.attackReduction : 0;
    const vulnerability =
      target.vulnerableUntilMs > now ? target.vulnerability : 0;
    return Math.round(
      damage * (1 + attackBonus) * (1 - attackReduction) * (1 + vulnerability),
    );
  }
  private applyDamage(unit: RuntimeUnit, target: RuntimeUnit, damage: number) {
    if (damage > 0 && target.dodgeCharges > 0) {
      target.dodgeCharges--;
      this.emit({
        type: 'attackDodged',
        unitId: unit.instance.instanceId,
        targetId: target.instance.instanceId,
      });
      this.emit({
        type: 'damageDealt',
        unitId: unit.instance.instanceId,
        targetId: target.instance.instanceId,
        damage: 0,
        healthAfter: target.health,
      });
      return;
    }
    const absorbed = Math.min(target.shield, damage);
    target.shield -= absorbed;
    target.health = Math.max(0, target.health - (damage - absorbed));
    this.emit({
      type: 'damageDealt',
      unitId: unit.instance.instanceId,
      targetId: target.instance.instanceId,
      damage: damage - absorbed,
      healthAfter: target.health,
    });
    if (target.health === 0) {
      target.targetId = null;
      this.emit({ type: 'unitDied', unitId: target.instance.instanceId });
      for (const ally of this.units) {
        if (ally.health <= 0 || ally.instance.team !== target.instance.team)
          continue;
        const ratio = ally.traitEffects.reduce(
          (sum, effect) =>
            sum + (effect.kind === 'allyDeathHeal' ? effect.ratio : 0),
          0,
        );
        const healing = Math.min(
          ally.definition.baseStats.health - ally.health,
          Math.round(ally.definition.baseStats.health * ratio),
        );
        if (healing > 0) {
          ally.health += healing;
          this.emit({
            type: 'traitProc',
            unitId: ally.instance.instanceId,
            effect: 'heal',
            amount: healing,
          });
        }
      }
      if (
        !this.units.some(
          (u) => u.health > 0 && u.instance.team === target.instance.team,
        )
      )
        this.finish(unit.instance.team, 'elimination');
    }
  }
  private timeoutWinner(): Team {
    const score = (team: Team) => {
      const units = this.units.filter((u) => u.instance.team === team);
      return {
        ratio:
          units.reduce((sum, u) => sum + u.health, 0) /
          units.reduce((sum, u) => sum + u.definition.baseStats.health, 0),
        alive: units.filter((u) => u.health > 0).length,
      };
    };
    const player = score('player');
    const enemy = score('enemy');
    if (player.ratio !== enemy.ratio)
      return player.ratio > enemy.ratio ? 'player' : 'enemy';
    if (player.alive !== enemy.alive)
      return player.alive > enemy.alive ? 'player' : 'enemy';
    return this.rng.next() < 0.5 ? 'player' : 'enemy';
  }
  private finish(winner: Team, reason: BattleResult['reason']) {
    this.terminalResult = Object.freeze({
      winner,
      reason,
      tick: this.tick,
      elapsedMs: this.tick * this.rules.tickMs,
    });
    this.emit({ type: 'battleEnded', result: this.terminalResult });
  }
}
