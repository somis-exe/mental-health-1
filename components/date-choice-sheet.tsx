'use client'

import { useState } from 'react'
import { CalendarDays, CalendarClock, CalendarPlus, X } from 'lucide-react'
import { offsetDayISO, isoFromDateInput, toDateInputValue } from '@/lib/health'
import { cn } from '@/lib/utils'

export function DateChoiceSheet({
  onSelect,
  onClose,
}: {
  onSelect: (iso: string) => void
  onClose: () => void
}) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [customDate, setCustomDate] = useState(toDateInputValue(new Date().toISOString()))
  const maxDate = toDateInputValue(new Date().toISOString())

  const options = [
    {
      key: 'today',
      label: '今日',
      desc: '今日の体調を記録',
      icon: <CalendarDays className="size-5" />,
      onClick: () => onSelect(offsetDayISO(0)),
    },
    {
      key: 'yesterday',
      label: '昨日',
      desc: '昨日の体調を記録',
      icon: <CalendarClock className="size-5" />,
      onClick: () => onSelect(offsetDayISO(-1)),
    },
    {
      key: 'other',
      label: '他の日',
      desc: 'カレンダーから日付を選ぶ',
      icon: <CalendarPlus className="size-5" />,
      onClick: () => setShowCalendar(true),
    },
  ]

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/30 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mx-auto w-full max-w-md animate-in slide-in-from-bottom-4 rounded-t-3xl border border-border bg-background p-5 pb-8 shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground">いつの体調を記録しますか？</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        {!showCalendar ? (
          <div className="flex flex-col gap-2.5">
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={o.onClick}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-muted active:scale-[0.99]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {o.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-foreground">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.desc}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-foreground">
                記録する日を選ぶ
              </span>
              <input
                type="date"
                value={customDate}
                max={maxDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCalendar(false)}
                className="flex-1 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold text-muted-foreground transition-all hover:bg-muted active:scale-[0.99]"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => customDate && onSelect(isoFromDateInput(customDate))}
                className={cn(
                  'flex-[2] rounded-2xl py-3.5 text-sm font-bold text-primary-foreground transition-all active:scale-[0.99]',
                  'bg-primary hover:bg-primary/90',
                )}
              >
                この日を記録する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
