'use client'

import { useEffect, useState } from 'react'
import { Filter, Hospital as HospitalIcon, Loader2, Navigation, Phone, Search, Share2 } from 'lucide-react'
import { Chip, Section } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import {
  searchHospitals,
  shareHospital,
  unshareHospital,
  fetchSharedHospitalIds,
  fetchSharedHospitalsForGuardian,
  shareHospitalByGuardian,
  unshareHospitalByGuardian,
  fetchSharedHospitalIdsByGuardian,
  fetchSharedHospitalsForPatient,
  type Hospital,
} from '@/lib/hospitals'

const HOTLINES = [
  { name: 'よりそいホットライン', note: '24時間・無料', tel: '0120279338', display: '0120-279-338' },
  { name: 'いのちの電話', note: '', tel: '0570783556', display: '0570-783-556' },
]

function openMapSearch(query: string) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function ageLabel(h: Hospital) {
  if (h.minAge == null && h.maxAge == null) return null
  if (h.minAge != null && h.maxAge != null) return `${h.minAge}〜${h.maxAge}歳`
  if (h.minAge != null) return `${h.minAge}歳〜`
  return `〜${h.maxAge}歳`
}

function HospitalCard({
  hospital,
  shared,
  onToggleShare,
  shareTarget = '保護者',
}: {
  hospital: Hospital
  shared?: boolean
  onToggleShare?: () => void
  shareTarget?: string
}) {
  const age = ageLabel(hospital)
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">{hospital.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{hospital.address || hospital.area}</p>
        </div>
        {hospital.phone && (
          <a
            href={`tel:${hospital.phone.replace(/[^0-9]/g, '')}`}
            aria-label="電話をかける"
            className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 p-2 text-primary transition-all hover:bg-primary/15 active:scale-[0.96]"
          >
            <Phone className="size-4" />
          </a>
        )}
      </div>

      {hospital.consultationHours && (
        <p className="text-xs leading-relaxed text-foreground/70">{hospital.consultationHours}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {age && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            対応年齢 {age}
          </span>
        )}
        {hospital.femaleDoctor && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            女性医師対応
          </span>
        )}
        {hospital.onlineAvailable && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            オンライン対応
          </span>
        )}
        {hospital.adolescentOutpatient && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            思春期外来
          </span>
        )}
      </div>

      {hospital.notes && <p className="text-xs leading-relaxed text-muted-foreground">{hospital.notes}</p>}

      {onToggleShare && (
        <button
          type="button"
          onClick={onToggleShare}
          className={cn(
            'mt-1 flex items-center justify-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97]',
            shared
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          <Share2 className="size-3.5" />
          {shared ? `${shareTarget}に共有中` : `${shareTarget}に共有する`}
        </button>
      )}
    </div>
  )
}

export function HospitalSearchScreen({
  mode = 'self',
  userId,
}: {
  mode?: 'self' | 'guardian'
  userId?: string
}) {
  const isGuardian = mode === 'guardian'
  const [area, setArea] = useState('')
  const [hours, setHours] = useState('')
  const [age, setAge] = useState('')
  const [femaleDoctor, setFemaleDoctor] = useState(false)
  const [onlineAvailable, setOnlineAvailable] = useState(false)
  const [adolescentOutpatient, setAdolescentOutpatient] = useState(false)
  const [results, setResults] = useState<Hospital[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set())
  const [sharedByPatient, setSharedByPatient] = useState<(Hospital & { sharedAt: string })[]>([])
  const [sharedByGuardian, setSharedByGuardian] = useState<(Hospital & { sharedAt: string })[]>([])

  useEffect(() => {
    if (!isGuardian && userId) {
      fetchSharedHospitalIds(userId).then(setSharedIds).catch(() => {})
      fetchSharedHospitalsForPatient().then(setSharedByGuardian).catch(() => {})
    }
    if (isGuardian) {
      fetchSharedHospitalsForGuardian().then(setSharedByPatient).catch(() => {})
      if (userId) fetchSharedHospitalIdsByGuardian(userId).then(setSharedIds).catch(() => {})
    }
  }, [isGuardian, userId])

  const runSearch = async () => {
    setLoading(true)
    setError(null)
    try {
      const ageNum = age.trim() ? Number(age.trim()) : undefined
      const data = await searchHospitals({
        area,
        hours,
        age: ageNum != null && !Number.isNaN(ageNum) ? ageNum : undefined,
        femaleDoctor,
        onlineAvailable,
        adolescentOutpatient,
      })
      setResults(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const toggleShare = async (hospitalId: string) => {
    if (!userId) return
    const next = new Set(sharedIds)
    try {
      if (isGuardian) {
        if (next.has(hospitalId)) {
          await unshareHospitalByGuardian(userId, hospitalId)
          next.delete(hospitalId)
        } else {
          await shareHospitalByGuardian(userId, hospitalId)
          next.add(hospitalId)
        }
      } else {
        if (next.has(hospitalId)) {
          await unshareHospital(userId, hospitalId)
          next.delete(hospitalId)
        } else {
          await shareHospital(userId, hospitalId)
          next.add(hospitalId)
        }
      }
      setSharedIds(next)
    } catch {
      // 共有状態の更新に失敗した場合は表示をそのままにする
    }
  }

  const searchNearMe = () => {
    if (!navigator.geolocation) {
      openMapSearch('心療内科 精神科')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => openMapSearch(`心療内科 精神科 near ${pos.coords.latitude},${pos.coords.longitude}`),
      () => openMapSearch('心療内科 精神科'),
    )
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">病院検索</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          条件を指定して、心療内科・精神科などの医療機関を探せます。
        </p>
      </div>

      {isGuardian && sharedByPatient.length > 0 && (
        <Section title="本人が共有した病院" icon={<Share2 className="size-4.5 text-primary" />}>
          <div className="flex flex-col gap-2.5">
            {sharedByPatient.map((h) => (
              <HospitalCard key={h.id} hospital={h} />
            ))}
          </div>
        </Section>
      )}

      {!isGuardian && sharedByGuardian.length > 0 && (
        <Section title="保護者が共有した病院" icon={<Share2 className="size-4.5 text-primary" />}>
          <div className="flex flex-col gap-2.5">
            {sharedByGuardian.map((h) => (
              <HospitalCard key={h.id} hospital={h} />
            ))}
          </div>
        </Section>
      )}

      <Section title="今すぐ相談できる窓口" icon={<Phone className="size-4.5 text-primary" />}>
        <div className="flex flex-col gap-2">
          {HOTLINES.map((h) => (
            <a
              key={h.tel}
              href={`tel:${h.tel}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 transition-all hover:border-primary/40 active:scale-[0.99]"
            >
              <span>
                <span className="block text-sm font-bold text-foreground">{h.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {h.display}
                  {h.note && ` ・ ${h.note}`}
                </span>
              </span>
              <Phone className="size-4 shrink-0 text-primary" />
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={searchNearMe}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-sm font-semibold text-foreground transition-all hover:border-primary/40 active:scale-[0.99]"
        >
          <Navigation className="size-4" />
          現在地の近くをGoogleマップで探す
        </button>
      </Section>

      <Section title="条件で探す" icon={<Filter className="size-4.5 text-primary" />}>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor="hospital-area">
              エリア
            </label>
            <input
              id="hospital-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="例）東京都渋谷区"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor="hospital-hours">
              診察時間（例：土日、夜間 など）
            </label>
            <input
              id="hospital-hours"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="例）土曜"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor="hospital-age">
              受診者の年齢
            </label>
            <input
              id="hospital-age"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="例）16"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Chip active={femaleDoctor} onClick={() => setFemaleDoctor((v) => !v)}>
              女性医師対応
            </Chip>
            <Chip active={onlineAvailable} onClick={() => setOnlineAvailable((v) => !v)}>
              オンライン対応
            </Chip>
            <Chip active={adolescentOutpatient} onClick={() => setAdolescentOutpatient((v) => !v)}>
              思春期外来対応
            </Chip>
          </div>

          <button
            type="button"
            onClick={runSearch}
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            この条件で探す
          </button>
        </div>
      </Section>

      {error && <p className="text-center text-xs text-destructive">{error}</p>}

      {results && (
        <Section
          title={`検索結果（${results.length}件）`}
          icon={<HospitalIcon className="size-4.5 text-primary" />}
        >
          {results.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              条件に合う病院が見つかりませんでした。
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {results.map((h) => (
                <HospitalCard
                  key={h.id}
                  hospital={h}
                  shared={userId ? sharedIds.has(h.id) : undefined}
                  onToggleShare={userId ? () => toggleShare(h.id) : undefined}
                  shareTarget={isGuardian ? '本人' : '保護者'}
                />
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
