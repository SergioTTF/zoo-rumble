import { sandboxEncounter } from '../../content/encounter';
import { BATTLE_RULES } from '../../content/balance';
import {
  teamTraits,
  effectsForAnimal,
  resolvedStats,
} from '../../simulation/traits/Traits';
import { Battle } from '../../simulation/battle/Battle';
import type {
  BattleConfig,
  BattleEvent,
  BattleSnapshot,
} from '../../simulation/types';

export type SandboxStatus = 'ready' | 'running' | 'finished';
export interface PresentationFrame {
  readonly snapshot: BattleSnapshot;
  readonly events: readonly BattleEvent[];
  readonly status: SandboxStatus;
  readonly reset: boolean;
}
export class SandboxController {
  private battle: Battle | null = null;
  private config: BattleConfig;
  private status: SandboxStatus = 'ready';
  private accumulatedMs = 0;
  private hidden = false;
  private listeners = new Set<(frame: PresentationFrame) => void>();
  constructor(private seed: string) {
    this.config = sandboxEncounter(seed);
    this.battle = new Battle(this.config);
  }
  private get snapshot(): BattleSnapshot {
    if (this.battle) return this.battle.snapshot;
    return {
      tick: 0,
      elapsedMs: 0,
      width: this.config.rules?.width ?? BATTLE_RULES.width,
      height: this.config.rules?.height ?? BATTLE_RULES.height,
      result: null,
      units: this.config.units.map((u) => {
        const a = this.config.animals.find((a) => a.id === u.animalId)!;
        const statuses = teamTraits(
          this.config.units,
          this.config.animals,
          this.config.traits ?? [],
          u.team,
        );
        const stats = resolvedStats(
          a,
          u.starLevel,
          effectsForAnimal(a, statuses),
          BATTLE_RULES.tickMs,
        );
        const health = stats.health;
        return {
          ...u,
          name: a.name,
          health,
          shield: effectsForAnimal(a, statuses).reduce(
            (sum, effect) =>
              sum +
              (effect.kind === 'startingShield'
                ? Math.round(health * effect.ratio)
                : 0),
            0,
          ),
          maxHealth: health,
          attack: stats.attack,
          attackRange: a.baseStats.attackRange,
          targetId: null,
          normalAttacks: 0,
        };
      }),
    };
  }
  subscribe(listener: (frame: PresentationFrame) => void): () => void {
    this.listeners.add(listener);
    listener({
      snapshot: this.snapshot,
      events: [],
      status: this.status,
      reset: true,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }
  prepare(config: BattleConfig): void {
    this.config = config;
    this.seed = config.seed;
    this.battle = config.units.some((u) => u.team === 'player')
      ? new Battle(config)
      : null;
    this.status = 'ready';
    this.accumulatedMs = 0;
    this.publish(true);
  }
  start(): void {
    if (this.status !== 'ready' || !this.battle) return;
    this.status = 'running';
    this.publish(false);
  }
  restart(seed = this.seed): void {
    this.prepare({ ...this.config, seed });
  }
  replay(): void {
    this.restart();
    this.start();
  }
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.accumulatedMs = 0;
  }
  resetClock(): void {
    this.accumulatedMs = 0;
  }
  advance(deltaMs: number, speed: number, paused: boolean): void {
    if (this.hidden || paused || this.status !== 'running' || !this.battle) {
      this.accumulatedMs = 0;
      return;
    }
    this.accumulatedMs += Math.min(Math.max(deltaMs, 0), 250) * speed;
    let changed = false;
    while (
      this.accumulatedMs >= BATTLE_RULES.tickMs &&
      !this.battle.isFinished()
    ) {
      this.accumulatedMs -= BATTLE_RULES.tickMs;
      this.battle.step();
      changed = true;
    }
    if (changed) this.publish(false);
  }
  stepOneTick(): void {
    if (this.hidden || !this.battle || this.battle.isFinished()) return;
    this.status = 'running';
    this.accumulatedMs = 0;
    this.battle.step();
    this.publish(false);
  }
  private publish(reset: boolean): void {
    if (this.battle?.isFinished()) this.status = 'finished';
    const frame = {
      snapshot: this.snapshot,
      events: reset ? [] : (this.battle?.drainEvents() ?? []),
      status: this.status,
      reset,
    };
    for (const listener of this.listeners) listener(frame);
  }
  dispose(): void {
    this.listeners.clear();
  }
}
