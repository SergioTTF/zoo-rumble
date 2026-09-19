import { TRAITS } from '../../content/traits';
import { BATTLE_RULES, SQUAD_RULES } from '../../content/balance';
import Phaser from 'phaser';
import { placeLabels, placeFloatingLabel } from '../readability';
import type {
  PresentationFrame,
  SandboxController,
} from '../bridge/SandboxController';
import type { Position, UnitSnapshot } from '../../simulation/types';
import type { Location, Merge } from '../../run/Squad';
import {
  directionalFrame,
  facingFor,
  type Facing,
  type Pose,
} from '../directionalAnimation';
import {
  ANIMAL_LAYOUT,
  ANIMAL_POSE_TIMINGS,
  ANIMAL_SHEETS,
} from '../animalVisuals';
import {
  ARENA_SIZE,
  cellAt,
  project,
  tileCorners,
  unitDepth,
} from '../projection';

export interface DeploymentInteractions {
  state: () => {
    selectedId: string | null;
    status: string;
    merges: readonly Merge[];
    mergeVersion: number;
    reducedMotion?: boolean;
    dropPreview?: Position | null;
    draggingId?: string | null;
  };
  select: (id: string) => void;
  move: (id: string, destination: Location) => void;
  dragging?: (id: string | null) => void;
  preview?: (position: Position | null) => void;
  dropOutside: (id: string, x: number, y: number) => void;
}
interface Token {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  hp: Phaser.GameObjects.Text;
  star: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  hud: Phaser.GameObjects.Container;
  abilityUntilTick: number;
  position: Position;
  range: number;
  team: string;
  dead: boolean;
  pose: Pose;
  poseTime: number;
  animalId: string;
  facing: Facing;
}
const font = 'Arial, sans-serif';
const gold = 0xffd36f;
const vectors = (points: readonly { x: number; y: number }[]) =>
  points.map((p) => new Phaser.Math.Vector2(p.x, p.y));
class Battlefield extends Phaser.Scene {
  private tokens = new Map<string, Token>();
  private effects = new Set<Phaser.GameObjects.GameObject>();
  private speed = 1;
  private highlights!: Phaser.GameObjects.Graphics;
  private tiles!: Phaser.GameObjects.Graphics;
  private tabHeld = false;
  private leaders!: Phaser.GameObjects.Graphics;
  private floatingLabels = new Set<Phaser.GameObjects.Text>();
  private lastMergeVersion = 0;
  private frozen = false;
  constructor(
    private controller: SandboxController,
    private controls: () => { speed: number; paused: boolean },
    private interactions?: DeploymentInteractions,
  ) {
    super('battlefield');
  }
  preload() {
    this.load.image(
      'woodland-backdrop',
      `${import.meta.env.BASE_URL}assets/arena/woodland-v1.png`,
    );
    for (const [id, url] of Object.entries(ANIMAL_SHEETS)) {
      const size = ANIMAL_LAYOUT[id]?.frameSize ?? 32;
      this.load.spritesheet(id, url, { frameWidth: size, frameHeight: size });
    }
  }
  create() {
    this.drawBoard();
    this.highlights = this.add.graphics().setDepth(2);
    this.leaders = this.add.graphics().setDepth(10799);
    this.input.dragDistanceThreshold = 6;
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.interactions?.state().draggingId)
        this.interactions.preview?.(cellAt(pointer.x, pointer.y));
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const state = this.interactions?.state();
      const position = cellAt(pointer.x, pointer.y);
      if (state?.status === 'ready' && state.selectedId && position)
        this.interactions?.move(state.selectedId, { kind: 'board', position });
    });
    this.input.on(
      'dragstart',
      (pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Container) => {
        if (this.interactions?.state().status === 'ready') {
          this.interactions.dragging?.(object.getData('unitId') as string);
          this.interactions.preview?.(cellAt(pointer.x, pointer.y));
        }
      },
    );
    this.input.on(
      'drag',
      (
        pointer: Phaser.Input.Pointer,
        object: Phaser.GameObjects.Container,
        x: number,
        y: number,
      ) => {
        if (this.interactions?.state().status === 'ready') {
          object.setPosition(x, y).setDepth(10000);
          this.interactions.preview?.(cellAt(pointer.x, pointer.y));
        }
      },
    );
    this.input.on(
      'dragend',
      (pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Container) => {
        this.interactions?.dragging?.(null);
        const id = object.getData('unitId') as string;
        const token = this.tokens.get(id);
        if (!token || this.interactions?.state().status !== 'ready') return;
        const original = project(token.position);
        object
          .setPosition(original.x, original.y)
          .setDepth(unitDepth(token.position));
        const position = cellAt(pointer.x, pointer.y);
        if (position) this.interactions.move(id, { kind: 'board', position });
        else {
          const event = pointer.event as PointerEvent;
          this.interactions.dropOutside(id, event.clientX, event.clientY);
        }
      },
    );
    const unsubscribe = this.controller.subscribe((frame) =>
      this.present(frame),
    );
    const cancelDrag = () => {
      this.tabHeld = false;
      this.interactions?.dragging?.(null);
      for (const token of this.tokens.values()) {
        if (token.container.depth === 10000) {
          const p = project(token.position);
          token.container
            .setPosition(p.x, p.y)
            .setDepth(unitDepth(token.position));
        }
      }
    };
    const showTiles = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      )
        return;
      event.preventDefault();
      this.tabHeld = true;
    };
    const hideTiles = (event: KeyboardEvent) => {
      if (event.key === 'Tab') this.tabHeld = false;
    };
    const hidden = () => {
      if (document.hidden) cancelDrag();
    };
    window.addEventListener('keydown', showTiles);
    window.addEventListener('keyup', hideTiles);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', cancelDrag);
    window.addEventListener('pointercancel', cancelDrag);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', showTiles);
      window.removeEventListener('keyup', hideTiles);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('blur', cancelDrag);
      window.removeEventListener('pointercancel', cancelDrag);
      unsubscribe();
      this.tweens.killAll();
      this.tokens.clear();
      this.effects.clear();
      this.floatingLabels.clear();
      this.input.removeAllListeners();
    });
  }
  private get reduced() {
    return (
      this.controls().paused ||
      (this.interactions?.state().reducedMotion ?? false)
    );
  }
  update(_time: number, delta: number) {
    const { speed, paused } = this.controls();
    this.speed = speed;
    const frozen = paused || document.hidden;
    if (frozen) this.tweens.pauseAll();
    else if (this.frozen) this.tweens.resumeAll();
    this.frozen = frozen;
    this.controller.advance(delta, speed, paused);
    for (const token of this.tokens.values()) {
      // Drawing frames never advance combat. Paused/hidden time is discarded.
      if (!frozen && (!token.dead || token.pose === 'death')) {
        token.poseTime +=
          Math.min(delta, 100) * (token.pose === 'idle' ? 1 : speed);
        const timings = this.poseTimings(token);
        const cycle = timings.reduce((total, ms) => total + ms, 0);
        if (
          token.pose !== 'idle' &&
          token.pose !== 'death' &&
          token.poseTime >= cycle
        ) {
          token.pose = 'idle';
          token.poseTime = 0;
        }
        token.sprite.setFrame(
          directionalFrame(
            token.facing,
            token.pose,
            token.poseTime,
            this.reduced,
            this.poseTimings(token),
            true,
          ),
        );
      }
      if (!token.dead && token.container.depth < 10000)
        token.container.setDepth(
          100 + token.container.y + token.position.x * 0.001,
        );
    }
    const state = this.interactions?.state();
    this.layoutHealth(state?.status !== 'running');
    const showGrid = this.tabHeld || Boolean(state?.draggingId);
    this.tiles.setVisible(showGrid);
    this.highlights.clear();
    if (state?.status === 'ready' && showGrid) {
      for (let y = 0; y < BATTLE_RULES.height; y++)
        for (let x = 0; x < SQUAD_RULES.deploymentColumns; x++) {
          this.highlights.lineStyle(
            state.selectedId ? 2 : 1,
            0x78d5d5,
            state.selectedId ? 0.75 : 0.35,
          );
          this.highlights.strokePoints(vectors(tileCorners({ x, y })), true);
        }
      const selected = state.selectedId
        ? this.tokens.get(state.selectedId)
        : null;
      if (selected) {
        this.highlights.fillStyle(gold, 0.15);
        this.highlights.fillPoints(
          vectors(tileCorners(selected.position)),
          true,
        );
        this.highlights.lineStyle(3, gold);
        this.highlights.strokePoints(
          vectors(tileCorners(selected.position)),
          true,
        );
      }
      if (state.dropPreview) {
        this.highlights.fillStyle(0xffe34d, 0.6);
        this.highlights.fillPoints(
          vectors(tileCorners(state.dropPreview)),
          true,
        );
        this.highlights.lineStyle(3, 0xfff18a, 1);
        this.highlights.strokePoints(
          vectors(tileCorners(state.dropPreview)),
          true,
        );
      }
    }
    if (state && state.mergeVersion !== this.lastMergeVersion) {
      this.lastMergeVersion = state.mergeVersion;
      for (const merge of state.merges) {
        const token = this.tokens.get(merge.survivorId);
        if (token) {
          const threeStar = merge.starLevel === 3;
          this.floatingText(
            token,
            `${'★'.repeat(merge.starLevel)} ${merge.starLevel}★ UPGRADE!`,
            threeStar ? '#fff1a8' : '#9ff5ea',
          );
          this.burst(
            token.container.x,
            token.container.y - 28,
            threeStar ? 0xffcf59 : 0x8de7dd,
            threeStar ? 28 : 16,
          );
          this.pulse(token, threeStar ? 0xffcf59 : 0x8de7dd);
          if (!this.reduced)
            this.tweens.add({
              targets: token.body,
              scale: 1.2,
              duration: this.duration(150),
              yoyo: true,
              ease: 'Back.easeOut',
            });
        }
      }
    }
  }
  private drawBoard() {
    this.tiles = this.add.graphics().setDepth(1).setVisible(false);
    this.add
      .image(480, 320, 'woodland-backdrop')
      .setDisplaySize(960, 640)
      .setDepth(-2);
    for (let y = 0; y < BATTLE_RULES.height; y++)
      for (let x = 0; x < BATTLE_RULES.width; x++) {
        const corners = tileCorners({ x, y });
        this.tiles.fillStyle(
          x < 3 ? 0x4c7053 : x >= 5 ? 0x65704f : 0x597651,
          0.45,
        );
        this.tiles.fillPoints(vectors(corners), true);
        this.tiles.lineStyle(1, 0xc2cf97, 0.5);
        this.tiles.strokePoints(vectors(corners), true);
      }
    const arenaLabel = (
      x: number,
      y: number,
      label: string,
      color: string,
      width: number,
      fontSize: string,
    ) => {
      this.add
        .rectangle(x, y, width, 28, 0x10251d, 0.9)
        .setStrokeStyle(2, 0xd6dda7, 0.55)
        .setDepth(2);
      this.add
        .text(x, y, label, {
          fontFamily: font,
          fontSize,
          color,
          fontStyle: 'bold',
          stroke: '#07110d',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(3);
    };

    arenaLabel(480, 31, 'W I L D W O O D', '#f0efbd', 224, '15px');
    arenaLabel(148, 540, 'YOUR SQUAD', '#9ff5ea', 132, '12px');
    arenaLabel(804, 120, 'RIVALS', '#ffc0a4', 96, '12px');
  }
  private animalBody(animalId: string, enemy = false) {
    const body = this.add.container(0, -8);
    const layout = ANIMAL_LAYOUT[animalId];
    const sprite = this.add
      .image(0, 8, animalId, enemy ? 16 : 28)
      .setOrigin(0.5, layout ? layout.foot / layout.frameSize : 29 / 32)
      .setDisplaySize(96, 96);
    body.add(sprite);
    return { body, sprite };
  }
  private makeToken(unit: UnitSnapshot) {
    const p = project(unit.position);
    const container = this.add
      .container(p.x, p.y)
      .setDepth(unitDepth(unit.position));
    const ring = this.add.graphics();
    ring.fillStyle(0x091b17, 0.35);
    ring.fillEllipse(0, 1, 48, 16);
    ring.lineStyle(2, unit.team === 'player' ? 0x6cdbd2 : 0xf39c7d, 0.9);
    ring.strokeEllipse(0, 1, 46, 17);
    const aura = this.add.graphics();
    if (unit.starLevel > 1) {
      const color = unit.starLevel === 3 ? 0xffc857 : 0x8de7dd;
      aura.fillStyle(color, unit.starLevel === 3 ? 0.12 : 0.08);
      aura.fillEllipse(0, -18, unit.starLevel === 3 ? 82 : 70, 72);
      aura.lineStyle(unit.starLevel === 3 ? 3 : 2, color, 0.72);
      aura.strokeEllipse(0, 0, unit.starLevel === 3 ? 62 : 55, 23);
      if (unit.starLevel === 3) {
        aura.lineStyle(1, 0xffed9e, 0.58);
        aura.strokeEllipse(0, 0, 78, 29);
        for (const [x, y] of [
          [-39, -25],
          [39, -25],
          [-31, -57],
          [31, -57],
        ] as const)
          aura.fillCircle(x, y, 2);
      }
      if (!this.reduced)
        this.tweens.add({
          targets: aura,
          alpha: unit.starLevel === 3 ? 0.42 : 0.58,
          duration: unit.starLevel === 3 ? 760 : 1050,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
    }
    const { body, sprite } = this.animalBody(
      unit.animalId,
      unit.team === 'enemy',
    );
    const name = this.add
      .text(0, 12, unit.name.toUpperCase(), {
        fontFamily: font,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#f4f0da',
        stroke: '#193529',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const star = this.add
      .text(
        0,
        ANIMAL_LAYOUT[unit.animalId].starYs[
          unit.team === 'player' ? 'right' : 'left'
        ],
        '★'.repeat(unit.starLevel),
        {
          fontFamily: font,
          fontSize:
            unit.starLevel === 3
              ? '15px'
              : unit.starLevel === 2
                ? '13px'
                : '12px',
          color: unit.starLevel === 3 ? '#fff1a8' : '#ffe29a',
          stroke: '#263927',
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5);
    const bar = this.add.graphics();
    const hp = this.add
      .text(0, 34, `${unit.health}`, {
        fontFamily: font,
        fontSize: '9px',
        color: '#eef4dc',
        stroke: '#163025',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    star.setY(0);
    const hud = this.add
      .container(p.x, p.y - 100, [name, star, bar, hp])
      .setDepth(10800);
    container.add([aura, ring, body]);
    const token: Token = {
      container,
      body,
      sprite,
      bar,
      hp,
      star,
      name,
      hud,
      abilityUntilTick: 0,
      position: unit.position,
      range: unit.attackRange,
      team: unit.team,
      dead: false,
      pose: 'idle',
      poseTime: 0,
      animalId: unit.animalId,
      facing: unit.team === 'player' ? 'right' : 'left',
    };
    this.tokens.set(unit.instanceId, token);
    this.updateHealth(token, unit);
    if (unit.team === 'player' && this.interactions) {
      container
        .setSize(0, 0)
        .setInteractive(
          new Phaser.Geom.Rectangle(-48, -90, 96, 96),
          (_area: unknown, x: number, y: number) => {
            if (this.interactions?.state().status !== 'ready' || token.dead)
              return false;
            const px = Math.floor(((x + 48) * 128) / 96);
            const py = Math.floor(((y + 90) * 128) / 96);
            if (px < 0 || py < 0 || px >= 128 || py >= 128) return false;
            return (
              this.textures.getPixelAlpha(
                px,
                py,
                unit.animalId,
                sprite.frame.name,
              ) > 32
            );
          },
        )
        .setData('unitId', unit.instanceId);
      container.input!.cursor = 'pointer';
      this.input.setDraggable(container);
      container.on(
        'pointerdown',
        (
          _p: Phaser.Input.Pointer,
          _x: number,
          _y: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          if (this.interactions?.state().status !== 'ready') return;
          event.stopPropagation();
          this.interactions.select(unit.instanceId);
        },
      );
    }
    return token;
  }
  private updateHealth(token: Token, unit: UnitSnapshot) {
    token.bar.clear();
    token.bar.fillStyle(0x0b241c, 0.95);
    token.bar.fillRoundedRect(-26, 23, 52, 7, 2);
    if (unit.health > 0) {
      token.bar.fillStyle(
        unit.health / unit.maxHealth < 0.3
          ? 0xffca67
          : unit.team === 'player'
            ? 0x80d9a3
            : 0xf29b7b,
      );
      token.bar.fillRoundedRect(
        -25,
        24,
        (50 * unit.health) / unit.maxHealth,
        5,
        1,
      );
    }
    if (unit.shield > 0) {
      token.bar.fillStyle(0x8bdfff);
      token.bar.fillRect(
        -25,
        21,
        Math.min(50, (50 * unit.shield) / unit.maxHealth),
        2,
      );
    }
    token.hp.setText(
      `${unit.health}/${unit.maxHealth}${unit.shield > 0 ? ` +${unit.shield} shield` : ''}`,
    );
  }
  private layoutHealth(details: boolean) {
    this.leaders.clear();
    const pointer = this.input.activePointer;
    const hovered = [...this.tokens.entries()]
      .filter(
        ([, t]) =>
          !t.dead &&
          Math.abs(pointer.x - t.container.x) < 40 &&
          pointer.y > t.container.y - 85 &&
          pointer.y < t.container.y + 8,
      )
      .sort((a, b) => b[1].container.depth - a[1].container.depth)[0]?.[0];
    const anchors = [...this.tokens.entries()]
      .filter(([, t]) => !t.dead)
      .map(([id, t]) => {
        const expanded = details || id === hovered;
        t.name.setVisible(expanded);
        t.hp.setVisible(expanded);
        t.bar.setY(expanded ? 0 : -11);
        return {
          id,
          x: t.container.x,
          y: details
            ? t.container.y + 9
            : t.container.y +
              ANIMAL_LAYOUT[t.animalId].starYs[t.facing] -
              (expanded ? 44 : 23),
          width: expanded ? 78 : 60,
          height: expanded ? 44 : 23,
        };
      });
    const silhouettes = [...this.tokens]
      .filter(([, t]) => !t.dead)
      .map(([id, t]) => ({
        id,
        x: t.container.x,
        y: t.container.y + ANIMAL_LAYOUT[t.animalId].starYs[t.facing] + 8,
        width: 80,
        height: -ANIMAL_LAYOUT[t.animalId].starYs[t.facing] - 8,
      }));
    for (const label of placeLabels(anchors, ARENA_SIZE, silhouettes)) {
      const t = this.tokens.get(label.id)!;
      t.hud.setPosition(label.x, label.y).setVisible(true);
      const anchor = anchors.find((a) => a.id === label.id)!;
      if (Math.hypot(label.x - anchor.x, label.y - anchor.y) > 12) {
        this.leaders.lineStyle(
          1,
          t.team === 'player' ? 0x80d9a3 : 0xf29b7b,
          0.55,
        );
        this.leaders.lineBetween(
          label.x,
          label.y + label.height,
          t.container.x,
          t.container.y +
            (details ? 2 : ANIMAL_LAYOUT[t.animalId].starYs[t.facing] + 10),
        );
      }
    }
  }
  private duration(ms: number) {
    return Math.max(24, ms / this.speed);
  }
  private poseTimings(token: Token): readonly number[] {
    if (token.pose === 'idle') return [1400, 240, 600, 100];
    if (token.pose === 'death') return [90, 90, 100, 120];
    return (
      ANIMAL_POSE_TIMINGS[token.animalId]?.[token.pose] ?? [60, 60, 60, 60]
    );
  }
  private pose(token: Token, pose: Pose) {
    token.pose = pose;
    token.poseTime = 0;
    token.sprite.setFrame(
      directionalFrame(
        token.facing,
        pose,
        0,
        this.reduced,
        this.poseTimings(token),
        true,
      ),
    );
  }
  private face(token: Token, dx: number, dy: number) {
    token.facing = facingFor(dx, dy, token.facing);
    token.sprite.setFrame(
      directionalFrame(
        token.facing,
        token.pose,
        token.poseTime,
        this.reduced,
        this.poseTimings(token),
        true,
      ),
    );
  }
  private own<T extends Phaser.GameObjects.GameObject>(object: T) {
    this.effects.add(object);
    return object;
  }
  private remove(object: Phaser.GameObjects.GameObject) {
    this.effects.delete(object);
    if (object instanceof Phaser.GameObjects.Text)
      this.floatingLabels.delete(object);
    object.destroy();
  }
  private floatingText(token: Token, text: string, color: string) {
    const ability = !text.startsWith('−');
    const anchor = {
      id: 'new',
      x: token.container.x,
      y: token.container.y - (ability ? 132 : 72),
      width: ability ? 104 : 42,
      height: 22,
    };
    const position = placeFloatingLabel(
      anchor,
      [
        ...[...this.floatingLabels].map((label, i) => ({
          id: `existing-${i}`,
          x: label.x,
          y: label.y,
          width: label.width,
          height: 22,
        })),
        ...[...this.tokens]
          .filter(([, t]) => !t.dead)
          .map(([id, t]) => ({
            id,
            x: t.hud.x,
            y: t.hud.y,
            width: 60,
            height: 23,
          })),
      ],
      ARENA_SIZE,
    );
    const label = this.own(
      this.add
        .text(position.x, position.y, text, {
          fontFamily: font,
          fontSize: ability ? '12px' : '16px',
          fontStyle: 'bold',
          color,
          stroke: '#152b22',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(11000),
    );
    this.floatingLabels.add(label);
    this.tweens.add({
      targets: label,
      y: label.y - (this.reduced ? 8 : 33),
      alpha: 0,
      duration: this.duration(620),
      onComplete: () => this.remove(label),
    });
  }
  private burst(x: number, y: number, color: number, count = 7) {
    if (this.reduced) return;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dot = this.own(
        this.add.circle(x, y, i % 2 ? 2 : 3, color).setDepth(10500),
      );
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * 29,
        y: y + Math.sin(angle) * 22,
        alpha: 0,
        scale: 0.1,
        duration: this.duration(280),
        ease: 'Cubic.easeOut',
        onComplete: () => this.remove(dot),
      });
    }
  }
  private pulse(token: Token, color: number) {
    if (this.reduced) return;
    const ring = this.own(
      this.add
        .ellipse(token.container.x, token.container.y, 46, 20)
        .setStrokeStyle(3, color)
        .setDepth(3),
    );
    this.tweens.add({
      targets: ring,
      scale: 2.1,
      alpha: 0,
      duration: this.duration(430),
      onComplete: () => this.remove(ring),
    });
  }
  private banner(text: string, color: string) {
    const label = this.own(
      this.add
        .text(480, 58, text, {
          fontFamily: font,
          fontSize: '24px',
          fontStyle: 'bold',
          color,
          stroke: '#132b25',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(11000),
    );
    this.tweens.add({
      targets: label,
      alpha: 0,
      delay: this.duration(650),
      duration: this.duration(350),
      onComplete: () => this.remove(label),
    });
  }
  private present(frame: PresentationFrame) {
    if (frame.reset) {
      const oldPositions = new Map(
        [...this.tokens].map(([id, t]) => [
          id,
          { x: t.container.x, y: t.container.y },
        ]),
      );
      this.tweens.killAll();
      for (const effect of this.effects) effect.destroy();
      this.effects.clear();
      this.floatingLabels.clear();
      for (const token of this.tokens.values()) {
        token.container.destroy();
        token.hud.destroy();
      }
      this.tokens.clear();
      for (const unit of frame.snapshot.units) this.makeToken(unit);
      const state = this.interactions?.state();
      if (state && state.mergeVersion !== this.lastMergeVersion)
        for (const merge of state.merges) {
          const survivor = frame.snapshot.units.find(
            (u) => u.instanceId === merge.survivorId,
          );
          if (!survivor) continue;
          const destination = project(survivor.position);
          merge.consumedIds.forEach((id, index) => {
            if (this.reduced) return;
            const start = oldPositions.get(id) ?? {
              x: destination.x + (index === 0 ? -65 : 65),
              y: 510,
            };
            const ghost = this.own(
              this.animalBody(survivor.animalId)
                .body.setPosition(start.x, start.y)
                .setScale(0.6)
                .setAlpha(0.8)
                .setDepth(10500),
            );
            this.tweens.add({
              targets: ghost,
              x: destination.x,
              y: destination.y,
              alpha: 0,
              scale: 0.1,
              duration: this.duration(360),
              ease: 'Sine.easeIn',
              onComplete: () => this.remove(ghost),
            });
          });
        }
      return;
    }
    if (this.controls().paused && frame.events.length) {
      for (const effect of [...this.effects]) {
        this.tweens.killTweensOf(effect);
        this.remove(effect);
      }
      for (const unit of frame.snapshot.units) {
        const t = this.tokens.get(unit.instanceId);
        if (!t) continue;
        this.tweens.killTweensOf([t.container, t.body, t.sprite]);
        const p = project(unit.position);
        t.container.setPosition(p.x, p.y).setAlpha(unit.health > 0 ? 1 : 0);
        t.body.setPosition(0, -8).setScale(1).setAngle(0);
        t.sprite.clearTint().setAlpha(1);
      }
    }
    for (const event of frame.events) {
      if (event.type === 'battleStarted') this.banner('BATTLE!', '#fff0b0');
      if (event.type === 'battleEnded')
        this.banner(
          event.result.winner === 'player' ? 'VICTORY!' : 'ROUND LOST',
          event.result.winner === 'player' ? '#ffe093' : '#ffac8b',
        );
      if (event.type === 'traitActivated') {
        // Name active traits together, once per team, without obscuring animals.
        const members = frame.snapshot.units.filter(
          (u) => u.team === event.team,
        );
        if (
          frame.events.find(
            (e) => e.type === 'traitActivated' && e.team === event.team,
          ) === event
        ) {
          const names = frame.events
            .filter((e) => e.type === 'traitActivated' && e.team === event.team)
            .map((e) =>
              e.type === 'traitActivated'
                ? (TRAITS.find((t) => t.id === e.traitId)?.name ?? e.traitId)
                : '',
            )
            .join(' + ');
          const label = this.own(
            this.add
              .text(
                event.team === 'player' ? 175 : 770,
                event.team === 'player' ? 440 : 285,
                names.toUpperCase(),
                {
                  fontFamily: font,
                  fontSize: '10px',
                  fontStyle: 'bold',
                  color: '#c3ec91',
                  stroke: '#183425',
                  strokeThickness: 3,
                },
              )
              .setOrigin(0.5)
              .setDepth(11000),
          );
          this.tweens.add({
            targets: label,
            alpha: 0,
            delay: this.duration(800),
            duration: this.duration(250),
            onComplete: () => this.remove(label),
          });
          for (const unit of members) {
            const token = this.tokens.get(unit.instanceId);
            if (token) this.pulse(token, 0xb5e477);
          }
        }
      }
      if (!('unitId' in event)) continue;
      const token = this.tokens.get(event.unitId);
      if (!token) continue;
      if (event.type === 'traitProc') {
        this.floatingText(
          token,
          event.effect === 'heal'
            ? `+${event.amount} HP`
            : event.effect === 'shield'
              ? `+${event.amount} SHIELD`
              : 'RETALIATE',
          event.effect === 'heal' ? '#9ce6aa' : '#a5dfff',
        );
      }
      if (event.type === 'statusApplied') {
        const target = this.tokens.get(event.targetId);
        if (target) {
          const statusPresentation = {
            stunned: { label: 'STUNNED', color: '#ffe17d', pulse: 0xffcf55 },
            howl: { label: 'HOWL', color: '#b9d9ff', pulse: 0x92b9ff },
            slowed: { label: 'CHILLED', color: '#9de8ff', pulse: 0x65cef2 },
            guarded: { label: 'GUARDED', color: '#b9f5b5', pulse: 0x75d886 },
            vulnerable: {
              label: 'VULNERABLE',
              color: '#ffb0a6',
              pulse: 0xff7466,
            },
            rallied: {
              label: 'RALLIED',
              color: '#ffd68c',
              pulse: 0xf2ad4d,
            },
            evasive: {
              label: 'EVASIVE',
              color: '#f5f4d0',
              pulse: 0xe7df94,
            },
            weakened: {
              label: 'WEAKENED',
              color: '#d8a4a4',
              pulse: 0xb96d6d,
            },
            silenced: {
              label: 'SILENCED',
              color: '#d6b8f1',
              pulse: 0xa276d0,
            },
          }[event.status];
          this.floatingText(
            target,
            statusPresentation.label,
            statusPresentation.color,
          );
          this.pulse(target, statusPresentation.pulse);
        }
      }
      if (event.type === 'unitMoved') {
        const p = project(event.to);
        this.pose(token, 'walk');
        const from = project(token.position);
        this.face(token, p.x - from.x, p.y - from.y);
        this.tweens.killTweensOf(token.container);
        token.position = event.to;
        if (this.reduced) token.container.setPosition(p.x, p.y);
        else
          this.tweens.add({
            targets: token.container,
            x: p.x,
            y: p.y,
            duration: this.duration(
              this.poseTimings(token).reduce((sum, ms) => sum + ms, 0),
            ),
            ease: 'Sine.easeInOut',
          });
        this.tweens.killTweensOf(token.body);
        token.body.setPosition(0, -8).setScale(1).setAngle(0);
      } else if (event.type === 'unitAttacked') {
        const target = this.tokens.get(event.targetId);
        if (!target) continue;
        this.pose(token, 'attack');
        const dx = Math.sign(target.container.x - token.container.x) * 13;
        const dy = Math.sign(target.container.y - token.container.y) * 6;
        this.face(
          token,
          target.container.x - token.container.x,
          target.container.y - token.container.y,
        );
        this.tweens.killTweensOf(token.body);
        token.body.setPosition(0, -8).setScale(1).setAngle(0);
        if (!this.reduced) {
          this.tweens.add({
            targets: token.body,
            x: dx,
            y: -8 + dy,
            duration: this.duration(80),
            yoyo: true,
            onComplete: () =>
              token.body.setPosition(0, -8).setScale(1).setAngle(0),
          });
          if (token.range > 1) {
            const shot = this.own(
              this.add
                .circle(
                  token.container.x,
                  token.container.y - 28,
                  4,
                  token.team === 'player' ? 0x9fe9e2 : 0xffb48f,
                )
                .setDepth(10500),
            );
            this.tweens.add({
              targets: shot,
              x: target.container.x,
              y: target.container.y - 28,
              duration: this.duration(110),
              onComplete: () => {
                this.burst(shot.x, shot.y, gold, 4);
                this.remove(shot);
              },
            });
          }
        }
      } else if (event.type === 'attackDodged') {
        const target = this.tokens.get(event.targetId);
        if (!target) continue;
        this.floatingText(target, 'DODGE!', '#f5f4d0');
        this.pulse(target, 0xe7df94);
      } else if (event.type === 'damageDealt') {
        const target = this.tokens.get(event.targetId);
        if (!target) continue;
        this.floatingText(
          target,
          event.damage === 0 ? 'BLOCK' : `−${event.damage}`,
          '#fff2d1',
        );
        this.burst(target.container.x, target.container.y - 30, 0xffd7a1, 5);
        if (!this.reduced) {
          target.sprite.setTint(0xfff1c5).setTintMode(Phaser.TintModes.FILL);
          this.tweens.add({
            targets: target.sprite,
            alpha: 0.55,
            duration: this.duration(50),
            yoyo: true,
            onComplete: () => target.sprite.clearTint().setAlpha(1),
          });
        }
      } else if (event.type === 'healingDone') {
        const target = this.tokens.get(event.targetId);
        if (!target) continue;
        this.floatingText(target, `+${event.amount} HP`, '#9ce6aa');
        this.pulse(target, 0x72d58a);
        this.burst(target.container.x, target.container.y - 24, 0x72d58a, 5);
      } else if (event.type === 'abilityTriggered') {
        const abilityPresentation = {
          extraAttack: {
            label: 'EXTRA HIT',
            color: '#99f3ec',
            pulse: 0x99f3ec,
          },
          executeDamage: {
            label: 'EXECUTE',
            color: '#ffc08a',
            pulse: 0xffa06d,
          },
          howl: { label: 'HOWL!', color: '#b9d9ff', pulse: 0x92b9ff },
          bearHug: { label: 'BEAR HUG!', color: '#ffc08a', pulse: 0xffa06d },
          loyalGuard: {
            label: 'LOYAL GUARD!',
            color: '#b9f5b5',
            pulse: 0x75d886,
          },
          pounce: { label: 'POUNCE!', color: '#ffcf8c', pulse: 0xff9f55 },
          chill: { label: 'CHILL!', color: '#9de8ff', pulse: 0x65cef2 },
          groundSlam: {
            label: 'GROUND SLAM!',
            color: '#ffd18c',
            pulse: 0xe29a4b,
          },
          cackle: { label: 'CACKLE!', color: '#ffb0a6', pulse: 0xff7466 },
          skyDive: {
            label: 'SKY DIVE!',
            color: '#d4e8ff',
            pulse: 0x86b9f2,
          },
          bananaAid: {
            label: 'BANANA AID!',
            color: '#d9f59b',
            pulse: 0xa8d95e,
          },
          battleCry: {
            label: 'BATTLE CRY!',
            color: '#ffd68c',
            pulse: 0xf2ad4d,
          },
          featherGuard: {
            label: 'FEATHER GUARD!',
            color: '#f5f4d0',
            pulse: 0xe7df94,
          },
          cripplingBite: {
            label: 'CRIPPLING BITE!',
            color: '#e3aaaa',
            pulse: 0xb96d6d,
          },
          squawk: {
            label: 'SQUAWK!',
            color: '#d6b8f1',
            pulse: 0xa276d0,
          },
          chainStrike: {
            label: 'CHAIN STRIKE!',
            color: '#c7dcff',
            pulse: 0x82aef0,
          },
          stoneSplash: {
            label: 'STONE SPLASH!',
            color: '#d9c3a2',
            pulse: 0xaa8252,
          },
        }[event.ability];
        if (event.tick >= token.abilityUntilTick) {
          token.abilityUntilTick = event.tick + 8;
          this.floatingText(
            token,
            abilityPresentation.label,
            abilityPresentation.color,
          );
        }
        const abilityColor = abilityPresentation.pulse;
        this.pulse(token, abilityColor);
        this.burst(token.container.x, token.container.y - 24, abilityColor, 4);
      } else if (event.type === 'unitDied') {
        token.dead = true;
        this.pose(token, 'death');
        token.hud.setVisible(false);
        token.container.disableInteractive();
        this.tweens.killTweensOf(token.container);
        this.tweens.killTweensOf(token.body);
        const p = project(token.position);
        token.container.setPosition(p.x, p.y);
        this.burst(p.x, p.y - 16, 0xb9c8a2, 8);
        this.tweens.add({
          targets: token.container,
          alpha: 0,
          delay: this.reduced ? 0 : this.duration(360),
          duration: this.duration(this.reduced ? 150 : 180),
        });
      }
    }
    for (const unit of frame.snapshot.units) {
      const token = this.tokens.get(unit.instanceId) ?? this.makeToken(unit);
      this.updateHealth(token, unit);
      if (
        unit.health > 0 &&
        (unit.position.x !== token.position.x ||
          unit.position.y !== token.position.y)
      ) {
        const p = project(unit.position);
        token.container.setPosition(p.x, p.y);
        token.position = unit.position;
      }
    }
  }
}
export function createGame(
  parent: HTMLElement,
  controller: SandboxController,
  controls: () => { speed: number; paused: boolean },
  interactions?: DeploymentInteractions,
) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: ARENA_SIZE.width,
    height: ARENA_SIZE.height,
    backgroundColor: '#17352c',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new Battlefield(controller, controls, interactions),
    banner: false,
    audio: { noAudio: true },
  });
}
