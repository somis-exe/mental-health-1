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
  mood: Mood
  symptoms: string[]
  sleepHours: number
  sleepOnset: string
  nightWaking: boolean
  appetite: string
  exercise: string
  bath: boolean
  medication: boolean
  memo: string
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
  mood: number
  symptoms: string[]
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
    mood: row.mood as Mood,
    symptoms: row.symptoms,
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
    mood: record.mood,
    symptoms: record.symptoms,
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
  const avgMood = sorted.reduce((s, r) => s + r.mood, 0) / n
  const avgSleep = sorted.reduce((s, r) => s + r.sleepHours, 0) / n

  const points: string[] = []

  const lowMoodDays = sorted.filter((r) => r.mood <= 2).length
  if (lowMoodDays / n >= 0.3) {
    points.push(`この期間、気分が落ち込んだ日が${lowMoodDays}日ありました（全${n}日中）。`)
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
    points.push(
      `この期間の気分の平均は${avgMood.toFixed(1)} / 5、平均睡眠時間は${avgSleep.toFixed(1)}時間でした。大きな変化は見られません。`,
    )
  }

  return points.slice(0, 5)
}


