import type { Sample } from "../core/Telemetry";

export interface SparklineOptions {
  width: number;
  height: number;
  stroke?: string;
  fill?: string;
  background?: string;
  min?: number;
  max?: number;
  dpr?: number;
}

export class Sparkline {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: Required<SparklineOptions>;

  constructor(opts: SparklineOptions) {
    this.opts = {
      stroke: "#7ee2ff",
      fill: "rgba(126, 226, 255, 0.18)",
      background: "transparent",
      min: NaN,
      max: NaN,
      dpr: window.devicePixelRatio || 1,
      ...opts,
    };
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.opts.width * this.opts.dpr;
    this.canvas.height = this.opts.height * this.opts.dpr;
    this.canvas.style.width = `${this.opts.width}px`;
    this.canvas.style.height = `${this.opts.height}px`;
    this.canvas.style.display = "block";
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Sparkline: no 2d context");
    this.ctx = ctx;
    this.ctx.scale(this.opts.dpr, this.opts.dpr);
  }

  draw(samples: Sample[]): void {
    const { width: w, height: h, stroke, fill, background } = this.opts;
    const ctx = this.ctx;
    if (background !== "transparent") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    if (samples.length < 2) return;

    let lo = isNaN(this.opts.min) ? Infinity : this.opts.min;
    let hi = isNaN(this.opts.max) ? -Infinity : this.opts.max;
    if (isNaN(this.opts.min) || isNaN(this.opts.max)) {
      for (const s of samples) {
        if (s.v < lo) lo = s.v;
        if (s.v > hi) hi = s.v;
      }
    }
    if (lo === hi) { lo -= 1; hi += 1; }
    if (lo === Infinity) return;

    const xStep = w / (samples.length - 1);
    const scaleY = (v: number) => h - ((v - lo) / (hi - lo)) * h;

    ctx.beginPath();
    ctx.moveTo(0, scaleY(samples[0].v));
    for (let i = 1; i < samples.length; i++) {
      ctx.lineTo(i * xStep, scaleY(samples[i].v));
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = stroke;
    ctx.stroke();

    ctx.lineTo((samples.length - 1) * xStep, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
}
