'use client'

import { useRef, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Logo, LeaveConfirmSheet } from '@/components/ui-kit'
import { BottomNav } from '@/components/bottom-nav'
import { DateChoiceSheet } from '@/components/date-choice-sheet'
import { DailyRecordScreen, type DailyRecordScreenHandle } from '@/components/screens/daily-record-screen'
import { RecordListScreen } from '@/components/screens/record-list-screen'
import { ReportScreen } from '@/components/screens/report-screen'
import { ProfileScreen, type ProfileScreenHandle } from '@/components/screens/profile-screen'
import { PatientRecordsScreen } from '@/components/screens/patient-records-screen'
import { CombinedReportScreen } from '@/components/screens/combined-report-screen'
import { HospitalSearchScreen } from '@/components/screens/hospital-search-screen'
import { type Screen, type Profile, type DailyRecord, dayKey, periodTrackingEnabled } from '@/lib/health'
import { type LinkedPatient } from '@/lib/links'

const SELF_TITLES: Record<Screen, string> = {
  record: '体調記録',
  patient: '本人の記録',
  report: 'レポート',
  hospital: '病院検索',
  profile: '基本情報',
}

const GUARDIAN_TITLES: Record<Screen, string> = {
  record: 'みまもり記録',
  patient: '本人の記録',
  report: '総合レポート',
  hospital: '病院検索',
  profile: '基本情報',
}

export function AppShell({
  profile,
  userId,
  onUpdateProfile,
  records,
  onSaveRecord,
  recordError,
  onDismissRecordError,
  onLogout,
  patient = null,
  patientRecords = [],
  onRedeemCode,
  onUnlinkPatient,
}: {
  profile: Profile
  userId: string
  onUpdateProfile: (p: Profile) => void
  records: DailyRecord[]
  onSaveRecord: (r: DailyRecord) => void
  recordError?: string | null
  onDismissRecordError?: () => void
  onLogout: () => void
  patient?: LinkedPatient | null
  patientRecords?: DailyRecord[]
  onRedeemCode?: (code: string) => Promise<void>
  onUnlinkPatient?: () => Promise<void>
}) {
  const isGuardian = profile.accountType === 'guardian'
  const TITLES = isGuardian ? GUARDIAN_TITLES : SELF_TITLES
  const [screen, setScreen] = useState<Screen>('record')
  const [recordView, setRecordView] = useState<'list' | 'input'>('list')
  const [showDateChoice, setShowDateChoice] = useState(false)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [reportVisited, setReportVisited] = useState(false)
  const profileRef = useRef<ProfileScreenHandle>(null)
  const recordRef = useRef<DailyRecordScreenHandle>(null)
  const [pendingNav, setPendingNav] = useState<{ target: Screen; from: 'profile' | 'record' } | null>(null)

  const activeRecord = activeDate
    ? (records.find((r) => dayKey(r.date) === dayKey(activeDate)) ?? null)
    : null

  const startNewRecord = (iso: string) => {
    setActiveDate(iso)
    setShowDateChoice(false)
    setRecordView('input')
  }

  const startEditRecord = (r: DailyRecord) => {
    setActiveDate(r.date)
    setRecordView('input')
  }

  const goToTab = (s: Screen) => {
    if (screen === 'profile' && s !== 'profile' && profileRef.current?.isDirty()) {
      setPendingNav({ target: s, from: 'profile' })
      return
    }
    if (screen === 'record' && recordView === 'input' && recordRef.current?.isDirty()) {
      setPendingNav({ target: s, from: 'record' })
      return
    }
    if (s === 'record') setRecordView('list')
    if (s === 'report') setReportVisited(true)
    setScreen(s)
  }

  const headerTitle =
    screen === 'record' && recordView === 'input'
      ? isGuardian
        ? 'みまもり記録の入力'
        : '体調記録の入力'
      : TITLES[screen]

  const referenceRecord =
    isGuardian && activeDate
      ? (patientRecords.find((r) => dayKey(r.date) === dayKey(activeDate)) ?? null)
      : null

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/85 px-5 py-3.5 backdrop-blur-md">
        <Logo />
        <span className="text-sm font-semibold text-muted-foreground">{headerTitle}</span>
      </header>

      {recordError && (
        <div className="flex items-start gap-2 border-b border-destructive/20 bg-destructive/10 px-5 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{recordError}</span>
          <button
            type="button"
            onClick={onDismissRecordError}
            aria-label="閉じる"
            className="shrink-0 rounded-full p-0.5 hover:bg-destructive/15"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <main className="flex-1 pb-28">
        {screen === 'record' &&
          (recordView === 'list' ? (
            <RecordListScreen
              records={records}
              onNew={() => setShowDateChoice(true)}
              onEdit={startEditRecord}
              mode={isGuardian ? 'guardian' : 'self'}
            />
          ) : (
            <DailyRecordScreen
              ref={recordRef}
              key={activeDate ?? 'new'}
              date={activeDate ?? new Date().toISOString()}
              initialRecord={activeRecord}
              showPeriod={!isGuardian && periodTrackingEnabled(profile)}
              mode={isGuardian ? 'guardian' : 'self'}
              referenceRecord={referenceRecord}
              onSave={onSaveRecord}
              onBack={() => setRecordView('list')}
              onGoToHospitalSearch={isGuardian ? undefined : () => goToTab('hospital')}
            />
          ))}
        {screen === 'patient' && isGuardian && (
          <PatientRecordsScreen patient={patient} records={patientRecords} />
        )}
        {screen === 'hospital' && (
          <HospitalSearchScreen mode={isGuardian ? 'guardian' : 'self'} patientId={isGuardian ? undefined : userId} />
        )}
        {isGuardian
          ? screen === 'report' && (
              <CombinedReportScreen
                patient={patient}
                patientRecords={patientRecords}
                guardianRecords={records}
              />
            )
          : (screen === 'report' || reportVisited) && (
              <div className={screen === 'report' ? '' : 'hidden'}>
                <ReportScreen profile={profile} records={records} />
              </div>
            )}
        {screen === 'profile' && (
          <ProfileScreen
            ref={profileRef}
            profile={profile}
            userId={userId}
            onSave={onUpdateProfile}
            onLogout={onLogout}
            patient={patient}
            onRedeemCode={onRedeemCode}
            onUnlinkPatient={onUnlinkPatient}
          />
        )}
      </main>

      {showDateChoice && (
        <DateChoiceSheet onSelect={startNewRecord} onClose={() => setShowDateChoice(false)} />
      )}

      {pendingNav && (
        <LeaveConfirmSheet
          canSave={pendingNav.from === 'profile' ? true : (recordRef.current?.canSave() ?? false)}
          message={
            pendingNav.from === 'profile'
              ? '基本情報の変更が保存されていません。移動する前に保存しますか？'
              : '入力中の内容がまだ保存されていません。移動する前に保存しますか？'
          }
          cannotSaveHint={
            pendingNav.from === 'record' ? '保存するには気分を1つ以上選んでください' : undefined
          }
          onSaveAndLeave={() => {
            if (pendingNav.from === 'profile') profileRef.current?.save()
            else recordRef.current?.save()
            const target = pendingNav.target
            setPendingNav(null)
            if (target === 'record') setRecordView('list')
            if (target === 'report') setReportVisited(true)
            setScreen(target)
          }}
          onDiscardAndLeave={() => {
            const target = pendingNav.target
            setPendingNav(null)
            if (target === 'record') setRecordView('list')
            if (target === 'report') setReportVisited(true)
            setScreen(target)
          }}
          onCancel={() => setPendingNav(null)}
        />
      )}

      <BottomNav active={screen} onChange={goToTab} mode={profile.accountType} />
    </div>
  )
}
