'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link2, Loader2, Copy, Check, UserRound, X } from 'lucide-react'
import { Section } from '@/components/ui-kit'
import {
  issueLinkCode,
  fetchActiveCodes,
  fetchLinkedGuardians,
  revokeGuardian,
  type ActiveLinkCode,
  type LinkedGuardian,
  type LinkedPatient,
} from '@/lib/links'

function formatExpiry(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 本人アカウント用: 連携コードの発行と、連携中の保護者の管理。 */
export function PatientLinkSettings({ userId }: { userId: string }) {
  const [codes, setCodes] = useState<ActiveLinkCode[]>([])
  const [guardians, setGuardians] = useState<LinkedGuardian[]>([])
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<LinkedGuardian | null>(null)

  const reload = useCallback(async () => {
    try {
      const [c, g] = await Promise.all([fetchActiveCodes(userId), fetchLinkedGuardians()])
      setCodes(c)
      setGuardians(g)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました。')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  const handleIssue = async () => {
    setIssuing(true)
    setError(null)
    try {
      const issued = await issueLinkCode(userId)
      setCodes((prev) => [issued, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'コードの発行に失敗しました。')
    } finally {
      setIssuing(false)
    }
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      setCopiedCode(null)
    }
  }

  const handleRevoke = async (g: LinkedGuardian) => {
    setError(null)
    try {
      await revokeGuardian(g.id)
      setGuardians((prev) => prev.filter((x) => x.id !== g.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '連携の解除に失敗しました。')
    } finally {
      setConfirmRevoke(null)
    }
  }

  return (
    <Section title="保護者との連携" icon={<Link2 className="size-4.5 text-primary" />}>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        連携コードを発行して保護者に伝えると、保護者があなたの体調記録（メモ・希死念慮・自傷の記録を除く）を見られるようになります。コードの有効期限は24時間です。
      </p>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {guardians.length > 0 && (
            <div className="mb-4 flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">連携中の保護者</p>
              {guardians.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-2.5 rounded-2xl border border-border bg-background px-4 py-3"
                >
                  <UserRound className="size-4 shrink-0 text-primary" />
                  <span className="flex-1 truncate text-sm font-semibold text-foreground">
                    {g.nickname || '保護者'}さん
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(g)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10"
                  >
                    解除
                  </button>
                </div>
              ))}
            </div>
          )}

          {codes.length > 0 && (
            <div className="mb-4 flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">発行済みのコード（未使用）</p>
              {codes.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/[0.05] px-4 py-3"
                >
                  <span className="flex-1 font-mono text-lg font-extrabold tracking-[0.2em] text-foreground">
                    {c.code}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatExpiry(c.expires_at)}まで
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(c.code)}
                    aria-label="コードをコピー"
                    className="shrink-0 rounded-full p-2 text-primary transition-colors hover:bg-primary/10"
                  >
                    {copiedCode === c.code ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

          <button
            type="button"
            onClick={handleIssue}
            disabled={issuing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 py-3 text-sm font-bold text-primary transition-all hover:bg-primary/15 active:scale-[0.99] disabled:opacity-60"
          >
            {issuing ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            連携コードを発行する
          </button>
        </>
      )}

      {confirmRevoke && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/30 backdrop-blur-[2px]"
          onClick={() => setConfirmRevoke(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mx-auto w-full max-w-md animate-in slide-in-from-bottom-4 rounded-t-3xl border border-border bg-background p-5 pb-8 shadow-2xl duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1.5 text-lg font-extrabold text-foreground">連携を解除しますか？</h2>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              {confirmRevoke.nickname || '保護者'}さんはあなたの記録を見られなくなります。
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleRevoke(confirmRevoke)}
                className="rounded-2xl bg-destructive py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.99]"
              >
                連携を解除する
              </button>
              <button
                type="button"
                onClick={() => setConfirmRevoke(null)}
                className="rounded-2xl py-3 text-sm font-bold text-muted-foreground transition-all hover:bg-muted active:scale-[0.99]"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  )
}

/** 保護者アカウント用: コード入力による連携と、連携中の本人の表示・解除。 */
export function GuardianLinkSettings({
  patient,
  onRedeemCode,
  onUnlinkPatient,
}: {
  patient: LinkedPatient | null
  onRedeemCode: (code: string) => Promise<void>
  onUnlinkPatient: () => Promise<void>
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmUnlink, setConfirmUnlink] = useState(false)

  const handleRedeem = async () => {
    if (!code.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onRedeemCode(code.trim())
      setCode('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '連携に失敗しました。')
    } finally {
      setBusy(false)
    }
  }

  const handleUnlink = async () => {
    setBusy(true)
    setError(null)
    try {
      await onUnlinkPatient()
    } catch (e) {
      setError(e instanceof Error ? e.message : '連携の解除に失敗しました。')
    } finally {
      setBusy(false)
      setConfirmUnlink(false)
    }
  }

  return (
    <Section title="本人との連携" icon={<Link2 className="size-4.5 text-primary" />}>
      {patient ? (
        <>
          <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-background px-4 py-3">
            <UserRound className="size-4 shrink-0 text-primary" />
            <span className="flex-1 truncate text-sm font-semibold text-foreground">
              {patient.nickname || '本人'}さんと連携中
            </span>
            <button
              type="button"
              onClick={() => setConfirmUnlink(true)}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10"
            >
              解除
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </>
      ) : (
        <>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            本人のアカウントで発行した連携コードを入力してください。
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="例：ABCD2345"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-center font-mono text-lg font-bold tracking-[0.2em] text-foreground outline-none transition-all placeholder:text-sm placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <button
            type="button"
            onClick={handleRedeem}
            disabled={busy || code.trim().length < 8}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            連携する
          </button>
        </>
      )}

      {confirmUnlink && patient && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/30 backdrop-blur-[2px]"
          onClick={() => setConfirmUnlink(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mx-auto w-full max-w-md animate-in slide-in-from-bottom-4 rounded-t-3xl border border-border bg-background p-5 pb-8 shadow-2xl duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1.5 text-lg font-extrabold text-foreground">連携を解除しますか？</h2>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              {patient.nickname || '本人'}さんの記録が見られなくなります。再度連携するには新しいコードが必要です。
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleUnlink}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                連携を解除する
              </button>
              <button
                type="button"
                onClick={() => setConfirmUnlink(false)}
                className="rounded-2xl py-3 text-sm font-bold text-muted-foreground transition-all hover:bg-muted active:scale-[0.99]"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  )
}
