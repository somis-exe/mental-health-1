'use client'

import { useRef, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Logo, LeaveConfirmSheet } from '@/components/ui-kit'
import { BottomNav } from '@/components/bottom-nav'
import { DateChoiceSheet } from '@/components/date-choice-sheet'
import { DailyRecordScreen } from '@/components/screens/daily-record-screen'
import { RecordListScreen } from '@/components/screens/record-list-screen'
import { ReportScreen } from '@/components/screens/report-screen'
import { ProfileScreen, type ProfileScreenHandle } from '@/components/screens/profile-screen'
import { type Screen, type Profile, type DailyRecord, dayKey } from '@/lib/health'

const TITLES: Record<Screen, string> = {
  record: '体調記録',
  report: 'レポート',
  profile: '基本情報',
}

export function AppShell({
  profile,
  onUpdateProfile,
  records,
  onSaveRecord,
  recordError,
  onDismissRecordError,
  onLogout,
}: {
  profile: Profile
  onUpdateProfile: (p: Profile) => void
  records: DailyRecord[]
  onSaveRecord: (r: DailyRecord) => void
  recordError?: string | null
  onDismissRecordError?: () => void
  onLogout: () => void
}) {
  const [screen, setScreen] = useState<Screen>('record')
  const [recordView, setRecordView] = useState<'list' | 'input'>('list')
  const [showDateChoice, setShowDateChoice] = useState(false)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [reportVisited, setReportVisited] = useState(false)
  const profileRef = useRef<ProfileScreenHandle>(null)
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null)

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
      setPendingScreen(s)
      return
    }
    if (s === 'record') setRecordView('list')
    if (s === 'report') setReportVisited(true)
    setScreen(s)
  }

  const headerTitle =
    screen === 'record' && recordView === 'input' ? '体調記録の入力' : TITLES[screen]

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
            />
          ) : (
            <DailyRecordScreen
              key={activeDate ?? 'new'}
              date={activeDate ?? new Date().toISOString()}
              initialRecord={activeRecord}
              onSave={onSaveRecord}
              onBack={() => setRecordView('list')}
            />
          ))}
        {(screen === 'report' || reportVisited) && (
          <div className={screen === 'report' ? '' : 'hidden'}>
            <ReportScreen profile={profile} records={records} />
          </div>
        )}
        {screen === 'profile' && (
          <ProfileScreen ref={profileRef} profile={profile} onSave={onUpdateProfile} onLogout={onLogout} />
        )}
      </main>

      {showDateChoice && (
        <DateChoiceSheet onSelect={startNewRecord} onClose={() => setShowDateChoice(false)} />
      )}

      {pendingScreen && (
        <LeaveConfirmSheet
          canSave
          message="基本情報の変更が保存されていません。移動する前に保存しますか？"
          onSaveAndLeave={() => {
            profileRef.current?.save()
            const target = pendingScreen
            setPendingScreen(null)
            if (target === 'record') setRecordView('list')
            if (target === 'report') setReportVisited(true)
            setScreen(target)
          }}
          onDiscardAndLeave={() => {
            const target = pendingScreen
            setPendingScreen(null)
            if (target === 'record') setRecordView('list')
            if (target === 'report') setReportVisited(true)
            setScreen(target)
          }}
          onCancel={() => setPendingScreen(null)}
        />
      )}

      <BottomNav active={screen} onChange={goToTab} />
    </div>
  )
}
