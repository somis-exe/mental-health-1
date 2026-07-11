'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AuthScreen } from '@/components/auth-screen'
import { OnboardingScreen } from '@/components/onboarding-screen'
import { AppShell } from '@/components/app-shell'
import {
  DEFAULT_PROFILE,
  profileFromRow,
  profileToRow,
  recordFromRow,
  recordToRow,
  dayKey,
  type Profile,
  type DailyRecord,
} from '@/lib/health'
import {
  fetchLinkedPatient,
  fetchPatientRecords,
  redeemLinkCode,
  unlinkPatient,
  type LinkedPatient,
} from '@/lib/links'
import { createClient } from '@/lib/supabase/client'

type Stage = 'checking' | 'auth' | 'onboarding' | 'app'

export default function Page() {
  const supabase = useMemo(() => createClient(), [])
  const [stage, setStage] = useState<Stage>('checking')
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [recordError, setRecordError] = useState<string | null>(null)
  const [patient, setPatient] = useState<LinkedPatient | null>(null)
  const [patientRecords, setPatientRecords] = useState<DailyRecord[]>([])

  const loadGuardianData = useCallback(async () => {
    try {
      const linked = await fetchLinkedPatient()
      setPatient(linked)
      setPatientRecords(linked ? await fetchPatientRecords() : [])
    } catch (e) {
      console.error('Failed to load guardian link data', e)
      setPatient(null)
      setPatientRecords([])
    }
  }, [])

  const resolveStage = useCallback(
    async (uid: string) => {
      setUserId(uid)
      const [{ data: profileRow }, { data: recordRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('daily_records').select('*').eq('user_id', uid).order('date', { ascending: false }),
      ])
      setRecords((recordRows ?? []).map(recordFromRow))
      if (profileRow) {
        const p = profileFromRow(profileRow)
        setProfile(p)
        if (p.accountType === 'guardian') await loadGuardianData()
        setStage('app')
      } else {
        setStage('onboarding')
      }
    },
    [supabase, loadGuardianData],
  )

  const handleSaveRecord = async (r: DailyRecord) => {
    if (!userId) return
    setRecordError(null)
    if (r.id) {
      const { data, error } = await supabase
        .from('daily_records')
        .update(recordToRow(r, userId))
        .eq('id', r.id)
        .select()
        .single()
      if (error) {
        console.error('Failed to update daily record', error)
        setRecordError(`記録の更新に失敗しました（${error.message}）`)
        return
      }
      const saved = recordFromRow(data)
      setRecords((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
      return
    }
    const { data, error } = await supabase
      .from('daily_records')
      .insert(recordToRow(r, userId))
      .select()
      .single()
    if (error) {
      console.error('Failed to insert daily record', error)
      setRecordError(`記録の保存に失敗しました（${error.message}）`)
      return
    }
    const saved = recordFromRow(data)
    setRecords((prev) => {
      const withoutSameDay = prev.filter((x) => dayKey(x.date) !== dayKey(saved.date))
      return [saved, ...withoutSameDay]
    })
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserId(null)
        setStage('auth')
        return
      }
      if (session) resolveStage(session.user.id)
      else setStage('auth')
    })

    return () => subscription.unsubscribe()
  }, [supabase, resolveStage])

  if (stage === 'checking') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      {stage === 'auth' && <AuthScreen />}
      {stage === 'onboarding' && userId && (
        <OnboardingScreen
          onComplete={async (p) => {
            await supabase.from('profiles').insert(profileToRow(p, userId))
            setProfile(p)
          }}
          onEnterApp={async () => {
            // 保護者ならオンボーディング中のコード連携を反映（本人アカウントでは空振りするだけ）
            await loadGuardianData()
            setStage('app')
          }}
        />
      )}
      {stage === 'app' && userId && (
        <AppShell
          profile={profile}
          userId={userId}
          onUpdateProfile={async (p) => {
            const wasGuardian = profile.accountType === 'guardian'
            await supabase.from('profiles').update(profileToRow(p, userId)).eq('id', userId)
            setProfile(p)
            if (p.accountType === 'guardian' && !wasGuardian) await loadGuardianData()
          }}
          records={records}
          onSaveRecord={handleSaveRecord}
          recordError={recordError}
          onDismissRecordError={() => setRecordError(null)}
          onLogout={async () => {
            await supabase.auth.signOut()
          }}
          patient={patient}
          patientRecords={patientRecords}
          onRedeemCode={async (code) => {
            await redeemLinkCode(code)
            await loadGuardianData()
          }}
          onUnlinkPatient={async () => {
            await unlinkPatient(userId)
            setPatient(null)
            setPatientRecords([])
          }}
        />
      )}
    </main>
  )
}
