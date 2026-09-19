import { clientCell } from '../game/projection';
import { BattleAudio } from '../game/bridge/BattleAudio';
import { runBattle } from '../run/Run';
import { ENCOUNTERS } from '../content/runBalance';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ANIMALS, abilityDescription } from '../content/animals';
import { STAR_MULTIPLIERS } from '../content/balance';
import { type OwnedAnimal } from '../run/Squad';
import { SandboxController } from '../game/bridge/SandboxController';
import { useSandbox, type Speed } from '../stores/sandbox';
import { Shop } from './Shop';
import { playerLevel } from '../run/Economy';
import { TIER_COSTS } from '../content/economy';
import { TRAITS } from '../content/traits';
import { TraitPanel } from './TraitPanel';
import { ANIMAL_ICONS, ANIMAL_ART } from '../game/animalVisuals';
import { HowToPlay, ONBOARDING_KEY } from './HowToPlay';
import { GameLogo } from './GameLogo';

const icons = ANIMAL_ICONS;
function AnimalInfo({ animal }: { animal: OwnedAnimal }) {
  const resolved = useSandbox((s) =>
    animal.location.kind === 'board'
      ? s.snapshot.units.find((u) => u.instanceId === animal.instanceId)
      : undefined,
  );
  const definition = ANIMALS.find((a) => a.id === animal.animalId)!;
  const multiplier = STAR_MULTIPLIERS[animal.starLevel];
  return (
    <>
      <img
        className="animal-icon"
        src={ANIMAL_ART[animal.animalId]}
        alt=""
        draggable={false}
      />
      <strong>{definition.name}</strong>
      <span className="stars">{'★'.repeat(animal.starLevel)}</span>
      <small>
        {resolved?.maxHealth ??
          Math.round(definition.baseStats.health * multiplier)}{' '}
        HP ·{' '}
        {resolved?.attack ??
          Math.round(definition.baseStats.attack * multiplier)}{' '}
        ATK
      </small>
    </>
  );
}
export function App() {
  const parent = useRef<HTMLDivElement>(null);
  const controller = useRef<SandboxController | null>(null);
  const audio = useRef<BattleAudio | null>(null);
  const dragCleanup = useRef<(() => void) | null>(null);
  const draggedClick = useRef(false);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [guideOpen, setGuideOpen] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) !== 'seen';
    } catch {
      return true;
    }
  });
  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, 'seen');
    } catch {
      // Private browsing can reject storage; the guide still closes normally.
    }
  }, []);
  useEffect(() => () => dragCleanup.current?.(), []);
  const state = useSandbox();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [seedDraft, setSeedDraft] = useState(state.seed);
  useEffect(() => setSeedDraft(state.seed), [state.seed]);
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    void import('../game/phaser/Game')
      .then(({ createGame }) => {
        if (cancelled) return;
        const current = useSandbox.getState();
        const runtime = new SandboxController(current.seed);
        controller.current = runtime;
        const sound = new BattleAudio();
        audio.current = sound;
        sound.setEnabled(current.soundEnabled);
        runtime.prepare(runBattle(current.squad, current.seed, current.run));
        const unsubscribe = runtime.subscribe((frame) => {
          useSandbox.getState().receiveFrame(frame);
          if (frame.reset) sound.silence();
          else sound.play(frame.events, useSandbox.getState().speed);
        });
        const unsubscribeSquad = useSandbox.subscribe((next, previous) => {
          if (
            next.status === 'ready' &&
            (next.squad !== previous.squad ||
              next.seed !== previous.seed ||
              next.run !== previous.run)
          )
            runtime.prepare(runBattle(next.squad, next.seed, next.run));
        });
        const game = createGame(
          parent.current!,
          runtime,
          () => useSandbox.getState(),
          {
            state: () => useSandbox.getState(),
            dragging: (id) => useSandbox.getState().setDragging(id),
            preview: (position) =>
              useSandbox.getState().setDropPreview(position),
            select: (id) => useSandbox.getState().select(id),
            move: (id, destination) =>
              useSandbox.getState().move(id, destination),
            dropOutside: (id, x, y) => {
              const target = document.elementFromPoint(x, y);
              if (target?.closest('[data-sell-zone]')) {
                useSandbox.getState().sell(id);
                return;
              }
              const slot = document
                .elementFromPoint(x, y)
                ?.closest('[data-bench-slot]')
                ?.getAttribute('data-bench-slot');
              if (slot !== null && slot !== undefined)
                useSandbox
                  .getState()
                  .move(id, { kind: 'bench', slot: Number(slot) });
            },
          },
        );
        const visibility = () => {
          runtime.setHidden(document.hidden);
          sound.setPaused(document.hidden || useSandbox.getState().paused);
        };
        const unsubscribeAudio = useSandbox.subscribe((next, previous) => {
          if (next.mergeVersion !== previous.mergeVersion && next.merges.length)
            sound.upgrade(
              Math.max(...next.merges.map((merge) => merge.starLevel)) as 2 | 3,
            );
          if (next.paused !== previous.paused)
            sound.setPaused(next.paused || document.hidden);
        });
        visibility();
        document.addEventListener('visibilitychange', visibility);
        setLoaded(true);
        cleanup = () => {
          document.removeEventListener('visibilitychange', visibility);
          unsubscribe();
          unsubscribeSquad();
          unsubscribeAudio();
          sound.dispose();
          audio.current = null;
          runtime.dispose();
          game.destroy(true);
          game.loop.wake();
          controller.current = null;
        };
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : 'Could not load the arena.',
          );
      });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [state.receiveFrame]);
  const beginBenchDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    if (useSandbox.getState().status !== 'ready' || event.button !== 0) return;
    event.preventDefault();
    dragCleanup.current?.();
    const start = { x: event.clientX, y: event.clientY };
    let active = false;
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
      useSandbox.getState().setDragging(null);
      setDragPoint(null);
      dragCleanup.current = null;
    };
    const move = (e: PointerEvent) => {
      if (!active && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6)
        return;
      active = true;
      useSandbox.getState().setDragging(id);
      const canvas = parent.current?.querySelector('canvas');
      useSandbox
        .getState()
        .setDropPreview(
          canvas
            ? clientCell(e.clientX, e.clientY, canvas.getBoundingClientRect())
            : null,
        );
      setDragPoint({ x: e.clientX, y: e.clientY });
    };
    const cancel = () => cleanup();
    const end = (e: PointerEvent) => {
      const current = useSandbox.getState();
      if (active) {
        draggedClick.current = true;
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target?.closest('[data-sell-zone]')) current.sell(id);
        else {
          const slot = target
            ?.closest('[data-bench-slot]')
            ?.getAttribute('data-bench-slot');
          if (slot !== null && slot !== undefined)
            current.move(id, { kind: 'bench', slot: Number(slot) });
          else if (target?.closest('.battlefield') && parent.current) {
            const rect = parent.current.getBoundingClientRect();
            const position = clientCell(e.clientX, e.clientY, rect);
            if (position) current.move(id, { kind: 'board', position });
          }
        }
      } else current.select(id);
      cleanup();
    };
    draggedClick.current = false;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    dragCleanup.current = cleanup;
  };
  const ready = state.status === 'ready';
  const level = playerLevel(state.economy.xp);
  const deployed = state.squad.animals.filter(
    (a) => a.location.kind === 'board',
  );
  const selected = state.squad.animals.find(
    (a) => a.instanceId === state.selectedId,
  );
  const result = state.snapshot.result;
  const speed = (value: Speed) => {
    state.setSpeed(value);
    controller.current?.resetClock();
  };
  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, button, summary, [contenteditable]')) return;
      if (event.key === '?') {
        event.preventDefault();
        setGuideOpen(true);
      }
      if (event.code === 'Space' && state.status === 'running') {
        event.preventDefault();
        state.setPaused(!state.paused);
        controller.current?.resetClock();
      }
    };
    document.addEventListener('keydown', shortcuts);
    return () => document.removeEventListener('keydown', shortcuts);
  }, [state]);
  const highestStar = Math.max(
    1,
    ...state.squad.animals.map((animal) => animal.starLevel),
  );
  return (
    <div
      className={`game-shell ${state.reducedMotion ? 'reduced-motion' : ''}`}
    >
      <HowToPlay open={guideOpen} onClose={closeGuide} />
      {dragPoint && state.draggingId && (
        <div
          className="animal-drag-ghost"
          style={{ left: dragPoint.x, top: dragPoint.y }}
        >
          <img
            src={
              ANIMAL_ART[
                state.squad.animals.find(
                  (a) => a.instanceId === state.draggingId,
                )!.animalId
              ]
            }
            alt=""
          />
        </div>
      )}
      <header className="game-header" inert={guideOpen ? true : undefined}>
        <GameLogo />
        <div className="mode">
          ROUND {state.run.round}/8 · {'♥'.repeat(state.run.lives)}
          {'♡'.repeat(3 - state.run.lives)}
        </div>
        <div className="header-actions">
          <button className="help-button" onClick={() => setGuideOpen(true)}>
            How to play ?
          </button>
          {import.meta.env.DEV && (
            <button
              className="help-button debug-button"
              onClick={() =>
                document
                  .querySelector('.sandbox-tools')
                  ?.toggleAttribute('open')
              }
            >
              Sandbox ⚙
            </button>
          )}
        </div>
      </header>
      <main className="game-main" inert={guideOpen ? true : undefined}>
        <section className="play-panel">
          <div className="arena-toolbar">
            <span className="phase">
              {ready
                ? '⚑ PREPARATION'
                : result
                  ? result.winner === 'player'
                    ? '🏆 VICTORY'
                    : 'DEFEAT'
                  : state.paused
                    ? 'Ⅱ PAUSED'
                    : '⚔ BATTLE'}
            </span>
            <span className="team-score">
              YOUR SQUAD{' '}
              <b>
                {deployed.length}/{level}
              </b>
              <span className="versus">VS</span>{' '}
              {ENCOUNTERS[state.run.round - 1].name.toUpperCase()}{' '}
              <b>{ENCOUNTERS[state.run.round - 1].count}</b>
            </span>
            <span className="timer">
              {(state.snapshot.elapsedMs / 1000).toFixed(1)}s
            </span>
          </div>
          <div className="command-bar">
            <button
              className="fight-button"
              disabled={!loaded || !ready || deployed.length === 0}
              onClick={() => controller.current?.start()}
            >
              ⚔ FIGHT!
            </button>
            <button
              disabled={
                !loaded ||
                state.status !== 'finished' ||
                state.run.phase !== 'result'
              }
              onClick={state.nextRound}
            >
              {state.run.round === 8
                ? 'Retry finale · +10 gold'
                : 'Next round · +10 gold'}
            </button>
            <button
              disabled={!loaded || state.status !== 'finished'}
              onClick={() => {
                state.setPaused(false);
                controller.current?.replay();
              }}
            >
              ↻ Replay
            </button>
            <button
              disabled={state.status !== 'running'}
              onClick={() => {
                state.setPaused(!state.paused);
                controller.current?.resetClock();
              }}
            >
              {state.paused ? '▶ Resume' : 'Ⅱ Pause'}
            </button>
            <button
              disabled={!loaded}
              aria-pressed={state.soundEnabled}
              onClick={() => {
                const enabled = !state.soundEnabled;
                state.setSoundEnabled(enabled);
                audio.current?.setEnabled(enabled);
              }}
            >
              {state.soundEnabled ? '♫ Sound on' : '♫ Sound off'}
            </button>
            <button
              aria-pressed={state.reducedMotion}
              onClick={() => state.setReducedMotion(!state.reducedMotion)}
            >
              Less motion
            </button>
            <div className="speed-buttons" aria-label="Battle speed">
              {([1, 2, 4] as const).map((v) => (
                <button
                  key={v}
                  aria-pressed={state.speed === v}
                  onClick={() => speed(v)}
                >
                  {v}×
                </button>
              ))}
            </div>
          </div>
          <div
            className="arena-wrap"
            onDragOver={(e) => {
              if (ready) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!ready) return;
              const id = e.dataTransfer.getData('text/plain');
              const rect = parent.current!.getBoundingClientRect();
              const position = clientCell(e.clientX, e.clientY, rect);
              if (position) state.move(id, { kind: 'board', position });
            }}
          >
            <div
              ref={parent}
              className="battlefield"
              role="img"
              aria-label="Interactive isometric eight by six battlefield"
              aria-describedby="battlefield-help"
            />
            <span id="battlefield-help" className="visually-hidden">
              Select an animal from Your Animals, then use its placement grid to
              position it without a pointer.
            </span>
            {!loaded && (
              <div className="loading">{error || 'Loading arena…'}</div>
            )}
          </div>
          <div className="bench-heading">
            <h2>
              BENCH{' '}
              <span>{state.squad.animals.length - deployed.length}/8</span>
            </h2>
            <span>3 matching animals → upgrade</span>
          </div>
          <div className="bench" aria-label="Animal bench">
            {Array.from({ length: 8 }, (_, slot) => {
              const animal = state.squad.animals.find(
                (a) => a.location.kind === 'bench' && a.location.slot === slot,
              );
              const upgraded =
                animal &&
                state.merges.some((m) => m.survivorId === animal.instanceId);
              return (
                <button
                  key={`${slot}-${upgraded ? state.mergeVersion : ''}`}
                  data-bench-slot={slot}
                  className={`bench-slot ${animal ? 'occupied' : ''} star-${animal?.starLevel ?? 0} ${state.selectedId === animal?.instanceId ? 'selected' : ''} ${upgraded ? 'upgraded upgraded-${animal?.starLevel}' : ''}`}
                  disabled={!ready}
                  onPointerDown={(e) => {
                    if (animal && ready) beginBenchDrag(e, animal.instanceId);
                  }}
                  aria-label={`Bench slot ${slot + 1}${animal ? `: ${animal.animalId}, ${animal.starLevel} stars` : ': empty'}`}
                  onDragEnd={() => state.setDragging(null)}
                  onDragStart={(e) => {
                    if (animal) {
                      state.setDragging(animal.instanceId);
                      e.dataTransfer.setData('text/plain', animal.instanceId);
                      state.select(animal.instanceId);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    state.move(e.dataTransfer.getData('text/plain'), {
                      kind: 'bench',
                      slot,
                    });
                  }}
                  onClick={(e) => {
                    if (e.detail > 0 && draggedClick.current) {
                      draggedClick.current = false;
                      return;
                    }
                    if (
                      state.selectedId &&
                      state.selectedId !== animal?.instanceId
                    )
                      state.move(state.selectedId, { kind: 'bench', slot });
                    else state.select(animal?.instanceId ?? null);
                  }}
                >
                  {animal ? (
                    <AnimalInfo animal={animal} />
                  ) : (
                    <>
                      <span className="empty-slot">+</span>
                      <small>{slot + 1}</small>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <Shop />
          <div className="game-message" role="status" aria-live="polite">
            {ready
              ? state.message
              : result
                ? `${result.winner === 'player' ? 'Your squad wins!' : 'Round lost. One life lost.'} +2 XP. Replays grant no rewards.`
                : 'Squad changes are locked during combat.'}
          </div>
        </section>
        <aside className="side-panel">
          <div className="run-progress">
            <h2>THE WILD RUN</h2>
            <p>
              {state.run.lives} lives · {state.run.attempts} battles fought
            </p>
            {ENCOUNTERS.map((encounter, i) => (
              <div
                key={encounter.name}
                className={i + 1 === state.run.round ? 'current-encounter' : ''}
              >
                {i + 1 < state.run.round
                  ? '✓'
                  : i + 1 === state.run.round
                    ? '➤'
                    : '·'}{' '}
                {i + 1}. {encounter.name}
              </div>
            ))}
            {(state.run.phase === 'won' || state.run.phase === 'lost') && (
              <div className="run-result" role="status">
                <h2>
                  {state.run.phase === 'won' ? '🏆 RUN COMPLETE!' : 'RUN OVER'}
                </h2>
                <p>
                  {state.run.phase === 'won'
                    ? 'You conquered the wild.'
                    : 'Your squad fought bravely. Try a different formation!'}
                </p>
                <div className="run-summary">
                  <span>
                    <b>{state.run.attempts}</b> battles
                  </span>
                  <span>
                    <b>{state.squad.animals.length}</b> animals
                  </span>
                  <span>
                    <b>{'★'.repeat(highestStar)}</b> best
                  </span>
                </div>
                <button
                  disabled={state.status === 'running'}
                  onClick={state.newRun}
                >
                  New run
                </button>
              </div>
            )}
          </div>
          <details className="combat-guide">
            <summary>Combat effects</summary>
            <dl>
              <div>
                <dt>Stunned</dt>
                <dd>Cannot move or attack.</dd>
              </div>
              <div>
                <dt>Chilled</dt>
                <dd>Slower attacks and movement.</dd>
              </div>
              <div>
                <dt>Vulnerable</dt>
                <dd>Takes increased damage.</dd>
              </div>
              <div>
                <dt>Weakened</dt>
                <dd>Deals reduced damage.</dd>
              </div>
              <div>
                <dt>Silenced</dt>
                <dd>Named special is suppressed.</dd>
              </div>
              <div>
                <dt>Guarded</dt>
                <dd>Has a temporary shield.</dd>
              </div>
              <div>
                <dt>Rallied</dt>
                <dd>Deals increased damage.</dd>
              </div>
              <div>
                <dt>Evasive</dt>
                <dd>Dodges the next hit.</dd>
              </div>
            </dl>
          </details>
          <TraitPanel />
          <h2>YOUR ANIMALS</h2>
          <div className="owned-list">
            {state.squad.animals.map((animal) => (
              <button
                className={`owned-card star-${animal.starLevel} ${state.selectedId === animal.instanceId ? 'selected' : ''}`}
                key={animal.instanceId}
                disabled={!ready}
                onClick={() => state.select(animal.instanceId)}
              >
                <AnimalInfo animal={animal} />
                <span className="location-label">
                  {animal.location.kind === 'board' ? 'DEPLOYED' : 'BENCH'}
                </span>
              </button>
            ))}
            {state.squad.animals.length === 0 && (
              <p>Your squad is empty. Add an animal below.</p>
            )}
          </div>
          {selected && (
            <div className="selection-info">
              <h3>
                {selected.animalId.toUpperCase()}{' '}
                {'★'.repeat(selected.starLevel)}
              </h3>
              <p>
                {ANIMALS.find((a) => a.id === selected.animalId)!
                  .traits.map((id) => TRAITS.find((t) => t.id === id)!.name)
                  .join(' · ') || 'No trait'}
                <br />
                {ANIMALS.find((a) => a.id === selected.animalId)!.role}
                <br />
                {abilityDescription(
                  ANIMALS.find((a) => a.id === selected.animalId)!,
                )}
                <br />
                Hold Tab to see tiles, or drag to place. Click a bench slot to
                place. Drag onto an animal to swap.
              </p>
              <button
                disabled={!ready}
                onClick={() => state.sell(selected.instanceId)}
              >
                Sell ·{' '}
                {
                  TIER_COSTS[
                    ANIMALS.find((a) => a.id === selected.animalId)!.tier
                  ]
                }{' '}
                gold
              </button>
              <div
                className="placement-picker"
                role="group"
                aria-label="Move selected animal to battlefield cell"
              >
                {Array.from({ length: 18 }, (_, index) => {
                  const position = {
                    x: 2 - Math.floor(index / 6),
                    y: index % 6,
                  };
                  const occupant = state.squad.animals.find(
                    (animal) =>
                      animal.location.kind === 'board' &&
                      animal.location.position.x === position.x &&
                      animal.location.position.y === position.y,
                  );
                  return (
                    <button
                      key={`${position.x}-${position.y}`}
                      className={
                        occupant?.instanceId === selected.instanceId
                          ? 'current'
                          : ''
                      }
                      disabled={!ready}
                      aria-label={`Column ${3 - position.x}, row ${position.y + 1}${occupant ? `, occupied by ${ANIMALS.find((a) => a.id === occupant.animalId)!.name}` : ', empty'}`}
                      title={`C${3 - position.x} · R${position.y + 1}${occupant ? ` · ${occupant.animalId}` : ''}`}
                      onClick={() =>
                        state.move(selected.instanceId, {
                          kind: 'board',
                          position,
                        })
                      }
                    >
                      {occupant
                        ? ANIMAL_ICONS[occupant.animalId]
                        : `${3 - position.x}.${position.y + 1}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {import.meta.env.DEV && (
            <details className="sandbox-tools">
              <summary>Sandbox tools</summary>
              <p>Debug: free copies for testing upgrades.</p>
              <div className="trait-presets">
                {TRAITS.map((trait) => (
                  <button
                    key={trait.id}
                    disabled={!ready}
                    onClick={() => state.demoTrait(trait.id)}
                  >
                    Load {trait.name} squad
                  </button>
                ))}
              </div>
              {ANIMALS.map((animal) => (
                <div className="spawn-row" key={animal.id}>
                  <span>
                    {icons[animal.id]} {animal.name}
                  </span>
                  <button
                    disabled={!ready}
                    onClick={() => state.add(animal.id, 1)}
                  >
                    +1
                  </button>
                  <button
                    disabled={!ready}
                    onClick={() => state.add(animal.id, 3)}
                  >
                    +3
                  </button>
                  <button
                    disabled={!ready}
                    onClick={() => state.add(animal.id, 9)}
                  >
                    +9
                  </button>
                </div>
              ))}
              <div className="reset-tools">
                <button disabled={!ready} onClick={() => state.resetSquad()}>
                  Reset encounter
                </button>
                <button
                  disabled={!ready}
                  onClick={() => state.resetSquad(true)}
                >
                  Clear squad
                </button>
              </div>
              {import.meta.env.DEV && (
                <div className="debug-tools">
                  <label>
                    Seed
                    <input
                      value={seedDraft}
                      disabled={!ready}
                      onChange={(e) => setSeedDraft(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={!ready}
                    onClick={() => state.setSeed(seedDraft)}
                  >
                    Apply seed & reset
                  </button>
                  <button disabled={!ready} onClick={state.addGold}>
                    +10 gold
                  </button>
                  <button
                    disabled={state.status !== 'running'}
                    onClick={() => {
                      state.setPaused(!state.paused);
                      controller.current?.resetClock();
                    }}
                  >
                    {state.paused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    disabled={!loaded || !!result || deployed.length === 0}
                    onClick={() => {
                      state.setPaused(true);
                      controller.current?.stepOneTick();
                    }}
                  >
                    Step tick
                  </button>
                  <button
                    aria-pressed={state.speed === 10}
                    onClick={() => speed(10)}
                  >
                    10×
                  </button>
                  <small>Tick {state.snapshot.tick}</small>
                </div>
              )}
            </details>
          )}
        </aside>
      </main>
    </div>
  );
}
