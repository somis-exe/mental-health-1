import { createClient } from '@/lib/supabase/client'
import { sharedRecordFromRow, type DailyRecord, type SharedDailyRecordRow } from '@/lib/health'

export type LinkedGuardian = { id: string; nickname: string; created_at: string }
export type LinkedPatient = { id: string; nickname: string }
export type ActiveLinkCode = { code: string; expires_at: string }

/** 0/O/1/I/L など紛らわしい文字を除いた8文字コード。 */
export function generateLinkCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

const CODE_TTL_HOURS = 24

/** 本人用: 新しい連携コードを発行する（24時間有効）。 */
export async function issueLinkCode(userId: string): Promise<ActiveLinkCode> {
  const supabase = createClient()
  const code = generateLinkCode()
  const expires_at = new Date(Date.now() + CODE_TTL_HOURS * 60 * 60 * 1000).toISOString()
  const { error } = await supabase.from('link_codes').insert({ code, patient_id: userId, expires_at })
  if (error) throw new Error(error.message)
  return { code, expires_at }
}

/** 本人用: 未使用・有効期限内のコード一覧。 */
export async function fetchActiveCodes(userId: string): Promise<ActiveLinkCode[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('link_codes')
    .select('code, expires_at')
    .eq('patient_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** 本人用: 連携中の保護者一覧。 */
export async function fetchLinkedGuardians(): Promise<LinkedGuardian[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('linked_guardians').select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** 本人用: 指定した保護者との連携を解除する。 */
export async function revokeGuardian(guardianId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('guardian_links').delete().eq('guardian_id', guardianId)
  if (error) throw new Error(error.message)
}

const REDEEM_ERRORS: Record<string, string> = {
  not_guardian: '保護者向けアカウントでのみ連携できます。',
  invalid: 'コードが正しくないか、有効期限が切れています。',
  self: '自分自身とは連携できません。',
  already_linked: 'すでに別のアカウントと連携済みです。先に連携を解除してください。',
}

/** 保護者用: 連携コードを使って本人と連携する。 */
export async function redeemLinkCode(code: string): Promise<LinkedPatient> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('redeem_link_code', { p_code: code })
  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(REDEEM_ERRORS[data?.error as string] ?? '連携に失敗しました。')
  return { id: data.patient_id, nickname: data.patient_nickname ?? '' }
}

/** 保護者用: 連携中の本人（いなければnull）。 */
export async function fetchLinkedPatient(): Promise<LinkedPatient | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('linked_patients').select('*').maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/** 保護者用: 本人との連携を解除する。 */
export async function unlinkPatient(guardianUserId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('guardian_links').delete().eq('guardian_id', guardianUserId)
  if (error) throw new Error(error.message)
}

/** 保護者用: 連携中の本人の記録（メモ・安全項目はビュー側で除外済み）。 */
export async function fetchPatientRecords(): Promise<DailyRecord[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shared_daily_records')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as SharedDailyRecordRow[]).map(sharedRecordFromRow)
}
