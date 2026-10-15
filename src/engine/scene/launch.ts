// Clips set to launch on the beat wait here, one per layer, until the beat phase wraps.
// Without a tempo there is no beat to wait for: they go at once.

export class LaunchQueue {
  // Layer id → column waiting.
  private waiting = new Map<string, number>()
  private phase: number | null = null

  get tempo(): boolean {
    return this.phase !== null
  }

  get size(): number {
    return this.waiting.size
  }

  // A later clip on the same layer replaces the one waiting.
  add(layer: string, column: number): void {
    this.waiting.set(layer, column)
  }

  cancel(layer: string, column?: number): void {
    if (column === undefined || this.waiting.get(layer) === column) this.waiting.delete(layer)
  }

  pending(): ReadonlyMap<string, number> {
    return this.waiting
  }

  // Once a frame, with the beat phase (0–1) or null without a tempo. Returns what is due.
  tick(phase: number | null): [string, number][] {
    const beat = phase !== null && this.phase !== null && phase < this.phase - 0.5
    this.phase = phase
    if (!this.waiting.size || (phase !== null && !beat)) return []
    const due = [...this.waiting]
    this.waiting.clear()
    return due
  }
}
