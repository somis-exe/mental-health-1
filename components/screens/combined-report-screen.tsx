'use client'

import { useMemo, useState } from 'react'
import { Users, Link2, TrendingUp, NotebookPen } from 'lucide-react'
import { Section } from '@/components/ui-kit'
import {
  METRIC_ORDER,
  METRIC_META,
  metricRange,
  MetricChip,
  DualSeriesChart,
  ENTITY_COLORS,
} from '@/components/trend-charts'
import {
  dayKey,
  formatRangeLabel,
  formatRecordDate,
  metricDayValue,
  type DailyRecord,
  type ReportMetricKey,
} from '@/lib/health'
import { type LinkedPatient } from '@/lib/links'
import { cn } from '@/lib/utils'

const RANGES = ['過去1週間', '過去1ヶ月', '過去3ヶ月'] as const
type Range = (typeof RANGES)[number]
const RANGE_DAYS: Record<Range, number> = { 過去1週間: 7, 過去1ヶ月: 30, 過去3ヶ月: 90 }

// 総合レポートは日単位比較なので、時間帯別の気分は日平均に集約される
const COMBINED_METRICS = METRIC_ORDER.filter((k) => k !== 'period')

function average(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

/** 保護者向け: 本人の記録と保護者から見た記録を同一項目で重ね、差を可視化する。 */
export function CombinedReportScreen({
  patient,
  patientRecords,
  guardianRecords,
}: {
  patient: LinkedPatient | null
  patientRecords: DailyRecord[]
  guardianRecords: DailyRecord[]
}) {
  const [range, setRange] = useState<Range>('過去1週間')
  const [metric, setMetric] = useState<ReportMetricKey>('mood')

  const meta = METRIC_META[metric]

  const rows = useMemo(() => {
    const start = new Date()
    start.setDate(start.getDate() - RANGE_DAYS[range])
    start.setHours(0, 0, 0, 0)
    const inRange = (r: DailyRecord) => new Date(r.date).getTime() >= start.getTime()

    const byDay = new Map<string, { date: string; patient: number | null; guardian: number | null }>()
    const put = (r: DailyRecord, side: 'patient' | 'guardian') => {
      const key = dayKey(r.date)
      const entry = byDay.get(key) ?? { date: r.date, patient: null, guardian: null }
      entry[side] = metricDayValue(metric, r)
      byDay.set(key, entry)
    }
    patientRecords.filter(inRange).forEach((r) => put(r, 'patient'))
    guardianRecords.filter(inRange).forEach((r) => put(r, 'guardian'))

    return [...byDay.entries()]
      .filter(([, v]) => v.patient !== null || v.guardian !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  }, [patientRecords, guardianRecords, range, metric])

  const sleepDomainMax =
    Math.ceil(
      Math.max(8, ...rows.flatMap((r) => [r.patient ?? 0, r.guardian ?? 0])) / 2,
    ) * 2
  const { min, max } = metricRange(metric, sleepDomainMax)
  const ticks =
    metric === 'sleep'
      ? Array.from({ length: sleepDomainMax / 2 + 1 }, (_, i) => i * 2)
      : METRIC_META[metric].ticks

  const avgPatient = average(rows.map((r) => r.patient).filter((v): v is number => v !== null))
  const avgGuardian = average(rows.map((r) => r.guardian).filter((v): v is number => v !== null))

  const gapDays = useMemo(
    () =>
      rows
        .filter((r): r is typeof r & { patient: number; guardian: number } => r.patient !== null && r.guardian !== null)
        .map((r) => ({ ...r, gap: Math.abs(r.patient - r.guardian) }))
        .filter((r) => r.gap > 0)
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 3),
    [rows],
  )

  const bothCount = rows.filter((r) => r.patient !== null && r.guardian !== null).length

  if (!patient) {
    return (
      <div className="flex flex-col gap-4 px-5 pb-8 pt-4">
        <h1 className="text-xl font-extrabold text-foreground">総合レポート</h1>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Link2 className="size-7" />
          </span>
          <p className="text-sm font-semibold text-foreground">まだ本人と連携していません</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            「基本情報」タブから連携コードを入力すると、総合レポートが見られるようになります。
          </p>
        </div>
      </div>
    )
  }

  const patientName = patient.nickname || '本人'

  return (
    <div className="flex flex-col gap-4 px-5 pb-8 pt-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-foreground">
          <Users className="size-5 text-primary" />
          総合レポート
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {patientName}さんの記録と、保護者から見た記録を重ねて比べられます。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              'rounded-xl py-2.5 text-[13px] font-semibold transition-all',
              range === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <Section title="本人と保護者の記録の比較" icon={<TrendingUp className="size-4.5 text-primary" />}>
        <div className="mb-3 flex flex-wrap gap-2">
          {COMBINED_METRICS.map((key) => (
            <MetricChip
              key={key}
              active={metric === key}
              color={METRIC_META[key].color}
              icon={METRIC_META[key].icon}
              label={METRIC_META[key].label}
              onClick={() => setMetric(key)}
            />
          ))}
        </div>

        {rows.length < 2 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            グラフ表示には、この期間に「{meta.label}」の記録が2日分以上必要です。
          </p>
        ) : (
          <>
            <DualSeriesChart
              labels={rows.map((r) => formatRangeLabel(r.date))}
              seriesA={rows.map((r) => r.patient)}
              seriesB={rows.map((r) => r.guardian)}
              min={min}
              max={max}
              ticks={ticks}
              ariaLabel={`${meta.label}の本人と保護者の比較グラフ`}
              colorA={ENTITY_COLORS.patient}
              colorB={ENTITY_COLORS.guardian}
              formatTick={metric === 'sleep' ? undefined : meta.format}
            />
            <div className="mt-3 flex flex-wrap gap-4">
              {(
                [
                  [`${patientName}さん`, avgPatient, ENTITY_COLORS.patient],
                  ['保護者から見て', avgGuardian, ENTITY_COLORS.guardian],
                ] as const
              ).map(([label, avg, color]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                  <span className="font-semibold text-foreground">
                    {avg !== null ? meta.format(avg) : '—'}
                  </span>
                </div>
              ))}
            </div>
            {bothCount === 0 && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                同じ日に両方の記録がある日がまだありません。両方の記録が揃うと差が比べられます。
              </p>
            )}
          </>
        )}
      </Section>

      {gapDays.length > 0 && (
        <Section title="見え方の差が大きかった日" icon={<NotebookPen className="size-4.5 text-primary" />}>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            本人の記録と保護者から見た記録の差が大きかった日です。話し合いや受診時の話題の参考にどうぞ。
          </p>
          <div className="flex flex-col gap-2">
            {gapDays.map((d) => (
              <div key={d.date} className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="mb-1 text-sm font-bold text-foreground">{formatRecordDate(d.date)}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ENTITY_COLORS.patient }}
                    />
                    {patientName}さん: <span className="font-semibold text-foreground">{meta.format(d.patient)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ENTITY_COLORS.guardian }}
                    />
                    保護者: <span className="font-semibold text-foreground">{meta.format(d.guardian)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
