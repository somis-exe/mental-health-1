'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, ListChecks, Link2, UserRound, Smile, Moon } from 'lucide-react'
import { Section } from '@/components/ui-kit'
import { RecordCard } from '@/components/screens/record-list-screen'
import {
  METRIC_ORDER,
  METRIC_META,
  metricRange,
  TrendChart,
  CompareChart,
  MetricChip,
} from '@/components/trend-charts'
import {
  dayMoodEntries,
  formatRangeLabel,
  metricDayValue,
  type DailyRecord,
  type MoodSlot,
  type ReportMetricKey,
} from '@/lib/health'
import { type LinkedPatient } from '@/lib/links'
import { cn } from '@/lib/utils'

const RANGES = ['過去1週間', '過去1ヶ月', '過去3ヶ月'] as const
type Range = (typeof RANGES)[number]
const RANGE_DAYS: Record<Range, number> = { 過去1週間: 7, 過去1ヶ月: 30, 過去3ヶ月: 90 }

const SLOT_LABEL: Record<MoodSlot, string> = { morning: '朝', noon: '昼', night: '夜' }

function average(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

/** 保護者向け: 連携中の本人の記録（メモ・希死念慮・自傷を除く）の一覧と推移。 */
export function PatientRecordsScreen({
  patient,
  records,
}: {
  patient: LinkedPatient | null
  records: DailyRecord[]
}) {
  const [view, setView] = useState<'list' | 'trend'>('list')
  const [range, setRange] = useState<Range>('過去1週間')
  const [selectedMetrics, setSelectedMetrics] = useState<ReportMetricKey[]>(['mood'])

  const sorted = useMemo(
    () => [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [records],
  )

  const filtered = useMemo(() => {
    const start = new Date()
    start.setDate(start.getDate() - RANGE_DAYS[range])
    start.setHours(0, 0, 0, 0)
    return [...records]
      .filter((r) => new Date(r.date).getTime() >= start.getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [records, range])

  const avgMood = average(filtered.flatMap((r) => dayMoodEntries(r).map((e) => e.value)))
  const avgSleep = average(filtered.map((r) => r.sleepHours).filter((h): h is number => h !== null))

  const moodChartData = filtered.flatMap((r) =>
    dayMoodEntries(r).map(({ slot, value }) => ({
      label: `${formatRangeLabel(r.date)}${SLOT_LABEL[slot]}`,
      value,
    })),
  )
  const sleepChartData = filtered
    .filter((r): r is DailyRecord & { sleepHours: number } => r.sleepHours !== null)
    .map((r) => ({ label: formatRangeLabel(r.date), value: r.sleepHours }))
  const sleepDomainMax = Math.ceil(Math.max(8, ...sleepChartData.map((d) => d.value)) / 2) * 2
  const sleepTicks = Array.from({ length: sleepDomainMax / 2 + 1 }, (_, i) => i * 2)
  const rangeOf = (key: ReportMetricKey) => metricRange(key, sleepDomainMax)

  const showPeriodMetric = records.some((r) => r.period !== null)
  const visibleMetrics = showPeriodMetric ? METRIC_ORDER : METRIC_ORDER.filter((k) => k !== 'period')

  const toggleMetric = (key: ReportMetricKey) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) return prev.length === 1 ? prev : prev.filter((k) => k !== key)
      if (prev.length >= 2) return [prev[1], key]
      return [...prev, key]
    })
  }

  const singleKey = selectedMetrics[0]
  const singleChartData = useMemo(() => {
    if (selectedMetrics.length !== 1) return []
    if (singleKey === 'mood') return moodChartData
    if (singleKey === 'sleep') return sleepChartData
    return filtered
      .map((r) => ({ label: formatRangeLabel(r.date), value: metricDayValue(singleKey, r) }))
      .filter((d): d is { label: string; value: number } => d.value !== null)
  }, [filtered, selectedMetrics, singleKey, moodChartData, sleepChartData])

  const compareRows = useMemo(() => {
    if (selectedMetrics.length !== 2) return null
    const [keyA, keyB] = selectedMetrics
    return filtered
      .map((r) => ({
        label: formatRangeLabel(r.date),
        a: metricDayValue(keyA, r),
        b: metricDayValue(keyB, r),
      }))
      .filter((r): r is { label: string; a: number; b: number } => r.a !== null && r.b !== null)
  }, [filtered, selectedMetrics])

  const compareSeries = useMemo(() => {
    if (!compareRows || selectedMetrics.length !== 2) return null
    const [keyA, keyB] = selectedMetrics
    const normalize = (v: number, key: ReportMetricKey) => {
      const { min, max } = rangeOf(key)
      return max > min ? (v - min) / (max - min) : 0.5
    }
    return {
      a: { key: keyA, data: compareRows.map((r) => ({ label: r.label, norm: normalize(r.a, keyA) })) },
      b: { key: keyB, data: compareRows.map((r) => ({ label: r.label, norm: normalize(r.b, keyB) })) },
      avgA: average(compareRows.map((r) => r.a)),
      avgB: average(compareRows.map((r) => r.b)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareRows, selectedMetrics, sleepDomainMax])

  if (!patient) {
    return (
      <div className="flex flex-col gap-4 px-5 pb-8 pt-4">
        <h1 className="text-xl font-extrabold text-foreground">本人の記録</h1>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Link2 className="size-7" />
          </span>
          <p className="text-sm font-semibold text-foreground">まだ本人と連携していません</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            「基本情報」タブから連携コードを入力すると、本人の記録が見られるようになります。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-5 pb-8 pt-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-foreground">
          <UserRound className="size-5 text-primary" />
          {patient.nickname || '本人'}さんの記録
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
        {(
          [
            ['list', '記録一覧', ListChecks],
            ['trend', '推移', TrendingUp],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition-all',
              view === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {view === 'list' &&
        (sorted.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">まだ記録がありません。</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((r) => (
              <RecordCard key={r.id ?? r.date} record={r} />
            ))}
          </div>
        ))}

      {view === 'trend' && (
        <>
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

          <Section title="体調の推移" icon={<TrendingUp className="size-4.5 text-primary" />}>
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                この期間の記録はまだありません。
              </p>
            ) : (
              <>
                <div className="mb-4 flex gap-3">
                  <div className="flex-1 rounded-2xl border border-border bg-background p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Smile className="size-3.5" />
                      気分の平均
                    </div>
                    <div className="font-rounded text-2xl font-extrabold text-foreground">
                      {avgMood !== null ? avgMood.toFixed(1) : '—'}
                      <span className="ml-0.5 text-sm font-semibold text-muted-foreground">/ 5</span>
                    </div>
                  </div>
                  <div className="flex-1 rounded-2xl border border-border bg-background p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Moon className="size-3.5" />
                      平均睡眠
                    </div>
                    <div className="font-rounded text-2xl font-extrabold text-foreground">
                      {avgSleep !== null ? avgSleep.toFixed(1) : '—'}
                      <span className="ml-0.5 text-sm font-semibold text-muted-foreground">時間</span>
                    </div>
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap gap-2">
                  {visibleMetrics.map((key) => (
                    <MetricChip
                      key={key}
                      active={selectedMetrics.includes(key)}
                      color={METRIC_META[key].color}
                      icon={METRIC_META[key].icon}
                      label={METRIC_META[key].label}
                      onClick={() => toggleMetric(key)}
                    />
                  ))}
                </div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  最大2つまで選択できます。2つ選ぶと重ねて比較できます。
                </p>
                {selectedMetrics.length === 2 && compareSeries ? (
                  compareRows && compareRows.length >= 2 ? (
                    <>
                      <p className="mb-1 text-[11px] leading-relaxed text-muted-foreground">
                        縦軸は各項目をその記録範囲内での割合（0〜100%）に揃えて表示しています。
                      </p>
                      <CompareChart
                        seriesA={compareSeries.a}
                        seriesB={compareSeries.b}
                        ariaLabel={`${METRIC_META[selectedMetrics[0]].label}と${METRIC_META[selectedMetrics[1]].label}の比較グラフ`}
                      />
                      <div className="mt-3 flex flex-wrap gap-4">
                        {(
                          [
                            [selectedMetrics[0], compareSeries.avgA],
                            [selectedMetrics[1], compareSeries.avgB],
                          ] as const
                        ).map(([key, avg]) => (
                          <div
                            key={key}
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                          >
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: METRIC_META[key].color }}
                            />
                            {METRIC_META[key].label}
                            <span className="font-semibold text-foreground">
                              {avg !== null ? METRIC_META[key].format(avg) : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">
                      この2項目が両方とも記録されている日が2日分以上必要です。
                    </p>
                  )
                ) : singleChartData.length >= 2 ? (
                  <TrendChart
                    data={singleChartData}
                    min={rangeOf(singleKey).min}
                    max={rangeOf(singleKey).max}
                    midValue={METRIC_META[singleKey].mid}
                    ticks={singleKey === 'sleep' ? sleepTicks : METRIC_META[singleKey].ticks}
                    ariaLabel={`${METRIC_META[singleKey].label}の推移グラフ`}
                    color={METRIC_META[singleKey].color}
                    formatTick={singleKey === 'sleep' ? undefined : METRIC_META[singleKey].format}
                  />
                ) : (
                  <p className="text-center text-xs text-muted-foreground">
                    グラフ表示には2日分以上の記録が必要です。
                  </p>
                )}
              </>
            )}
          </Section>
        </>
      )}
    </div>
  )
}
