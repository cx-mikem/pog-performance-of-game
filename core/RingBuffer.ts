export class RingBuffer<T> {
  private buf: T[];
  private head = 0;
  private len = 0;

  constructor(public readonly capacity: number) {
    this.buf = new Array(capacity);
  }

  push(value: T): void {
    this.buf[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.len < this.capacity) this.len++;
  }

  get size(): number { return this.len; }
  get isFull(): boolean { return this.len === this.capacity; }

  at(i: number): T | undefined {
    if (i < 0 || i >= this.len) return undefined;
    const start = this.isFull ? this.head : 0;
    return this.buf[(start + i) % this.capacity];
  }

  last(): T | undefined {
    if (this.len === 0) return undefined;
    return this.buf[(this.head - 1 + this.capacity) % this.capacity];
  }

  forEach(fn: (v: T, i: number) => void): void {
    const start = this.isFull ? this.head : 0;
    for (let i = 0; i < this.len; i++) fn(this.buf[(start + i) % this.capacity], i);
  }

  toArray(): T[] {
    const out: T[] = new Array(this.len);
    this.forEach((v, i) => { out[i] = v; });
    return out;
  }

  clear(): void {
    this.head = 0;
    this.len = 0;
  }
}
