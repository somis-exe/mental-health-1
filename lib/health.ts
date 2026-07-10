export type Screen = 'record' | 'report' | 'profile'

export type Mood = 1 | 2 | 3 | 4 | 5

export const MOODS: { value: Mood; emoji: string; label: string; color: string }[] = [
  { value: 5, emoji: '😆', label: '非常に良い', color: 'oklch(0.63 0.083 162)' },
  { value: 4, emoji: '🙂', label: '良い', color: 'oklch(0.7 0.09 150)' },
  { value: 3, emoji: '😐', label: 'ふつう', color: 'oklch(0.75 0.11 90)' },
  { value: 2, emoji: '😕', label: '悪い', color: 'oklch(0.72 0.12 55)' },
  { value: 1, emoji: '😢', label: '非常に悪い', color: 'oklch(0.62 0.16 32)' },
]

export const CONCERNS = [
  '気分が落ち込む',
  '眠れない',
  '不安感が強い',
  '食欲がない',
  'やる気が出ない',
  '集中できない',
  'その他',
]

export const SYMPTOMS = ['頭痛', '気持ち悪さ', '眠気', 'だるさ', 'めまい', 'イライラ']

export const APPETITE = ['しっかり食べた', '普通', 'あまり食べていない'] as const

export const EXERCISE = ['なし', 'あり', 'ハード'] as const

export const SLEEP_ONSET = ['すぐ眠れた', '普通', 'なかなか眠れない'] as const

export const GENDERS = ['女性', '男性', 'その他', '回答しない'] as const

export type MoodSlot = 'morning' | 'noon' | 'night'

export const MOOD_SLOTS: { value: MoodSlot; label: string }[] = [
  { value: 'morning', label: '朝' },
  { value: 'noon', label: '昼' },
  { value: 'night', label: '夜' },
]

export type Profile = {
  nickname: string
  birthYear: string
  birthMonth: string
  birthDay: string
  gender: string
  concerns: string[]
  freeNote: string
}

export type DailyRecord = {
  id?: string
  date: string
  moodMorning: Mood | null
  moodNoon: Mood | null
  moodNight: Mood | null
  symptoms: string[]
  sleepStart: string | null
  sleepEnd: string | null
  sleepHours: number
  sleepOnset: string
  nightWaking: boolean
  appetite: string
  exercise: string
  bath: boolean
  medication: boolean
  memo: string
}

/** "HH:MM" -> minutes since 00:00. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Minutes since 00:00 (wrapped to 0-1439) -> "HH:MM". */
export function minutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Hours between bedtime and wake time, handling sleep that crosses midnight. */
export function sleepDurationHours(start: string, end: string): number {
  const diff = (timeToMinutes(end) - timeToMinutes(start) + 1440) % 1440
  return Math.round((diff / 60) * 4) / 4
}

/** Nearest 15-minute mark, so times from before this granularity was enforced still fit the picker. */
export function snapToQuarterHour(time: string): string {
  return minutesToTime(Math.round(timeToMinutes(time) / 15) * 15)
}

/** "00:00", "00:15", ... "23:45" — the fixed set of selectable bedtime/wake times. */
export const TIME_OPTIONS_15MIN: string[] = Array.from({ length: 96 }, (_, i) => minutesToTime(i * 15))

/** Bedtime/wake time (23:00 start) that reproduce a given sleep duration, for records saved before times were tracked. */
export function deriveSleepTimes(hours: number): { start: string; end: string } {
  const start = '23:00'
  return { start, end: minutesToTime(timeToMinutes(start) + hours * 60) }
}

/** Non-null (slot, value) pairs for a record, in morning→noon→night order. */
export function dayMoodEntries(record: DailyRecord): { slot: MoodSlot; value: Mood }[] {
  const pairs: { slot: MoodSlot; value: Mood | null }[] = [
    { slot: 'morning', value: record.moodMorning },
    { slot: 'noon', value: record.moodNoon },
    { slot: 'night', value: record.moodNight },
  ]
  return pairs.filter((p): p is { slot: MoodSlot; value: Mood } => p.value !== null)
}

/** Representative mood for the day, averaged across whichever slots were recorded. */
export function averageMood(record: DailyRecord): Mood | null {
  const entries = dayMoodEntries(record)
  if (entries.length === 0) return null
  const avg = entries.reduce((s, e) => s + e.value, 0) / entries.length
  return Math.round(avg) as Mood
}

export const DEFAULT_PROFILE: Profile = {
  nickname: '',
  birthYear: '1995',
  birthMonth: '4',
  birthDay: '1',
  gender: '',
  concerns: [],
  freeNote: '',
}

export function formatToday(): string {
  return formatFullDate(new Date().toISOString())
}

export function formatFullDate(iso: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(iso))
}

export function formatRecordDate(iso: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(iso))
}

/** Local YYYY-MM-DD key so records are grouped by calendar day. */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Build an ISO timestamp (09:00 local) from a YYYY-MM-DD date input value. */
export function isoFromDateInput(value: string): string {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date()
  date.setFullYear(y, m - 1, d)
  date.setHours(9, 0, 0, 0)
  return date.toISOString()
}

export function offsetDayISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

export function moodMeta(value: Mood) {
  return MOODS.find((m) => m.value === value) ?? MOODS[2]
}

export function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

export function formatRangeLabel(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export type ProfileRow = {
  id: string
  nickname: string
  birth_year: string
  birth_month: string
  birth_day: string
  gender: string
  concerns: string[]
  free_note: string
}

export function profileFromRow(row: ProfileRow): Profile {
  return {
    nickname: row.nickname,
    birthYear: row.birth_year,
    birthMonth: row.birth_month,
    birthDay: row.birth_day,
    gender: row.gender,
    concerns: row.concerns,
    freeNote: row.free_note,
  }
}

export function profileToRow(profile: Profile, userId: string): ProfileRow {
  return {
    id: userId,
    nickname: profile.nickname,
    birth_year: profile.birthYear,
    birth_month: profile.birthMonth,
    birth_day: profile.birthDay,
    gender: profile.gender,
    concerns: profile.concerns,
    free_note: profile.freeNote,
  }
}

export type DailyRecordRow = {
  id: string
  user_id: string
  date: string
  mood_morning: number | null
  mood_noon: number | null
  mood_night: number | null
  symptoms: string[]
  sleep_start: string | null
  sleep_end: string | null
  sleep_hours: number
  sleep_onset: string
  night_waking: boolean
  appetite: string
  exercise: string
  bath: boolean
  medication: boolean
  memo: string
}

export function recordFromRow(row: DailyRecordRow): DailyRecord {
  return {
    id: row.id,
    date: row.date,
    moodMorning: row.mood_morning as Mood | null,
    moodNoon: row.mood_noon as Mood | null,
    moodNight: row.mood_night as Mood | null,
    symptoms: row.symptoms,
    sleepStart: row.sleep_start,
    sleepEnd: row.sleep_end,
    sleepHours: row.sleep_hours,
    sleepOnset: row.sleep_onset,
    nightWaking: row.night_waking,
    appetite: row.appetite,
    exercise: row.exercise,
    bath: row.bath,
    medication: row.medication,
    memo: row.memo,
  }
}

export function recordToRow(record: DailyRecord, userId: string) {
  return {
    user_id: userId,
    date: record.date,
    mood_morning: record.moodMorning,
    mood_noon: record.moodNoon,
    mood_night: record.moodNight,
    symptoms: record.symptoms,
    sleep_start: record.sleepStart,
    sleep_end: record.sleepEnd,
    sleep_hours: record.sleepHours,
    sleep_onset: record.sleepOnset,
    night_waking: record.nightWaking,
    appetite: record.appetite,
    exercise: record.exercise,
    bath: record.bath,
    medication: record.medication,
    memo: record.memo,
  }
}

/** Rule-based (no external API) talking points for a doctor visit, derived from the records. */
export function generateTalkingPoints(records: DailyRecord[]): string[] {
  if (records.length === 0) return []

  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const n = sorted.length
  const allMoodValues = sorted.flatMap((r) => dayMoodEntries(r).map((e) => e.value))
  const avgMood = allMoodValues.length > 0 ? allMoodValues.reduce((s, v) => s + v, 0) / allMoodValues.length : null
  const avgSleep = sorted.reduce((s, r) => s + r.sleepHours, 0) / n

  const points: string[] = []

  const daysWithMood = sorted.filter((r) => averageMood(r) !== null)
  const lowMoodDays = daysWithMood.filter((r) => (averageMood(r) as Mood) <= 2).length
  if (daysWithMood.length > 0 && lowMoodDays / daysWithMood.length >= 0.3) {
    points.push(`この期間、気分が落ち込んだ日が${lowMoodDays}日ありました（全${n}日中）。`)
  }

  const nightDipDays = sorted.filter((r) => r.moodMorning !== null && r.moodNight !== null && r.moodNight < r.moodMorning)
  const daysWithBothEnds = sorted.filter((r) => r.moodMorning !== null && r.moodNight !== null)
  if (daysWithBothEnds.length >= 3 && nightDipDays.length / daysWithBothEnds.length >= 0.5) {
    points.push(`朝に比べて夜に気分が落ち込む日が多く見られました（${nightDipDays.length}/${daysWithBothEnds.length}日）。`)
  }

  const recentThree = sorted.slice(-3)
  if (recentThree.length === 3 && recentThree.every((r) => r.sleepHours < 5)) {
    points.push('直近3日間、睡眠時間が5時間を切る日が続いています。')
  } else if (avgSleep < 5) {
    points.push(`この期間の平均睡眠時間は${avgSleep.toFixed(1)}時間と短めです。`)
  }

  const symptomCounts = new Map<string, number>()
  for (const r of sorted) {
    for (const s of r.symptoms) symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1)
  }
  const topSymptom = [...symptomCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (topSymptom && topSymptom[1] >= 2) {
    points.push(`「${topSymptom[0]}」の記録が${topSymptom[1]}回ありました。`)
  }

  const nightWakingCount = sorted.filter((r) => r.nightWaking).length
  if (nightWakingCount / n >= 0.4) {
    points.push(`途中で目が覚めた日が${nightWakingCount}日ありました。`)
  }

  const lowAppetiteCount = sorted.filter((r) => r.appetite === APPETITE[2]).length
  if (lowAppetiteCount >= 2) {
    points.push(`食欲が落ちている日が${lowAppetiteCount}日ありました。`)
  }

  if (points.length === 0) {
    const moodPart = avgMood !== null ? `気分の平均は${avgMood.toFixed(1)} / 5、` : ''
    points.push(`この期間の${moodPart}平均睡眠時間は${avgSleep.toFixed(1)}時間でした。大きな変化は見られません。`)
  }

  return points.slice(0, 5)
}


