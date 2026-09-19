import type { BattleEvent } from '../../simulation/types';
type AbilityKind = Extract<
  BattleEvent,
  { readonly type: 'abilityTriggered' }
>['ability'];
type Note = { from: number; to: number; duration: number; delay?: number };

export const abilityNotes = (ability: AbilityKind): readonly Note[] => {
  if (
    ability === 'bearHug' ||
    ability === 'groundSlam' ||
    ability === 'cripplingBite'
  )
    return [{ from: 210, to: 70, duration: 0.11 }];
  if (
    ability === 'loyalGuard' ||
    ability === 'bananaAid' ||
    ability === 'featherGuard'
  )
    return [
      { from: 480, to: 720, duration: 0.09 },
      { from: 720, to: 960, duration: 0.11, delay: 0.05 },
    ];
  if (
    ability === 'pounce' ||
    ability === 'skyDive' ||
    ability === 'chainStrike' ||
    ability === 'stoneSplash' ||
    ability === 'executeDamage'
  )
    return [{ from: 880, to: 330, duration: 0.09 }];
  if (ability === 'chill' || ability === 'cackle' || ability === 'squawk')
    return [{ from: 540, to: 310, duration: 0.13 }];
  if (ability === 'howl' || ability === 'battleCry')
    return [
      { from: 330, to: 660, duration: 0.12 },
      { from: 440, to: 880, duration: 0.15, delay: 0.05 },
    ];
  return [{ from: 620, to: 920, duration: 0.07 }];
};
export const upgradeNotes = (starLevel: 2 | 3) =>
  starLevel === 2
    ? [
        { from: 520, to: 780, duration: 0.18, delay: 0 },
        { from: 780, to: 1040, duration: 0.24, delay: 0.09 },
      ]
    : [
        { from: 440, to: 880, duration: 0.24, delay: 0 },
        { from: 660, to: 1320, duration: 0.31, delay: 0.08 },
        { from: 880, to: 1760, duration: 0.4, delay: 0.17 },
      ];

/** Small local synthesizer; audio is optional and never drives combat. */
export class BattleAudio {
  private context: AudioContext | null = null;
  private enabled = false;
  private paused = false;
  private lastCue = -1;
  private voices = new Set<OscillatorNode>();
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && !this.context && typeof AudioContext !== 'undefined')
      this.context = new AudioContext();
    this.sync();
  }
  setPaused(paused: boolean) {
    this.paused = paused;
    this.sync();
  }
  private sync() {
    if (!this.context) return;
    if (this.enabled && !this.paused)
      void this.context.resume().catch(() => {});
    else {
      this.silence();
      void this.context.suspend().catch(() => {});
    }
  }
  silence() {
    for (const voice of this.voices) {
      voice.stop();
      voice.disconnect();
    }
    this.voices.clear();
    this.lastCue = -1;
  }
  play(events: readonly BattleEvent[], speed: number) {
    if (
      !this.enabled ||
      this.paused ||
      !this.context ||
      this.context.state !== 'running' ||
      speed > 4
    )
      return;
    for (const event of events) {
      const now = this.context.currentTime;
      const important =
        event.type === 'battleEnded' || event.type === 'abilityTriggered';
      if (!important && now - this.lastCue < 0.055) continue;
      if (event.type === 'unitAttacked')
        this.tone(100 + (event.sequence % 25), 45, 0.025);
      else if (event.type === 'abilityTriggered') {
        for (const note of abilityNotes(event.ability))
          this.tone(note.from, note.to, note.duration, note.delay);
      } else if (event.type === 'unitDied') this.tone(200, 55, 0.12);
      else if (event.type === 'battleEnded')
        this.tone(
          event.result.winner === 'player' ? 520 : 220,
          event.result.winner === 'player' ? 780 : 110,
          0.3,
        );
      else continue;
      this.lastCue = now;
    }
  }
  upgrade(starLevel: 2 | 3) {
    if (!this.enabled || this.paused || this.context?.state !== 'running')
      return;
    for (const note of upgradeNotes(starLevel))
      this.tone(note.from, note.to, note.duration, note.delay);
  }
  private tone(from: number, to: number, duration: number, delay = 0) {
    if (!this.context || this.voices.size >= 8) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime + delay;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      this.voices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
  dispose() {
    this.silence();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }
}
