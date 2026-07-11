'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Chip, FieldLabel } from '@/components/ui-kit'
import { CONCERNS, GENDERS, DEFAULT_PROFILE, type Profile } from '@/lib/health'
import { cn } from '@/lib/utils'

const YEARS = Array.from({ length: 90 }, (_, i) => String(new Date().getFullYear() - i))
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1))

function DateSelect({
  value,
  onChange,
  options,
  suffix,
  label,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  suffix: string
  label: string
}) {
  return (
    <div className="relative flex-1">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-2xl border border-border bg-card py-3.5 pl-4 pr-8 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
            {suffix}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        ▾
      </span>
    </div>
  )
}

export function OnboardingScreen({ onComplete }: { onComplete: (p: Profile) => void }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)

  const update = <K extends keyof Profile>(key: K, val: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: val }))

  const toggleConcern = (c: string) =>
    setProfile((p) => ({
      ...p,
      concerns: p.concerns.includes(c)
        ? p.concerns.filter((x) => x !== c)
        : [...p.concerns, c],
    }))

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 pb-2 pt-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          <Sparkles className="size-3.5" />
          はじめの設定
        </span>
        <h1 className="mt-3 text-pretty text-2xl font-extrabold leading-snug text-foreground">
          あなたのことを
          <br />
          少しだけ教えてください
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          入力した内容は、あとから変更できます。
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-7 px-6 pb-32 pt-6">
        <div>
          <FieldLabel>ニックネーム</FieldLabel>
          <input
            value={profile.nickname}
            onChange={(e) => update('nickname', e.target.value)}
            placeholder="例：はるちゃん"
            className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <FieldLabel>生年月日</FieldLabel>
          <div className="flex gap-2">
            <DateSelect
              label="年"
              value={profile.birthYear}
              onChange={(v) => update('birthYear', v)}
              options={YEARS}
              suffix="年"
            />
            <DateSelect
              label="月"
              value={profile.birthMonth}
              onChange={(v) => update('birthMonth', v)}
              options={MONTHS}
              suffix="月"
            />
            <DateSelect
              label="日"
              value={profile.birthDay}
              onChange={(v) => update('birthDay', v)}
              options={DAYS}
              suffix="日"
            />
          </div>
        </div>

        <div>
          <FieldLabel>性別</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => update('gender', g)}
                aria-pressed={profile.gender === g}
                className={cn(
                  'rounded-2xl border px-3 py-3.5 text-sm font-medium transition-all active:scale-[0.98]',
                  profile.gender === g
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {(profile.gender === '女性' || profile.gender === 'その他') && (
          <div>
            <FieldLabel>生理の記録</FieldLabel>
            <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
              オンにすると、体調記録の入力画面に生理の有無の項目が表示されます。あとから変更できます。
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  [true, '記録する'],
                  [false, '記録しない'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => update('trackPeriod', v)}
                  aria-pressed={profile.trackPeriod === v}
                  className={cn(
                    'rounded-2xl border px-3 py-3.5 text-sm font-medium transition-all active:scale-[0.98]',
                    profile.trackPeriod === v
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <FieldLabel>いま気になっていること（複数選択可）</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {CONCERNS.map((c) => (
              <Chip key={c} active={profile.concerns.includes(c)} onClick={() => toggleConcern(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>自由記述</FieldLabel>
          <textarea
            value={profile.freeNote}
            onChange={(e) => update('freeNote', e.target.value)}
            rows={4}
            placeholder="その他、気になることがあれば自由に書いてください"
            className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3.5 text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/85 px-6 pb-7 pt-4 backdrop-blur-md">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => onComplete(profile)}
            className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99]"
          >
            この内容で登録して始める
          </button>
        </div>
      </div>
    </div>
  )
}
