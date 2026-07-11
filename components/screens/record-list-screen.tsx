'use client'

import { Plus, Moon, NotebookPen, Pill, Pencil, Droplets } from 'lucide-react'
import { averageMood, dayMoodEntries, formatRecordDate, moodMeta, type DailyRecord } from '@/lib/health'

const SLOT_LABELS = { morning: '朝', noon: '昼', night: '夜' } as const

export function RecordCard({ record, onEdit }: { record: DailyRecord; onEdit?: () => void }) {
  const rep = averageMood(record)
  const meta = moodMeta(rep ?? 3)
  const entries = dayMoodEntries(record)
  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/[0.02]">
      <div className="flex items-center gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: `color-mix(in oklch, ${meta.color} 14%, transparent)` }}
          aria-hidden
        >
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-bold text-foreground">
              {formatRecordDate(record.date)}
            </p>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: meta.color }}>
                {meta.label}
              </span>
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label="この記録を編集"
                  className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </span>
          </div>
          {entries.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
              {entries.map(({ slot, value }) => (
                <span key={slot} className="flex items-center gap-1">
                  {SLOT_LABELS[slot]}
                  <span className="text-sm leading-none">{moodMeta(value).emoji}</span>
                </span>
              ))}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
            {record.sleepHours !== null && (
              <span className="flex items-center gap-1">
                <Moon className="size-3.5" />
                {record.sleepHours}時間
              </span>
            )}
            {record.medication && (
              <span className="flex items-center gap-1">
                <Pill className="size-3.5" />
                服薬あり
              </span>
            )}
            {record.period && (
              <span className="flex items-center gap-1">
                <Droplets className="size-3.5" />
                生理
              </span>
            )}
          </div>
        </div>
      </div>

      {record.symptoms.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {record.symptoms.map((s) => (
            <span
              key={s}
              className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {record.memo && (
        <p className="mt-3 line-clamp-2 rounded-2xl bg-muted/60 px-3 py-2 text-[13px] leading-relaxed text-foreground/80">
          {record.memo}
        </p>
      )}
    </article>
  )
}

export function RecordListScreen({
  records,
  onNew,
  onEdit,
  mode = 'self',
}: {
  records: DailyRecord[]
  onNew: () => void
  onEdit: (record: DailyRecord) => void
  mode?: 'self' | 'guardian'
}) {
  const isGuardian = mode === 'guardian'
  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <div className="flex flex-col gap-4 px-5 pb-8 pt-4">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">
          {isGuardian ? 'みまもり記録の一覧' : '体調記録の一覧'}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {isGuardian
            ? '保護者から見た本人の様子の記録です。右下のボタンから今日の記録を追加しましょう。'
            : 'これまでの記録を振り返れます。右下のボタンから今日の記録を追加しましょう。'}
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <NotebookPen className="size-7" />
          </span>
          <p className="text-sm font-semibold text-foreground">まだ記録がありません</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            右下の「＋」ボタンから、今日の体調を記録してみましょう。
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((r) => (
            <RecordCard key={r.date} record={r} onEdit={() => onEdit(r)} />
          ))}
        </div>
      )}

      {/* Floating add button */}
      <button
        type="button"
        onClick={onNew}
        aria-label="今日の記録を追加"
        className="fixed bottom-24 right-1/2 z-30 flex size-15 translate-x-[calc(min(50vw,14rem)-2rem)] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-95"
      >
        <Plus className="size-7" strokeWidth={2.5} />
      </button>
    </div>
  )
}
