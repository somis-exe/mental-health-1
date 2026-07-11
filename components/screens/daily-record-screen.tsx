'use client'

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import {
  CalendarDays,
  Moon,
  Utensils,
  Activity,
  Bath,
  Pill,
  Droplets,
  StickyNote,
  HeartPulse,
  Stethoscope,
  MapPin,
  Check,
  ChevronLeft,
  ChevronDown,
  ListChecks,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Chip, Section, SelectPill, LeaveConfirmSheet } from '@/components/ui-kit'
import {
  MOODS,
  SYMPTOMS,
  APPETITE,
  EXERCISE,
  SLEEP_ONSET,
  formatFullDate,
  sleepDurationHours,
  deriveSleepTimes,
  snapToQuarterHour,
  TIME_OPTIONS_15MIN,
  type DailyRecord,
  type Mood,
} from '@/lib/health'
import { cn } from '@/lib/utils'

function MoodPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: Mood | null
  onChange: (v: Mood) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex justify-between gap-1">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            aria-pressed={value === m.value}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 rounded-2xl border py-2.5 transition-all active:scale-95',
              value === m.value
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-transparent hover:bg-muted',
            )}
          >
            <span className="text-xl leading-none">{m.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({
  value,
  onChange,
  labels = ['なし', 'あり'],
}: {
  value: boolean | null
  onChange: (v: boolean) => void
  labels?: [string, string]
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[false, true].map((v) => (
        <SelectPill key={String(v)} active={value === v} onClick={() => onChange(v)}>
          {labels[v ? 1 : 0]}
        </SelectPill>
      ))}
    </div>
  )
}


export type DailyRecordScreenHandle = {
  isDirty: () => boolean
  canSave: () => boolean
  save: () => void
}

export const DailyRecordScreen = forwardRef<
  DailyRecordScreenHandle,
  {
    date: string
    initialRecord?: DailyRecord | null
    showPeriod?: boolean
    onSave: (r: DailyRecord) => void
    onBack?: () => void
  }
>(function DailyRecordScreen({ date, initialRecord, showPeriod = false, onSave, onBack }, ref) {
  const isEditing = Boolean(initialRecord)
  const dateLabel = useMemo(() => formatFullDate(date), [date])
  const [moodMorning, setMoodMorning] = useState<Mood | null>(initialRecord?.moodMorning ?? null)
  const [moodNoon, setMoodNoon] = useState<Mood | null>(initialRecord?.moodNoon ?? null)
  const [moodNight, setMoodNight] = useState<Mood | null>(initialRecord?.moodNight ?? null)
  const [symptoms, setSymptoms] = useState<string[]>(initialRecord?.symptoms ?? [])
  const initialSleepTimes =
    initialRecord?.sleepStart && initialRecord?.sleepEnd
      ? { start: snapToQuarterHour(initialRecord.sleepStart), end: snapToQuarterHour(initialRecord.sleepEnd) }
      : initialRecord?.sleepHours != null
        ? deriveSleepTimes(initialRecord.sleepHours)
        : { start: '', end: '' }
  const [sleepStart, setSleepStart] = useState(initialSleepTimes.start)
  const [sleepEnd, setSleepEnd] = useState(initialSleepTimes.end)
  const sleepHours = useMemo(
    () => (sleepStart && sleepEnd ? sleepDurationHours(sleepStart, sleepEnd) : null),
    [sleepStart, sleepEnd],
  )
  const [sleepOnset, setSleepOnset] = useState<string | null>(initialRecord?.sleepOnset ?? null)
  const [nightWaking, setNightWaking] = useState<boolean | null>(initialRecord?.nightWaking ?? null)
  const [appetite, setAppetite] = useState<string | null>(initialRecord?.appetite ?? null)
  const [exercise, setExercise] = useState<string | null>(initialRecord?.exercise ?? null)
  const [bath, setBath] = useState<boolean | null>(initialRecord?.bath ?? null)
  const [medication, setMedication] = useState<boolean | null>(initialRecord?.medication ?? null)
  const [suicidalIdeation, setSuicidalIdeation] = useState<boolean | null>(
    initialRecord?.suicidalIdeation ?? null,
  )
  const [selfHarm, setSelfHarm] = useState<boolean | null>(initialRecord?.selfHarm ?? null)
  const [period, setPeriod] = useState<boolean | null>(initialRecord?.period ?? null)
  const [memo, setMemo] = useState(initialRecord?.memo ?? '')
  const [saved, setSaved] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const snapshotOf = (v: {
    moodMorning: Mood | null
    moodNoon: Mood | null
    moodNight: Mood | null
    symptoms: string[]
    sleepStart: string
    sleepEnd: string
    sleepOnset: string | null
    nightWaking: boolean | null
    appetite: string | null
    exercise: string | null
    bath: boolean | null
    medication: boolean | null
    suicidalIdeation: boolean | null
    selfHarm: boolean | null
    period: boolean | null
    memo: string
  }) => JSON.stringify(v)

  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() =>
    snapshotOf({
      moodMorning: initialRecord?.moodMorning ?? null,
      moodNoon: initialRecord?.moodNoon ?? null,
      moodNight: initialRecord?.moodNight ?? null,
      symptoms: initialRecord?.symptoms ?? [],
      sleepStart: initialSleepTimes.start,
      sleepEnd: initialSleepTimes.end,
      sleepOnset: initialRecord?.sleepOnset ?? null,
      nightWaking: initialRecord?.nightWaking ?? null,
      appetite: initialRecord?.appetite ?? null,
      exercise: initialRecord?.exercise ?? null,
      bath: initialRecord?.bath ?? null,
      medication: initialRecord?.medication ?? null,
      suicidalIdeation: initialRecord?.suicidalIdeation ?? null,
      selfHarm: initialRecord?.selfHarm ?? null,
      period: initialRecord?.period ?? null,
      memo: initialRecord?.memo ?? '',
    }),
  )

  const [aiOpen, setAiOpen] = useState(false)
  const [aiDiaryText, setAiDiaryText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const isDirty =
    snapshotOf({
      moodMorning,
      moodNoon,
      moodNight,
      symptoms,
      sleepStart,
      sleepEnd,
      sleepOnset,
      nightWaking,
      appetite,
      exercise,
      bath,
      medication,
      suicidalIdeation,
      selfHarm,
      period,
      memo,
    }) !== lastSavedSnapshot || aiDiaryText.trim() !== ''

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const handleAiAnalyze = async () => {
    if (!aiDiaryText.trim()) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/diary-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiDiaryText }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'AI解析に失敗しました。')

      const r = data.result as {
        moodMorning: Mood | null
        moodNoon: Mood | null
        moodNight: Mood | null
        symptoms: string[]
        sleepStart: string | null
        sleepEnd: string | null
        sleepHours: number | null
        sleepOnset: string | null
        nightWaking: boolean | null
        appetite: string | null
        exercise: string | null
        bath: boolean | null
        medication: boolean | null
        suicidalIdeation: boolean | null
        selfHarm: boolean | null
        memo: string
      }

      if (r.moodMorning !== null) setMoodMorning(r.moodMorning)
      if (r.moodNoon !== null) setMoodNoon(r.moodNoon)
      if (r.moodNight !== null) setMoodNight(r.moodNight)
      if (r.symptoms.length > 0) {
        setSymptoms((prev) => Array.from(new Set([...prev, ...r.symptoms])))
      }
      if (r.sleepStart && r.sleepEnd) {
        setSleepStart(snapToQuarterHour(r.sleepStart))
        setSleepEnd(snapToQuarterHour(r.sleepEnd))
      } else if (r.sleepHours !== null) {
        const derived = deriveSleepTimes(r.sleepHours)
        setSleepStart(derived.start)
        setSleepEnd(derived.end)
      }
      if (r.sleepOnset) setSleepOnset(r.sleepOnset)
      if (r.nightWaking !== null) setNightWaking(r.nightWaking)
      if (r.appetite) setAppetite(r.appetite)
      if (r.exercise) setExercise(r.exercise)
      if (r.bath !== null) setBath(r.bath)
      if (r.medication !== null) setMedication(r.medication)
      if (r.suicidalIdeation !== null) setSuicidalIdeation(r.suicidalIdeation)
      if (r.selfHarm !== null) setSelfHarm(r.selfHarm)
      if (r.memo) setMemo((prev) => (prev ? `${prev}\n${r.memo}` : r.memo))

      setAiOpen(false)
      setAiDiaryText('')
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI解析に失敗しました。')
    } finally {
      setAiLoading(false)
    }
  }

  const hasMood = moodMorning !== null || moodNoon !== null || moodNight !== null
  const repMood = useMemo(() => {
    const vals = [moodMorning, moodNoon, moodNight].filter((v): v is Mood => v !== null)
    if (vals.length === 0) return null
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) as Mood
  }, [moodMorning, moodNoon, moodNight])

  const feedback = useMemo(() => {
    if (!saved || repMood === null) return null
    const shortSleep = sleepHours !== null && sleepHours < 5
    const crisisFlag = suicidalIdeation === true || selfHarm === true
    const tired = repMood <= 2 || shortSleep || symptoms.length >= 3 || crisisFlag
    const alert = crisisFlag || (repMood <= 2 && (shortSleep || symptoms.length >= 3))
    return { tired, alert, crisisFlag }
  }, [saved, repMood, sleepHours, symptoms, suicidalIdeation, selfHarm])

  const performSave = () => {
    if (!hasMood) return
    setSaved(true)
    setLastSavedSnapshot(
      snapshotOf({
        moodMorning,
        moodNoon,
        moodNight,
        symptoms,
        sleepStart,
        sleepEnd,
        sleepOnset,
        nightWaking,
        appetite,
        exercise,
        bath,
        medication,
        suicidalIdeation,
        selfHarm,
        period,
        memo,
      }),
    )
    onSave({
      id: initialRecord?.id,
      date,
      moodMorning,
      moodNoon,
      moodNight,
      symptoms,
      sleepStart: sleepStart || null,
      sleepEnd: sleepEnd || null,
      sleepHours,
      sleepOnset,
      nightWaking,
      appetite,
      exercise,
      bath,
      medication,
      suicidalIdeation,
      selfHarm,
      period,
      memo,
    })
  }

  const handleSave = () => {
    performSave()
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 80)
  }

  useImperativeHandle(ref, () => ({
    isDirty: () => isDirty,
    canSave: () => hasMood,
    save: performSave,
  }))

  const handleBackClick = () => {
    if (isDirty) {
      setShowLeaveConfirm(true)
    } else {
      onBack?.()
    }
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-4">
      {/* Back + Date */}
      {onBack && (
        <button
          type="button"
          onClick={handleBackClick}
          className="-mb-1 -ml-1 flex w-fit items-center gap-1 rounded-full py-1 pr-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4.5" />
          記録一覧へ
        </button>
      )}
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <CalendarDays className="size-4 text-primary" />
        {dateLabel}
        {isEditing && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            編集中
          </span>
        )}
      </div>

      {/* AI diary entry */}
      <div className="rounded-3xl border border-primary/25 bg-primary/[0.05] p-3">
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          aria-expanded={aiOpen}
          className="flex w-full items-center gap-3 rounded-2xl bg-primary/10 px-3 py-3 text-left transition-all hover:bg-primary/15 active:scale-[0.99]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-foreground">AIで記録する</span>
            <span className="block text-xs text-muted-foreground">日記を書くだけで自動入力</span>
          </span>
          <ChevronDown
            className={cn(
              'size-5 shrink-0 text-muted-foreground transition-transform',
              aiOpen && 'rotate-180',
            )}
          />
        </button>

        {aiOpen && (
          <div className="mt-3 px-1">
            <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
              今日の体調を日記/箇条書きのように自由に書いてください。
              AIが自動で入力し、当てはまらない内容はメモに保存します。
            </p>
            <p className="mb-2 rounded-xl bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              例）睡眠n時間/p~q時/(夜目が覚める)だるい、朝普通、昼落ち着く、夜気分落ちる、食欲あり、入浴◯、薬×、(運動×)家から出てない
            </p>
            <textarea
              value={aiDiaryText}
              onChange={(e) => setAiDiaryText(e.target.value)}
              rows={5}
              placeholder="ここに入力してください"
              className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {aiError && <p className="mt-2 text-sm text-destructive">{aiError}</p>}
            <button
              type="button"
              onClick={handleAiAnalyze}
              disabled={aiLoading || !aiDiaryText.trim()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {aiLoading ? '解析中…' : 'この内容を記録に反映する'}
            </button>
          </div>
        )}
      </div>

      {/* Mood */}
      <Section title="今日の気分" icon={<HeartPulse className="size-4.5 text-primary" />}>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          朝・昼・夜のうち、記録できるタイミングだけでかまいません。
        </p>
        <div className="flex flex-col gap-4">
          <MoodPicker label="朝" value={moodMorning} onChange={setMoodMorning} />
          <MoodPicker label="昼" value={moodNoon} onChange={setMoodNoon} />
          <MoodPicker label="夜" value={moodNight} onChange={setMoodNight} />
        </div>
      </Section>

      {/* Symptoms */}
      <Section title="体調で気になること" icon={<Activity className="size-4.5 text-primary" />}>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <Chip key={s} active={symptoms.includes(s)} onClick={() => toggleSymptom(s)}>
              {s}
            </Chip>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            つらい気持ちがあったときの記録にお使いください。無理に入力する必要はありません。
          </p>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              死にたい気持ち（希死念慮）はあった
            </p>
            <Toggle value={suicidalIdeation} onChange={setSuicidalIdeation} labels={['なし', 'あり']} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">自分を傷つけること（自傷）はあった</p>
            <Toggle value={selfHarm} onChange={setSelfHarm} labels={['なし', 'あり']} />
          </div>
        </div>
      </Section>

      {/* Sleep */}
      <Section title="睡眠" icon={<Moon className="size-4.5 text-primary" />}>
        <div className="mb-5">
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">就寝時刻</span>
              <select
                value={sleepStart}
                onChange={(e) => setSleepStart(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">未設定</option>
                {TIME_OPTIONS_15MIN.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <span className="pb-3 text-sm font-bold text-muted-foreground">→</span>
            <label className="flex-1">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">起床時刻</span>
              <select
                value={sleepEnd}
                onChange={(e) => setSleepEnd(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">未設定</option>
                {TIME_OPTIONS_15MIN.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex items-baseline justify-between rounded-2xl bg-primary/[0.06] px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">睡眠時間</span>
            <span className="font-rounded text-xl font-extrabold text-primary">
              {sleepHours !== null ? sleepHours : '—'}
              <span className="ml-0.5 text-sm font-semibold text-muted-foreground">時間</span>
            </span>
          </div>
        </div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">入眠の早さ</p>
        <div className="mb-4 flex gap-2">
          {SLEEP_ONSET.map((o) => (
            <SelectPill key={o} active={sleepOnset === o} onClick={() => setSleepOnset(o)}>
              {o}
            </SelectPill>
          ))}
        </div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">途中で目が覚めた</p>
        <Toggle value={nightWaking} onChange={setNightWaking} labels={['なし', 'あり']} />
      </Section>

      {/* Appetite */}
      <Section title="食欲" icon={<Utensils className="size-4.5 text-primary" />}>
        <div className="flex flex-col gap-2">
          {APPETITE.map((a) => (
            <SelectPill key={a} active={appetite === a} onClick={() => setAppetite(a)}>
              {a}
            </SelectPill>
          ))}
        </div>
      </Section>

      {/* Exercise */}
      <Section title="運動" icon={<Activity className="size-4.5 text-primary" />}>
        <div className="flex gap-2">
          {EXERCISE.map((e) => (
            <SelectPill key={e} active={exercise === e} onClick={() => setExercise(e)}>
              {e}
            </SelectPill>
          ))}
        </div>
      </Section>

      {/* Bath + Medication */}
      <div className="grid grid-cols-1 gap-5">
        <Section title="入浴" icon={<Bath className="size-4.5 text-primary" />}>
          <Toggle value={bath} onChange={setBath} labels={['していない', 'した']} />
        </Section>
        <Section title="服薬" icon={<Pill className="size-4.5 text-primary" />}>
          <Toggle value={medication} onChange={setMedication} labels={['なし', 'あり']} />
        </Section>
        {showPeriod && (
          <Section title="生理" icon={<Droplets className="size-4.5 text-primary" />}>
            <Toggle value={period} onChange={setPeriod} labels={['なし', 'あり']} />
          </Section>
        )}
      </div>

      {/* Memo */}
      <Section title="ひとことメモ" icon={<StickyNote className="size-4.5 text-primary" />}>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          placeholder="今日の出来事や気持ちなど、自由にどうぞ"
          className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </Section>

      <button
        type="button"
        onClick={handleSave}
        disabled={!hasMood}
        className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saved ? <Check className="size-5" /> : null}
        {saved ? (isEditing ? '更新しました' : '記録しました') : isEditing ? '記録を更新する' : '記録を保存する'}
      </button>
      {!hasMood && (
        <p className="-mt-2 text-center text-xs text-muted-foreground">
          朝・昼・夜のいずれか1つ以上、気分を選んでください
        </p>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="flex flex-col gap-4 pt-2">
          <div className="rounded-3xl border border-primary/25 bg-primary/[0.07] p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                <HeartPulse className="size-4.5" />
              </span>
              <h3 className="text-base font-bold text-foreground">現在の体調の目安</h3>
            </div>
            <p className="text-sm leading-relaxed text-foreground/80">
              {feedback.tired
                ? '少し疲れが溜まっているようです。今日は無理をせず、早めに休みましょう。あたたかい飲み物でリラックスするのもおすすめです。'
                : '今日は比較的落ち着いているようです。この調子を大切に、規則正しい生活を続けていきましょう。'}
            </p>
          </div>

          {feedback.alert && (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/[0.08] p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                  <Stethoscope className="size-4.5" />
                </span>
                <h3 className="text-base font-bold text-destructive">受診の目安</h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-foreground/80">
                {feedback.crisisFlag
                  ? '記録、ありがとうございます。ひとりで抱え込まず、できるだけ早く医療機関か相談窓口に話してみてください。今すぐ話したいときは、よりそいホットライン（0120-279-338、24時間・無料）や、いのちの電話（0570-783-556）も利用できます。'
                  : 'つらい状態が続いているようです。ひとりで抱え込まず、医療機関や相談窓口への相談を検討してみてもよいかもしれません。'}
              </p>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
              >
                <MapPin className="size-4" />
                近くの相談機関を探す
              </button>
            </div>
          )}

          {onBack && (
            <button
              type="button"
              onClick={handleBackClick}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold text-foreground transition-all hover:bg-muted active:scale-[0.99]"
            >
              <ListChecks className="size-4.5 text-primary" />
              記録一覧に戻る
            </button>
          )}
        </div>
      )}

      {showLeaveConfirm && (
        <LeaveConfirmSheet
          canSave={hasMood}
          message="入力中の内容がまだ保存されていません。記録一覧に戻る前に保存しますか？"
          saveLabel="保存して戻る"
          discardLabel="保存せずに戻る"
          cannotSaveHint="保存するには気分を1つ以上選んでください"
          onSaveAndLeave={() => {
            performSave()
            setShowLeaveConfirm(false)
            onBack?.()
          }}
          onDiscardAndLeave={() => {
            setShowLeaveConfirm(false)
            onBack?.()
          }}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}
    </div>
  )
})
