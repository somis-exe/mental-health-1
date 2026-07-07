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
import { formatRangeLabel, generateTalkingPoints, type Profile, type DailyRecord } from '@/lib/health'
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

function MoodLineChart({ data }: { data: { label: string; mood: number }[] }) {
  const w = 320
  const h = 140
  const padX = 16
  const padY = 18
  const innerW = w - padX * 2
  const innerH = h - padY * 2
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0
  const y = (v: number) => padY + innerH - ((v - 1) / 4) * innerH
  const points = data.map((d, i) => ({ x: padX + i * stepX, y: y(d.mood), ...d }))
  const line = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${padX},${padY + innerH} ${line} ${padX + innerW},${padY + innerH}`
  const showMarkers = data.length <= 14
  const labelStep = Math.max(1, Math.ceil(data.length / 6))

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="気分の推移グラフ">
      {[1, 2, 3, 4, 5].map((v) => (
        <line
          key={v}
          x1={padX}
          x2={padX + innerW}
          y1={y(v)}
          y2={y(v)}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray={v === 3 ? '0' : '3 4'}
          opacity={v === 3 ? 0.7 : 0.4}
        />
      ))}
      <polygon points={area} fill="var(--primary)" opacity={0.1} />
      <polyline
        points={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          {showMarkers && (
            <circle cx={p.x} cy={p.y} r={4} fill="var(--card)" stroke="var(--primary)" strokeWidth={2.5} />
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
  const [supportTab, setSupportTab] = useState<'simple' | 'ai'>('simple')
  const [aiPoints, setAiPoints] = useState<string[] | null>(null)
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

  const avgMood = average(filtered.map((r) => r.mood))
  const avgSleep = average(filtered.map((r) => r.sleepHours))

  const chartData = filtered.map((r) => ({ label: formatRangeLabel(r.date), mood: r.mood }))

  const talkingPoints = useMemo(() => generateTalkingPoints(filtered), [filtered])

  const aiRequestSignature = useMemo(
    () =>
      JSON.stringify(
        filtered.map((r) => [
          r.date,
          r.mood,
          r.symptoms,
          r.sleepHours,
          r.sleepOnset,
          r.nightWaking,
          r.appetite,
          r.exercise,
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
      setAiPoints(data.points as string[])
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

  const questionnaireText = useMemo(() => {
    const age = new Date().getFullYear() - Number(profile.birthYear || '1995')
    const topSymptoms = symptomCounts
      .slice(0, 3)
      .map(([s, c]) => `${s}（${c}回）`)
      .join('、')
    return [
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
    ].join('\n')
  }, [profile, rangeLabel, filtered.length, avgMood, avgSleep, symptomCounts])

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
            {chartData.length >= 2 ? (
              <MoodLineChart data={chartData} />
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
                  記録の選択項目とメモをもとに、Gemini（Google AI）がポイントをまとめます。
                </p>

                {aiPoints && !isAiStale && (
                  <ul className="mb-3 flex flex-col gap-3">
                    {aiPoints.map((t, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/85">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        {t}
                      </li>
                    ))}
                  </ul>
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
