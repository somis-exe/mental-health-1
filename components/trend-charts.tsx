'use client'

import { Smile, Moon, Utensils, Activity, Bath, Pill, Droplets } from 'lucide-react'
import { type ReportMetricKey } from '@/lib/health'
import { cn } from '@/lib/utils'

export const METRIC_ORDER: ReportMetricKey[] = ['mood', 'sleep', 'appetite', 'exercise', 'bath', 'medication', 'period']

export const METRIC_META: Record<
  ReportMetricKey,
  {
    label: string
    icon: React.ReactNode
    color: string
    min: number
    max: number
    ticks: number[]
    mid?: number
    format: (v: number) => string
  }
> = {
  mood: {
    label: '気分',
    icon: <Smile className="size-3.5" />,
    color: 'var(--primary)',
    min: 1,
    max: 5,
    ticks: [1, 2, 3, 4, 5],
    mid: 3,
    format: (v) => v.toFixed(1),
  },
  sleep: {
    label: '睡眠',
    icon: <Moon className="size-3.5" />,
    color: 'light-dark(#2a78d6, #3987e5)',
    min: 0,
    max: 12,
    ticks: [],
    format: (v) => `${v.toFixed(1)}時間`,
  },
  appetite: {
    label: '食欲',
    icon: <Utensils className="size-3.5" />,
    color: 'light-dark(#eb6834, #d95926)',
    min: 1,
    max: 3,
    ticks: [1, 2, 3],
    mid: 2,
    format: (v) => (v >= 2.5 ? 'しっかり食べた' : v >= 1.5 ? '普通' : 'あまり食べていない'),
  },
  exercise: {
    label: '運動',
    icon: <Activity className="size-3.5" />,
    color: 'light-dark(#eda100, #c98500)',
    min: 0,
    max: 2,
    ticks: [0, 1, 2],
    mid: 1,
    format: (v) => (v >= 1.5 ? 'ハード' : v >= 0.5 ? 'あり' : 'なし'),
  },
  bath: {
    label: '入浴',
    icon: <Bath className="size-3.5" />,
    color: 'light-dark(#4a3aa7, #9085e9)',
    min: 0,
    max: 1,
    ticks: [0, 1],
    format: (v) => (v >= 0.5 ? 'した' : 'していない'),
  },
  medication: {
    label: '服薬',
    icon: <Pill className="size-3.5" />,
    color: 'light-dark(#e87ba4, #d55181)',
    min: 0,
    max: 1,
    ticks: [0, 1],
    format: (v) => (v >= 0.5 ? 'あり' : 'なし'),
  },
  period: {
    label: '生理',
    icon: <Droplets className="size-3.5" />,
    color: 'light-dark(#e34948, #c94a4a)',
    min: 0,
    max: 1,
    ticks: [0, 1],
    format: (v) => (v >= 0.5 ? 'あり' : 'なし'),
  },
}

/** Sleep's domain grows with the data; the rest use their fixed META range. */
export function metricRange(key: ReportMetricKey, sleepDomainMax: number): { min: number; max: number } {
  return key === 'sleep' ? { min: 0, max: sleepDomainMax } : { min: METRIC_META[key].min, max: METRIC_META[key].max }
}

export function TrendChart({
  data,
  min,
  max,
  midValue,
  ticks,
  ariaLabel,
  color = 'var(--primary)',
  formatTick,
}: {
  data: { label: string; value: number }[]
  min: number
  max: number
  midValue?: number
  ticks: number[]
  ariaLabel: string
  color?: string
  formatTick?: (v: number) => string
}) {
  const w = 320
  const h = 140
  const padRight = 12
  const padY = 18
  const plotX0 = 34
  const plotX1 = w - padRight
  const innerW = plotX1 - plotX0
  const innerH = h - padY * 2
  const range = max - min || 1
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0
  const y = (v: number) => padY + innerH - ((v - min) / range) * innerH
  const points = data.map((d, i) => ({ x: plotX0 + i * stepX, y: y(d.value), ...d }))
  const line = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${plotX0},${padY + innerH} ${line} ${plotX1},${padY + innerH}`
  const showMarkers = data.length <= 24
  const labelStep = Math.max(1, Math.ceil(data.length / 6))
  const tickLabel = formatTick ?? ((v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1)))

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={ariaLabel}>
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={plotX0}
            x2={plotX1}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray={midValue !== undefined && v === midValue ? '0' : '3 4'}
            opacity={midValue !== undefined && v === midValue ? 0.7 : 0.4}
          />
          <text x={plotX0 - 6} y={y(v)} dy={3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
            {tickLabel(v)}
          </text>
        </g>
      ))}
      <polygon points={area} fill={color} opacity={0.1} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          {showMarkers && (
            <circle cx={p.x} cy={p.y} r={4} fill="var(--card)" stroke={color} strokeWidth={2.5} />
          )}
          {i % labelStep === 0 && (
            <text x={p.x} y={h - 2} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export function CompareChart({
  seriesA,
  seriesB,
  ariaLabel,
}: {
  seriesA: { key: ReportMetricKey; data: { label: string; norm: number }[] }
  seriesB: { key: ReportMetricKey; data: { label: string; norm: number }[] }
  ariaLabel: string
}) {
  const w = 320
  const h = 140
  const padRight = 12
  const padY = 18
  const plotX0 = 30
  const plotX1 = w - padRight
  const innerW = plotX1 - plotX0
  const innerH = h - padY * 2
  const data = seriesA.data
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0
  const y = (v: number) => padY + innerH - v * innerH
  const buildPoints = (series: { data: { label: string; norm: number }[] }) =>
    series.data.map((d, i) => ({ x: plotX0 + i * stepX, y: y(d.norm), label: d.label }))
  const pointsA = buildPoints(seriesA)
  const pointsB = buildPoints(seriesB)
  const showMarkers = data.length <= 24
  const labelStep = Math.max(1, Math.ceil(data.length / 6))
  const colorA = METRIC_META[seriesA.key].color
  const colorB = METRIC_META[seriesB.key].color

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={ariaLabel}>
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line
            x1={plotX0}
            x2={plotX1}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.4}
          />
          <text x={plotX0 - 6} y={y(v)} dy={3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
            {Math.round(v * 100)}%
          </text>
        </g>
      ))}
      {[
        { points: pointsA, color: colorA },
        { points: pointsB, color: colorB },
      ].map(({ points, color }, si) => (
        <polyline
          key={si}
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {pointsA.map(
        (p, i) =>
          showMarkers && (
            <circle key={`a-${i}`} cx={p.x} cy={p.y} r={3.5} fill="var(--card)" stroke={colorA} strokeWidth={2} />
          ),
      )}
      {pointsB.map(
        (p, i) =>
          showMarkers && (
            <circle key={`b-${i}`} cx={p.x} cy={p.y} r={3.5} fill="var(--card)" stroke={colorB} strokeWidth={2} />
          ),
      )}
      {pointsA.map(
        (p, i) =>
          i % labelStep === 0 && (
            <text
              key={`l-${i}`}
              x={p.x}
              y={h - 2}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {p.label}
            </text>
          ),
      )}
    </svg>
  )
}

/** Entity colors for patient-vs-guardian overlays (validated blue/orange palette pair). */
export const ENTITY_COLORS = {
  patient: 'light-dark(#2a78d6, #3987e5)',
  guardian: 'light-dark(#eb6834, #d95926)',
} as const

/**
 * Two series of the SAME metric on one real-valued axis (no normalization),
 * with the band between the lines shaded to make the gap readable.
 * Days where one side has no value produce a line break (null in values).
 */
export function DualSeriesChart({
  labels,
  seriesA,
  seriesB,
  min,
  max,
  ticks,
  ariaLabel,
  colorA,
  colorB,
  formatTick,
}: {
  labels: string[]
  seriesA: (number | null)[]
  seriesB: (number | null)[]
  min: number
  max: number
  ticks: number[]
  ariaLabel: string
  colorA: string
  colorB: string
  formatTick?: (v: number) => string
}) {
  const w = 320
  const h = 150
  const padRight = 12
  const padY = 18
  const plotX0 = 34
  const plotX1 = w - padRight
  const innerW = plotX1 - plotX0
  const innerH = h - padY * 2
  const range = max - min || 1
  const n = labels.length
  const stepX = n > 1 ? innerW / (n - 1) : 0
  const x = (i: number) => plotX0 + i * stepX
  const y = (v: number) => padY + innerH - ((v - min) / range) * innerH
  const showMarkers = n <= 24
  const labelStep = Math.max(1, Math.ceil(n / 6))
  const tickLabel = formatTick ?? ((v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1)))

  // Split a nullable series into contiguous polyline segments.
  const segments = (values: (number | null)[]) => {
    const segs: { x: number; y: number; i: number }[][] = []
    let cur: { x: number; y: number; i: number }[] = []
    values.forEach((v, i) => {
      if (v === null) {
        if (cur.length > 0) segs.push(cur)
        cur = []
      } else {
        cur.push({ x: x(i), y: y(v), i })
      }
    })
    if (cur.length > 0) segs.push(cur)
    return segs
  }
  const segsA = segments(seriesA)
  const segsB = segments(seriesB)

  // Shaded band between the lines over stretches where both sides have data.
  const bands: string[] = []
  let band: { i: number; a: number; b: number }[] = []
  const flushBand = () => {
    if (band.length >= 2) {
      const top = band.map((p) => `${x(p.i)},${y(p.a)}`)
      const bottom = [...band].reverse().map((p) => `${x(p.i)},${y(p.b)}`)
      bands.push([...top, ...bottom].join(' '))
    }
    band = []
  }
  labels.forEach((_, i) => {
    const a = seriesA[i]
    const b = seriesB[i]
    if (a !== null && b !== null) band.push({ i, a, b })
    else flushBand()
  })
  flushBand()

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={ariaLabel}>
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={plotX0}
            x2={plotX1}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.4}
          />
          <text x={plotX0 - 6} y={y(v)} dy={3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
            {tickLabel(v)}
          </text>
        </g>
      ))}
      {bands.map((pts, i) => (
        <polygon key={`band-${i}`} points={pts} fill={colorA} opacity={0.08} />
      ))}
      {[
        { segs: segsA, color: colorA },
        { segs: segsB, color: colorB },
      ].map(({ segs, color }, si) =>
        segs.map((seg, gi) =>
          seg.length === 1 ? null : (
            <polyline
              key={`${si}-${gi}`}
              points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        ),
      )}
      {showMarkers &&
        [
          { segs: segsA, color: colorA },
          { segs: segsB, color: colorB },
        ].map(({ segs, color }, si) =>
          segs.flat().map((p) => (
            <circle key={`m-${si}-${p.i}`} cx={p.x} cy={p.y} r={3.5} fill="var(--card)" stroke={color} strokeWidth={2} />
          )),
        )}
      {labels.map(
        (label, i) =>
          i % labelStep === 0 && (
            <text key={`l-${i}`} x={x(i)} y={h - 2} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
              {label}
            </text>
          ),
      )}
    </svg>
  )
}

export function MetricChip({
  active,
  color,
  icon,
  label,
  onClick,
}: {
  active: boolean
  color: string
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={
        active
          ? { borderColor: color, backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)` }
          : undefined
      }
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-[0.97]',
        active
          ? 'text-foreground shadow-sm'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      <span className="flex size-3.5 items-center justify-center" style={active ? { color } : undefined}>
        {icon}
      </span>
      {label}
    </button>
  )
}
