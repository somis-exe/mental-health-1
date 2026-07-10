import { NextResponse } from 'next/server'
import { SYMPTOMS, APPETITE, EXERCISE, SLEEP_ONSET } from '@/lib/health'

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-lite-latest'

type ParsedDiary = {
  moodMorning: number | null
  moodNoon: number | null
  moodNight: number | null
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
  memo: string
}

function buildPrompt(text: string): string {
  return [
    'あなたは患者が書いた自由な日記文から、体調記録アプリの入力項目を抽出するアシスタントです。',
    '以下は患者が書いた今日の体調の日記です。',
    '---',
    text,
    '---',
    '',
    '日記の内容から、次の項目に当てはまるものがあれば値を埋めてください。書かれていない・判断できない項目はnullにしてください。',
    '項目に当てはまらない内容（具体的な出来事、感情の背景、心配事など）は要約せずそのまま "memo" にまとめてください。',
    '',
    '- moodMorning, moodNoon, moodNight: 朝・昼・夜の気分。1(非常に悪い)〜5(非常に良い)の整数。言及がなければnull。',
    `- symptoms: 次の候補から当てはまるものだけを配列で: ${SYMPTOMS.join('、')}`,
    '- sleepStart, sleepEnd: 就寝時刻と起床時刻（HH:MM、24時間表記、15分単位に丸める）。時刻の言及がなければ両方null。',
    '- sleepHours: 具体的な時刻の言及はないが睡眠時間（数値、時間）の言及がある場合のみ設定。時刻がわかる場合はsleepStart/sleepEndを優先しsleepHoursはnullにする。',
    `- sleepOnset: 次のいずれか、言及がなければnull: ${SLEEP_ONSET.join('、')}`,
    '- nightWaking: 夜中に目が覚めたかどうか。true/false、言及がなければnull。',
    `- appetite: 次のいずれか、言及がなければnull: ${APPETITE.join('、')}`,
    `- exercise: 次のいずれか、言及がなければnull: ${EXERCISE.join('、')}`,
    '- bath: 入浴したかどうか。true/false、言及がなければnull。',
    '- medication: 服薬したかどうか。true/false、言及がなければnull。',
    '- memo: 上記の項目に当てはまらない内容。なければ空文字。',
    '',
    '出力は次のJSON形式のみを返してください（説明文やコードブロックは不要）:',
    '{"moodMorning": number|null, "moodNoon": number|null, "moodNight": number|null, "symptoms": string[], "sleepStart": string|null, "sleepEnd": string|null, "sleepHours": number|null, "sleepOnset": string|null, "nightWaking": boolean|null, "appetite": string|null, "exercise": string|null, "bath": boolean|null, "medication": boolean|null, "memo": string}',
    '',
    '医学的な診断や治療方針の判断は行わないでください。日記に書かれていないことを推測して埋めないでください。',
  ].join('\n')
}

function asMood(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  const rounded = Math.round(n)
  return rounded >= 1 && rounded <= 5 ? rounded : null
}

function asEnum(v: unknown, options: readonly string[]): string | null {
  return typeof v === 'string' && options.includes(v) ? v : null
}

function asBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null
}

function asTime(v: unknown): string | null {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'サーバーにGEMINI_API_KEYが設定されていません。' }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) {
    return NextResponse.json({ error: '日記の本文が入力されていません。' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(text) }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('Gemini API error', res.status, errText)
      const error =
        res.status === 429
          ? 'AIの利用上限に達しました。少し時間をおいて再度お試しください。'
          : `AI解析に失敗しました（エラーコード: ${res.status}）。しばらくしてから再度お試しください。`
      return NextResponse.json({ error }, { status: 502 })
    }

    const data = await res.json()
    const raw: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) {
      return NextResponse.json({ error: 'AIからの応答が空でした。' }, { status: 502 })
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'AIの応答を解析できませんでした。' }, { status: 502 })
    }

    const sleepHoursRaw = Number(parsed.sleepHours)
    const result: ParsedDiary = {
      moodMorning: asMood(parsed.moodMorning),
      moodNoon: asMood(parsed.moodNoon),
      moodNight: asMood(parsed.moodNight),
      symptoms: Array.isArray(parsed.symptoms)
        ? parsed.symptoms.filter((s): s is string => typeof s === 'string' && SYMPTOMS.includes(s))
        : [],
      sleepStart: asTime(parsed.sleepStart),
      sleepEnd: asTime(parsed.sleepEnd),
      sleepHours: Number.isFinite(sleepHoursRaw) && sleepHoursRaw > 0 && sleepHoursRaw <= 24 ? sleepHoursRaw : null,
      sleepOnset: asEnum(parsed.sleepOnset, SLEEP_ONSET),
      nightWaking: asBool(parsed.nightWaking),
      appetite: asEnum(parsed.appetite, APPETITE),
      exercise: asEnum(parsed.exercise, EXERCISE),
      bath: asBool(parsed.bath),
      medication: asBool(parsed.medication),
      memo: typeof parsed.memo === 'string' ? parsed.memo.trim() : '',
    }

    if (result.sleepStart === null || result.sleepEnd === null) {
      result.sleepStart = null
      result.sleepEnd = null
    }

    return NextResponse.json({ result })
  } catch (e) {
    console.error('Gemini request failed', e)
    return NextResponse.json({ error: 'AI解析中にエラーが発生しました。' }, { status: 500 })
  }
}
