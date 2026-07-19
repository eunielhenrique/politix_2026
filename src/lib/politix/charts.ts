// Geometria dos gráficos (SVG paths a partir de dados reais).

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

interface Box { L: number; R: number; T: number; B: number; H: number; }

function buildCurve(
  opts: { cumulative: number[]; meta: number; daysLeft: number; rate: number },
  box: Box,
): CurveGeom {
  const cum = opts.cumulative.length ? opts.cumulative : [0, 0];
  const histDays = Math.max(1, cum.length - 1);
  const current = cum[cum.length - 1];
  const projected = Math.round(current + opts.rate * Math.max(1, opts.daysLeft));
  const totalUnits = histDays + Math.max(1, opts.daysLeft);
  const xUnit = (box.R - box.L) / totalUnits;
  const vMax = Math.max(opts.meta, projected, current, 1) * 1.08;
  const y = (v: number) => box.B - (v / vMax) * (box.B - box.T);
  const x = (i: number) => box.L + i * xUnit;

  const pts = cum.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  const line = "M " + pts.join(" L ");
  const hojeX = x(histDays);
  const area = `${line} L ${hojeX.toFixed(1)} ${box.B} L ${box.L} ${box.B} Z`;
  const hojeY = y(current);
  const projX = box.R;
  const projY = y(projected);
  const proj = `M ${hojeX.toFixed(1)} ${hojeY.toFixed(1)} L ${projX} ${projY.toFixed(1)}`;
  const metaY = y(opts.meta);

  return {
    line, area, proj, metaY, hojeX, hojeY, projX, projY,
    metaTopPct: `${((metaY / box.H) * 100).toFixed(1)}%`,
    projTopPct: `${((projY / box.H) * 100 - 3).toFixed(1)}%`,
    projected,
  };
}

// Cockpit do assessor (viewBox 640x250).
export function campaignCurve(opts: { cumulative: number[]; meta: number; daysLeft: number; rate: number }): CurveGeom {
  return buildCurve(opts, { L: 16, R: 624, T: 20, B: 228, H: 250 });
}

// Placar do líder (viewBox 320x150).
export function leaderTimeline(opts: { cumulative: number[]; meta: number; daysLeft: number; rate: number }): CurveGeom {
  return buildCurve(opts, { L: 12, R: 308, T: 18, B: 132, H: 150 });
}

// Buckets de N dias a partir de timestamps.
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
