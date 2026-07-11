'use client'

import { useMemo, useState } from 'react'
import {
  TrendingUp,
  Moon,
  Smile,
  ClipboardList,
  Copy,
  Check,
  FileDown,
  Stethoscope,
  CalendarRange,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Section } from '@/components/ui-kit'
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
  generateTalkingPoints,
  metricDayValue,
  periodTrackingEnabled,
  type Profile,
  type DailyRecord,
  type MoodSlot,
  type ReportMetricKey,
} from '@/lib/health'
import { cn } from '@/lib/utils'

const RANGES = ['過去1週間', '過去1ヶ月', '過去3ヶ月', '期間を指定'] as const
type Range = (typeof RANGES)[number]

const RANGE_DAYS: Record<Exclude<Range, '期間を指定'>, number> = {
  過去1週間: 7,
  過去1ヶ月: 30,
  過去3ヶ月: 90,
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function formatRange(from: string, to: string): string {
  const f = new Date(from)
  const t = new Date(to)
  return `${f.getMonth() + 1}/${f.getDate()} 〜 ${t.getMonth() + 1}/${t.getDate()}`
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

const SLOT_LABEL: Record<MoodSlot, string> = { morning: '朝', noon: '昼', night: '夜' }

type AiPoint = { date: string | null; text: string }

/** "YYYY-MM-DD" -> "M/D" without going through Date parsing (avoids timezone shifts). */
function formatAiDateLabel(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(m)}/${Number(d)}`
}

function Highlight({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-background p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-rounded text-2xl font-extrabold text-foreground">
        {value}
        <span className="ml-0.5 text-sm font-semibold text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

export function ReportScreen({ profile, records }: { profile: Profile; records: DailyRecord[] }) {
  const [range, setRange] = useState<Range>('過去1週間')
  const [fromDate, setFromDate] = useState(isoDaysAgo(14))
  const [toDate, setToDate] = useState(isoDaysAgo(0))
  const [copied, setCopied] = useState(false)
  const [selectedMetrics, setSelectedMetrics] = useState<ReportMetricKey[]>(['mood'])
  const [supportTab, setSupportTab] = useState<'simple' | 'ai'>('simple')
  const [aiPoints, setAiPoints] = useState<AiPoint[] | null>(null)
  const [aiRequestKey, setAiRequestKey] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const rangeLabel = range === '期間を指定' ? formatRange(fromDate, toDate) : range

  const filtered = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date
    if (range === '期間を指定') {
      start = new Date(fromDate)
      start.setHours(0, 0, 0, 0)
      end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
    } else {
      start = new Date(now)
      start.setDate(start.getDate() - RANGE_DAYS[range])
      start.setHours(0, 0, 0, 0)
      end = now
    }
    return records
      .filter((r) => {
        const t = new Date(r.date).getTime()
        return t >= start.getTime() && t <= end.getTime()
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [records, range, fromDate, toDate])

  const avgMood = average(filtered.flatMap((r) => dayMoodEntries(r).map((e) => e.value)))
  const avgSleep = average(
    filtered.map((r) => r.sleepHours).filter((h): h is number => h !== null),
  )

  const moodChartData = filtered.flatMap((r) =>
    dayMoodEntries(r).map(({ slot, value }) => ({
      label: `${formatRangeLabel(r.date)}${SLOT_LABEL[slot]}`,
      value,
    })),
  )

  const sleepChartData = filtered
    .filter((r): r is DailyRecord & { sleepHours: number } => r.sleepHours !== null)
    .map((r) => ({
      label: formatRangeLabel(r.date),
      value: r.sleepHours,
    }))
  const sleepDomainMax = Math.ceil(Math.max(8, ...sleepChartData.map((d) => d.value)) / 2) * 2
  const sleepTicks = Array.from({ length: sleepDomainMax / 2 + 1 }, (_, i) => i * 2)

  const rangeOf = (key: ReportMetricKey) => metricRange(key, sleepDomainMax)

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
  }, [compareRows, selectedMetrics, sleepDomainMax])

  const talkingPoints = useMemo(() => generateTalkingPoints(filtered), [filtered])

  const aiRequestSignature = useMemo(
    () =>
      JSON.stringify(
        filtered.map((r) => [
          r.date,
          r.moodMorning,
          r.moodNoon,
          r.moodNight,
          r.symptoms,
          r.sleepHours,
          r.sleepOnset,
          r.nightWaking,
          r.appetite,
          r.exercise,
          r.suicidalIdeation,
          r.selfHarm,
          r.period,
          r.memo,
        ]),
      ),
    [filtered],
  )

  const isAiStale = aiRequestKey !== aiRequestSignature

  const handleGenerateAiSummary = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/talking-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: filtered, rangeLabel }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error ?? 'AI要約の生成に失敗しました。')
      }
      setAiPoints(data.points as AiPoint[])
      setAiRequestKey(aiRequestSignature)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI要約の生成に失敗しました。')
    } finally {
      setAiLoading(false)
    }
  }

  const symptomCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of filtered) {
      for (const s of r.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [filtered])

  // Keep the chip for users with past period data even if they later turned tracking off.
  const showPeriodMetric = periodTrackingEnabled(profile) || records.some((r) => r.period !== null)
  const visibleMetrics = showPeriodMetric ? METRIC_ORDER : METRIC_ORDER.filter((k) => k !== 'period')

  const suicidalIdeationDays = useMemo(
    () => filtered.filter((r) => r.suicidalIdeation === true).length,
    [filtered],
  )
  const selfHarmDays = useMemo(() => filtered.filter((r) => r.selfHarm === true).length, [filtered])

  const questionnaireText = useMemo(() => {
    const age = new Date().getFullYear() - Number(profile.birthYear || '1995')
    const topSymptoms = symptomCounts
      .slice(0, 3)
      .map(([s, c]) => `${s}（${c}回）`)
      .join('、')
    const lines = [
      `【基本情報】`,
      `ニックネーム：${profile.nickname || '（未設定）'}`,
      `年齢：約${age}歳 / 性別：${profile.gender || '未回答'}`,
      ``,
      `【対象期間】${rangeLabel}`,
      `【記録日数】${filtered.length}日`,
      ``,
      `【気分の平均スコア】${avgMood !== null ? avgMood.toFixed(1) : '—'} / 5.0`,
      `【平均睡眠時間】${avgSleep !== null ? avgSleep.toFixed(1) : '—'} 時間`,
      `【よく見られた症状】${topSymptoms || 'なし'}`,
    ]
    if (suicidalIdeationDays > 0 || selfHarmDays > 0) {
      lines.push(``, `【安全に関わる記録】`)
      if (suicidalIdeationDays > 0) lines.push(`希死念慮の記録：${suicidalIdeationDays}日`)
      if (selfHarmDays > 0) lines.push(`自傷行為の記録：${selfHarmDays}日`)
    }
    const periodDays = filtered.filter((r) => r.period === true).length
    if (periodDays > 0) {
      lines.push(``, `【生理のあった日】${periodDays}日`)
    }
    return lines.join('\n')
  }, [profile, rangeLabel, filtered, avgMood, avgSleep, symptomCounts, suicidalIdeationDays, selfHarmDays])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(questionnaireText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-4">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">体調記録レポート</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          受診や問診票の記入にお役立てください。
        </p>
      </div>

      {/* Range tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              'flex items-center justify-center gap-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all',
              range === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {r === '期間を指定' && <CalendarRange className="size-4" />}
            {r}
          </button>
        ))}
      </div>

      {/* Custom date range pickers */}
      {range === '期間を指定' && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/[0.02]">
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                開始日
              </span>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <span className="pb-3 text-sm font-bold text-muted-foreground">〜</span>
            <label className="flex-1">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                終了日
              </span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={isoDaysAgo(0)}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
            <CalendarRange className="size-3.5" />
            {formatRange(fromDate, toDate)} の記録を表示中
          </p>
        </div>
      )}

      {/* Summary */}
      <Section title="体調の推移" icon={<TrendingUp className="size-4.5 text-primary" />}>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            この期間の記録はまだありません。
          </p>
        ) : (
          <>
            <div className="mb-4 flex gap-3">
              <Highlight
                icon={<Smile className="size-3.5" />}
                label="気分の平均"
                value={avgMood !== null ? avgMood.toFixed(1) : '—'}
                unit="/ 5"
              />
              <Highlight
                icon={<Moon className="size-3.5" />}
                label="平均睡眠"
                value={avgSleep !== null ? avgSleep.toFixed(1) : '—'}
                unit="時間"
              />
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
                    縦軸は各項目をその記録範囲内での割合（0〜100%）に揃えて表示しています。実際の値は下の平均を参考にしてください。
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
                      <div key={key} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
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

      {/* Doctor talking points */}
      <Section
        title="診察室で話す内容のサポート"
        icon={<Stethoscope className="size-4.5 text-primary" />}
      >
        {filtered.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            この期間の記録がまだないため、ポイントをまとめられません。まずは体調記録をつけてみましょう。
          </p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setSupportTab('simple')}
                className={cn(
                  'rounded-xl py-2 text-[13px] font-semibold transition-all',
                  supportTab === 'simple' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                かんたん要約
              </button>
              <button
                type="button"
                onClick={() => setSupportTab('ai')}
                className={cn(
                  'flex items-center justify-center gap-1 rounded-xl py-2 text-[13px] font-semibold transition-all',
                  supportTab === 'ai' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                <Sparkles className="size-3.5" />
                AI要約
              </button>
            </div>

            {supportTab === 'simple' && (
              <ul className="flex flex-col gap-3">
                {talkingPoints.map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/85">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            )}

            {supportTab === 'ai' && (
              <div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  記録の選択項目とメモをもとに、Gemini（Google AI）が対象期間の時系列でポイントをまとめます。
                </p>

                {aiPoints && !isAiStale && (
                  <ol className="mb-3 flex flex-col gap-3 border-l-2 border-primary/20 pl-4">
                    {aiPoints.map((p, i) => (
                      <li key={i} className="relative text-sm leading-relaxed text-foreground/85">
                        <span className="absolute top-1.5 -left-[21px] size-2.5 shrink-0 rounded-full border-2 border-primary bg-card" />
                        {p.date && (
                          <span className="mr-1.5 font-semibold text-primary">
                            {formatAiDateLabel(p.date)}
                          </span>
                        )}
                        {p.text}
                      </li>
                    ))}
                  </ol>
                )}

                {aiError && <p className="mb-3 text-sm text-destructive">{aiError}</p>}

                <button
                  type="button"
                  onClick={handleGenerateAiSummary}
                  disabled={aiLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 py-3 text-sm font-bold text-primary transition-all hover:bg-primary/15 active:scale-[0.99] disabled:opacity-60"
                >
                  {aiLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {aiLoading
                    ? '生成中…'
                    : aiPoints && !isAiStale
                      ? 'この内容で再生成する'
                      : 'AIで要約する'}
                </button>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Questionnaire support */}
      <Section
        title="問診票入力サポート"
        icon={<ClipboardList className="size-4.5 text-primary" />}
      >
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          下のテキストはそのままコピーして、問診票やメモにご利用いただけます。
        </p>
        <pre className="max-h-64 overflow-auto rounded-2xl border border-border bg-background p-4 text-[13px] leading-relaxed text-foreground/85 whitespace-pre-wrap font-sans">
          {questionnaireText}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 py-3 text-sm font-bold text-primary transition-all hover:bg-primary/15 active:scale-[0.99]"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'コピーしました' : 'テキストをコピー'}
        </button>
      </Section>

      <button
        type="button"
        className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99]"
      >
        <FileDown className="size-5" />
        このレポートをPDFで出力
      </button>
    </div>
  )
}
