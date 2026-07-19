// Geometria dos gráficos do cockpit (SVG paths a partir de dados reais).

export interface CurveGeom {
  line: string;
  area: string;
  proj: string;
  metaY: number;
  hojeX: number;
  hojeY: number;
  projX: number;
  projY: number;
  metaTopPct: string;
  projTopPct: string;
  projected: number;
}

// viewBox 640x250 (cockpit) — mesma gramática do placar do líder.
export function campaignCurve(opts: {
  cumulative: number[]; // total acumulado por dia de histórico (asc)
  meta: number;
  daysLeft: number;
  rate: number; // cadastros/dia (média recente)
}): CurveGeom {
  const W_L = 16, W_R = 624, TOP = 20, BOT = 228;
  const cum = opts.cumulative.length ? opts.cumulative : [0, 0];
  const histDays = Math.max(1, cum.length - 1);
  const current = cum[cum.length - 1];
  const projected = Math.round(current + opts.rate * opts.daysLeft);
  const totalUnits = histDays + Math.max(1, opts.daysLeft);
  const xUnit = (W_R - W_L) / totalUnits;
  const vMax = Math.max(opts.meta, projected, current, 1) * 1.08;
  const y = (v: number) => BOT - (v / vMax) * (BOT - TOP);
  const x = (i: number) => W_L + i * xUnit;

  const pts = cum.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  const line = "M " + pts.join(" L ");
  const hojeX = x(histDays);
  const area = `${line} L ${hojeX.toFixed(1)} ${BOT} L ${W_L} ${BOT} Z`;
  const hojeY = y(current);
  const projX = W_R;
  const projY = y(projected);
  const proj = `M ${hojeX.toFixed(1)} ${hojeY.toFixed(1)} L ${projX} ${projY.toFixed(1)}`;
  const metaY = y(opts.meta);

  return {
    line,
    area,
    proj,
    metaY,
    hojeX,
    hojeY,
    projX,
    projY,
    metaTopPct: `${((metaY / 250) * 100).toFixed(1)}%`,
    projTopPct: `${((projY / 250) * 100 - 3).toFixed(1)}%`,
    projected,
  };
}

// Buckets de N dias a partir de timestamps (para curva + barras cadastros/dia).
export function dailyBuckets(dates: Date[], days: number, endMs: number) {
  const DAY = 86400000;
  const start = endMs - (days - 1) * DAY;
  const buckets = new Array(days).fill(0);
  for (const d of dates) {
    const idx = Math.floor((d.getTime() - start) / DAY);
    if (idx >= 0 && idx < days) buckets[idx]++;
  }
  return buckets;
}
