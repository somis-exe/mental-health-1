import { createClient } from '@/lib/supabase/client'

export type Hospital = {
  id: string
  name: string
  area: string
  address: string | null
  phone: string | null
  consultationHours: string | null
  minAge: number | null
  maxAge: number | null
  femaleDoctor: boolean
  onlineAvailable: boolean
  adolescentOutpatient: boolean
  notes: string | null
}

export type HospitalFilters = {
  area?: string
  hours?: string
  age?: number
  femaleDoctor?: boolean
  onlineAvailable?: boolean
  adolescentOutpatient?: boolean
}

type HospitalRow = {
  id: string
  name: string
  area: string
  address: string | null
  phone: string | null
  consultation_hours: string | null
  min_age: number | null
  max_age: number | null
  female_doctor: boolean
  online_available: boolean
  adolescent_outpatient: boolean
  notes: string | null
}

function fromRow(row: HospitalRow): Hospital {
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    address: row.address,
    phone: row.phone,
    consultationHours: row.consultation_hours,
    minAge: row.min_age,
    maxAge: row.max_age,
    femaleDoctor: row.female_doctor,
    onlineAvailable: row.online_available,
    adolescentOutpatient: row.adolescent_outpatient,
    notes: row.notes,
  }
}

/** 手入力で登録された病院ディレクトリを条件検索する。 */
export async function searchHospitals(filters: HospitalFilters): Promise<Hospital[]> {
  const supabase = createClient()
  let query = supabase.from('hospitals').select('*')

  const area = filters.area?.trim()
  if (area) query = query.or(`area.ilike.%${area}%,address.ilike.%${area}%`)

  const hours = filters.hours?.trim()
  if (hours) query = query.ilike('consultation_hours', `%${hours}%`)

  if (filters.femaleDoctor) query = query.eq('female_doctor', true)
  if (filters.onlineAvailable) query = query.eq('online_available', true)
  if (filters.adolescentOutpatient) query = query.eq('adolescent_outpatient', true)

  const { data, error } = await query.order('name')
  if (error) throw new Error(error.message)

  let results = ((data ?? []) as HospitalRow[]).map(fromRow)
  if (filters.age != null) {
    results = results.filter(
      (h) => (h.minAge == null || filters.age! >= h.minAge) && (h.maxAge == null || filters.age! <= h.maxAge),
    )
  }
  return results
}

/** 本人用: 指定した病院を連携中の保護者に共有する。 */
export async function shareHospital(patientId: string, hospitalId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('shared_hospitals')
    .upsert({ patient_id: patientId, hospital_id: hospitalId }, { onConflict: 'patient_id,hospital_id' })
  if (error) throw new Error(error.message)
}

/** 本人用: 病院の共有を解除する。 */
export async function unshareHospital(patientId: string, hospitalId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('shared_hospitals')
    .delete()
    .eq('patient_id', patientId)
    .eq('hospital_id', hospitalId)
  if (error) throw new Error(error.message)
}

/** 本人用: 自分が共有済みの病院IDの集合。 */
export async function fetchSharedHospitalIds(patientId: string): Promise<Set<string>> {
  const supabase = createClient()
  const { data, error } = await supabase.from('shared_hospitals').select('hospital_id').eq('patient_id', patientId)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((r) => r.hospital_id as string))
}

/** 保護者用: 連携中の本人が共有した病院一覧（新しい順）。 */
export async function fetchSharedHospitalsForGuardian(): Promise<(Hospital & { sharedAt: string })[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shared_hospitals_for_guardian')
    .select('*')
    .order('shared_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as (HospitalRow & { shared_at: string })[]).map((row) => ({
    ...fromRow(row),
    sharedAt: row.shared_at,
  }))
}

/** 保護者用: 指定した病院を連携中の本人に共有する。 */
export async function shareHospitalByGuardian(guardianId: string, hospitalId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('shared_hospitals_by_guardian')
    .upsert({ guardian_id: guardianId, hospital_id: hospitalId }, { onConflict: 'guardian_id,hospital_id' })
  if (error) throw new Error(error.message)
}

/** 保護者用: 病院の共有を解除する。 */
export async function unshareHospitalByGuardian(guardianId: string, hospitalId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('shared_hospitals_by_guardian')
    .delete()
    .eq('guardian_id', guardianId)
    .eq('hospital_id', hospitalId)
  if (error) throw new Error(error.message)
}

/** 保護者用: 自分が共有済みの病院IDの集合。 */
export async function fetchSharedHospitalIdsByGuardian(guardianId: string): Promise<Set<string>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shared_hospitals_by_guardian')
    .select('hospital_id')
    .eq('guardian_id', guardianId)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((r) => r.hospital_id as string))
}

/** 本人用: 連携中の保護者が共有した病院一覧（新しい順）。 */
export async function fetchSharedHospitalsForPatient(): Promise<(Hospital & { sharedAt: string })[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shared_hospitals_for_patient')
    .select('*')
    .order('shared_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as (HospitalRow & { shared_at: string })[]).map((row) => ({
    ...fromRow(row),
    sharedAt: row.shared_at,
  }))
}
