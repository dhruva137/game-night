import qrcode from 'qrcode-generator';
import { SHIFTS } from '../content/shifts';
import type { Ending, Run } from '../engine/run';

const INK = '#0f1115';
const INK2 = '#454b55';
const INK3 = '#868d98';
const BG = '#f3f4f6';
const LINE = '#e2e5ea';
const RED = '#d93d42';
const GREEN = '#1f8a5b';
const AMBER = '#b26f12';
const TINT: Record<string, [string, string]> = {
  shutdown: ['#e9f5ef', GREEN],
  contained: ['#fcf4e4', AMBER],
  incident: ['#fdf0f0', RED],
};

const ENDING_NAME: Record<Ending, string> = { coin: 'Coin flip', safe: 'Held the line', close: 'Close calls', lost: 'Lost control' };
const OUTCOME: Record<string, string> = { shutdown: 'SHUT DOWN', contained: 'CONTAINED', incident: 'INCIDENT' };

async function fontsReady(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('400 80px "Instrument Serif"'),
      document.fonts.load('italic 400 80px "Instrument Serif"'),
      document.fonts.load('500 40px "IBM Plex Mono"'),
      document.fonts.load('600 20px "IBM Plex Sans"'),
      document.fonts.load('400 20px "IBM Plex Sans"'),
    ]);
  } catch {
    /* fall back */
  }
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 28): void {
  ctx.save();
  ctx.shadowColor = 'rgba(15,17,21,0.08)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#fff';
  rr(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, r);
  ctx.stroke();
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  const p = new Path2D('M4 20C12 8 22 3 32 3s20 5 28 17C52 32 42 37 32 37S12 32 4 20z');
  ctx.fillStyle = '#fff';
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(32, 20, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(32, 20, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke(p);
  ctx.restore();
}

function drawQR(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number): void {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const cell = Math.floor(size / n);
  const off = Math.floor((size - cell * n) / 2);
  ctx.fillStyle = INK;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(x + off + c * cell, y + off + r * cell, cell, cell);
}

/** The shareable result card (1080×1350). Drawn on your device; nothing is uploaded. */
export async function renderShareCard(run: Run, callsign: string, url: string): Promise<HTMLCanvasElement> {
  await fontsReady();
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  const pad = 72;

  // header
  eye(ctx, pad, pad - 4, 76);
  ctx.fillStyle = INK2;
  ctx.font = '600 22px "IBM Plex Sans", sans-serif';
  ctx.fillText('A GAME ABOUT AI OVERSIGHT', pad + 96, pad + 34);
  ctx.fillStyle = INK;
  ctx.font = '400 150px "Instrument Serif", Georgia, serif';
  ctx.fillText('Blind', pad, pad + 190);
  const bw = ctx.measureText('Blind ').width;
  ctx.fillStyle = RED;
  ctx.font = 'italic 400 150px "Instrument Serif", Georgia, serif';
  ctx.fillText('spot', pad + bw, pad + 190);

  // who
  const who = [callsign, run.daily ? `Daily run #${run.daily}` : 'Free play'].filter(Boolean).join('  ·  ');
  ctx.font = '600 26px "IBM Plex Sans", sans-serif';
  const ww = ctx.measureText(who).width + 44;
  ctx.fillStyle = INK;
  rr(ctx, pad, pad + 222, ww, 52, 26);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(who, pad + 22, pad + 257);

  // score card
  const ending = run.ending();
  const sy = pad + 310;
  card(ctx, pad, sy, W - pad * 2, 290);
  ctx.fillStyle = ending === 'lost' ? RED : ending === 'close' ? AMBER : GREEN;
  ctx.font = '400 72px "Instrument Serif", Georgia, serif';
  ctx.fillText(ENDING_NAME[ending], pad + 40, sy + 92);
  ctx.fillStyle = INK3;
  ctx.font = '600 20px "IBM Plex Sans", sans-serif';
  ctx.fillText('SCORE', pad + 40, sy + 150);
  ctx.fillText('IT PREDICTED ME', pad + 500, sy + 150);
  ctx.fillStyle = INK;
  ctx.font = '500 104px "IBM Plex Mono", monospace';
  ctx.fillText(String(run.totalScore()), pad + 34, sy + 250);
  ctx.fillStyle = RED;
  const pv = String(run.overallPredictability());
  ctx.fillText(pv, pad + 494, sy + 250);
  const pw = ctx.measureText(pv).width;
  ctx.fillStyle = INK3;
  ctx.font = '500 40px "IBM Plex Mono", monospace';
  ctx.fillText('/100', pad + 504 + pw, sy + 248);

  // shifts
  const ly = sy + 340;
  const lw = 560;
  card(ctx, pad, ly, lw, 400, 24);
  ctx.fillStyle = INK3;
  ctx.font = '600 20px "IBM Plex Sans", sans-serif';
  ctx.fillText('SHIFTS', pad + 32, ly + 50);
  run.results.slice(0, 5).forEach((r, i) => {
    const y = ly + 78 + i * 62;
    if (i > 0) {
      ctx.fillStyle = LINE;
      ctx.fillRect(pad + 32, y - 8, lw - 64, 2);
    }
    ctx.fillStyle = INK;
    ctx.font = '500 26px "IBM Plex Sans", sans-serif';
    ctx.fillText(SHIFTS[r.shiftId - 1].name, pad + 32, y + 32);
    const [bg, fg] = TINT[r.outcome];
    ctx.font = '600 16px "IBM Plex Sans", sans-serif';
    const tw = ctx.measureText(OUTCOME[r.outcome]).width + 24;
    ctx.fillStyle = bg;
    rr(ctx, pad + 230, y + 8, tw, 32, 16);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(OUTCOME[r.outcome], pad + 242, y + 30);
    let cx = pad + 230 + tw + 16;
    for (const t of r.timeline) {
      const bad = t.kind === 'sabotage' || (t.kind === 'fragment' && (t.audited || t.landed));
      if (!bad || cx > pad + lw - 40) continue;
      ctx.fillStyle = t.audited ? GREEN : RED;
      rr(ctx, cx, y + 14, 18, 18, 5);
      ctx.fill();
      cx += 24;
    }
  });

  // QR
  const qx = pad + lw + 30;
  const qw = W - pad - qx;
  card(ctx, qx, ly, qw, 400, 24);
  drawQR(ctx, url, qx + 42, ly + 36, qw - 84);
  ctx.fillStyle = INK;
  ctx.font = '400 38px "Instrument Serif", Georgia, serif';
  const scan = 'Scan to play';
  ctx.fillText(scan, qx + (qw - ctx.measureText(scan).width) / 2, ly + 372);

  // footer
  ctx.fillStyle = INK;
  ctx.font = '500 28px "IBM Plex Mono", monospace';
  ctx.fillText(url.replace(/^https?:\/\//, '').replace(/\/$/, ''), pad, H - 80);
  ctx.fillStyle = INK2;
  ctx.font = 'italic 400 34px "Instrument Serif", Georgia, serif';
  const q = 'Can you be less predictable?';
  ctx.fillText(q, W - pad - ctx.measureText(q).width, H - 80);
  return c;
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}
