export class SeededRandom {
  private state = 2166136261;
  constructor(seed: string) {
    for (let i = 0; i < seed.length; i++) {
      this.state = Math.imul(this.state ^ seed.charCodeAt(i), 16777619) >>> 0;
    }
  }
  next(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    this.state >>>= 0;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
}
