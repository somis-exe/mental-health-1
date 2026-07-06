'use client'

import { useState } from 'react'
import { Check, LogOut, UserRound } from 'lucide-react'
import { Chip, FieldLabel, Section } from '@/components/ui-kit'
import { CONCERNS, GENDERS, type Profile } from '@/lib/health'
import { cn } from '@/lib/utils'

const YEARS = Array.from({ length: 90 }, (_, i) => String(new Date().getFullYear() - i))
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1))

function DateSelect({
  value,
  onChange,
  options,
  suffix,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  suffix: string
}) {
  return (
    <div className="relative flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-2xl border border-border bg-background py-3.5 pl-4 pr-8 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
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

export function ProfileScreen({
  profile,
  onSave,
  onLogout,
}: {
  profile: Profile
  onSave: (p: Profile) => void
  onLogout: () => void
}) {
  const [draft, setDraft] = useState<Profile>(profile)
  const [saved, setSaved] = useState(false)

  const update = <K extends keyof Profile>(key: K, val: Profile[K]) => {
    setDraft((p) => ({ ...p, [key]: val }))
    setSaved(false)
  }

  const toggleConcern = (c: string) =>
    update(
      'concerns',
      draft.concerns.includes(c)
        ? draft.concerns.filter((x) => x !== c)
        : [...draft.concerns, c],
    )

  const handleSave = () => {
    onSave(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-4">
      <div className="flex items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
          <UserRound className="size-7" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">
            {draft.nickname || 'ゲスト'}さん
          </h1>
          <p className="text-sm text-muted-foreground">基本情報の変更</p>
        </div>
      </div>

      <Section title="プロフィール">
        <div className="flex flex-col gap-6">
          <div>
            <FieldLabel>ニックネーム</FieldLabel>
            <input
              value={draft.nickname}
              onChange={(e) => update('nickname', e.target.value)}
              placeholder="例：はるちゃん"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <FieldLabel>生年月日</FieldLabel>
            <div className="flex gap-2">
              <DateSelect
                value={draft.birthYear}
                onChange={(v) => update('birthYear', v)}
                options={YEARS}
                suffix="年"
              />
              <DateSelect
                value={draft.birthMonth}
                onChange={(v) => update('birthMonth', v)}
                options={MONTHS}
                suffix="月"
              />
              <DateSelect
                value={draft.birthDay}
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
                  aria-pressed={draft.gender === g}
                  className={cn(
                    'rounded-2xl border px-3 py-3.5 text-sm font-medium transition-all active:scale-[0.98]',
                    draft.gender === g
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="気になっていること">
        <div className="flex flex-wrap gap-2">
          {CONCERNS.map((c) => (
            <Chip key={c} active={draft.concerns.includes(c)} onClick={() => toggleConcern(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="自由記述">
        <textarea
          value={draft.freeNote}
          onChange={(e) => update('freeNote', e.target.value)}
          rows={4}
          placeholder="その他、気になることがあれば自由に書いてください"
          className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3.5 text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </Section>

      <button
        type="button"
        onClick={handleSave}
        className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99]"
      >
        {saved ? <Check className="size-5" /> : null}
        {saved ? '保存しました' : '変更を保存する'}
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted active:scale-[0.99]"
      >
        <LogOut className="size-4" />
        ログアウト
      </button>
    </div>
  )
}
