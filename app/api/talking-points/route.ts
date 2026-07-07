import { NextResponse } from 'next/server'
import type { DailyRecord } from '@/lib/health'

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

function buildPrompt(records: DailyRecord[], rangeLabel?: string): string {
  const lines = records.map((r) => {
    const parts = [
      `日付: ${r.date.slice(0, 10)}`,
      `気分: ${r.mood}/5`,
      `睡眠時間: ${r.sleepHours}時間`,
      `寝つき: ${r.sleepOnset}`,
      r.nightWaking ? '夜間に目が覚めた' : null,
      `食欲: ${r.appetite}`,
      `運動: ${r.exercise}`,
      r.symptoms.length ? `症状: ${r.symptoms.join('、')}` : null,
      r.memo ? `メモ: ${r.memo}` : null,
    ].filter(Boolean)
    return `- ${parts.join(' / ')}`
  })

  return [
    'あなたは患者の体調記録を要約し、診察時に医師へ伝える話す内容の要点を作るアシスタントです。',
    '以下は患者が記録した体調ログです（日付順）。',
    rangeLabel ? `対象期間: ${rangeLabel}` : null,
    '',
    lines.join('\n'),
    '',
    '上記の記録（自由記述のメモも含む）をもとに、診察室で患者が医師に伝えるとよいポイントを、重要な順に最大5個、日本語の短い文で挙げてください。',
    '記録に無い内容は含めないでください。医学的な診断や治療方針の判断は行わないでください。',
    '出力は次のJSON形式のみを返してください（説明文やコードブロックは不要）: {"points": ["...", "..."]}',
  ]
    .filter((s): s is string => s !== null)
    .join('\n')
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'サーバーにGEMINI_API_KEYが設定されていません。' },
      { status: 500 },
    )
  }

  const body = await req.json().catch(() => null)
  const records = body?.records as DailyRecord[] | undefined
  if (!records || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: '要約対象の記録がありません。' }, { status: 400 })
  }

  const prompt = buildPrompt(records, typeof body?.rangeLabel === 'string' ? body.rangeLabel : undefined)

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('Gemini API error', res.status, errText)
      return NextResponse.json(
        { error: 'AI要約の取得に失敗しました。しばらくしてから再度お試しください。' },
        { status: 502 },
      )
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return NextResponse.json({ error: 'AIからの応答が空でした。' }, { status: 502 })
    }

    let points: string[] = []
    try {
      const parsed = JSON.parse(text)
      points = Array.isArray(parsed?.points)
        ? parsed.points.filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0)
        : []
    } catch {
      points = text
        .split('\n')
        .map((l) => l.replace(/^[-*・\d.)\s]+/, '').trim())
        .filter(Boolean)
    }

    if (points.length === 0) {
      return NextResponse.json({ error: 'AI要約を生成できませんでした。' }, { status: 502 })
    }

    return NextResponse.json({ points: points.slice(0, 5) })
  } catch (e) {
    console.error('Gemini request failed', e)
    return NextResponse.json({ error: 'AI要約の生成中にエラーが発生しました。' }, { status: 500 })
  }
}
