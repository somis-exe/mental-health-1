'use client'

import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Heart className="size-5" fill="currentColor" strokeWidth={0} />
      </span>
      <span className="font-rounded text-lg font-extrabold tracking-tight text-foreground">
        MentalCare
      </span>
    </div>
  )
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-[0.97]',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function SelectPill({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex-1 rounded-2xl border px-3 py-3 text-sm font-medium transition-all active:scale-[0.98]',
        active
          ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40',
      )}
    >
      {children}
    </button>
  )
}

export function Section({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-3xl border border-border bg-card p-5 shadow-sm shadow-black/[0.02]',
        className,
      )}
    >
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-foreground">{children}</label>
  )
}

export function LeaveConfirmSheet({
  title = '保存しますか？',
  message = '入力中の内容がまだ保存されていません。移動する前に保存しますか？',
  canSave,
  saveLabel = '保存して移動する',
  discardLabel = '保存せずに移動する',
  cannotSaveHint,
  onSaveAndLeave,
  onDiscardAndLeave,
  onCancel,
}: {
  title?: string
  message?: string
  canSave: boolean
  saveLabel?: string
  discardLabel?: string
  cannotSaveHint?: string
  onSaveAndLeave: () => void
  onDiscardAndLeave: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/30 backdrop-blur-[2px]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mx-auto w-full max-w-md animate-in slide-in-from-bottom-4 rounded-t-3xl border border-border bg-background p-5 pb-8 shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1.5 text-lg font-extrabold text-foreground">{title}</h2>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{message}</p>
        <div className="flex flex-col gap-2.5">
          {canSave && (
            <button
              type="button"
              onClick={onSaveAndLeave}
              className="rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99]"
            >
              {saveLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onDiscardAndLeave}
            className="rounded-2xl border border-destructive/30 bg-destructive/5 py-3.5 text-sm font-bold text-destructive transition-all hover:bg-destructive/10 active:scale-[0.99]"
          >
            {discardLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl py-3 text-sm font-bold text-muted-foreground transition-all hover:bg-muted active:scale-[0.99]"
          >
            キャンセル
          </button>
        </div>
        {!canSave && cannotSaveHint && (
          <p className="mt-3 text-center text-xs text-muted-foreground">{cannotSaveHint}</p>
        )}
      </div>
    </div>
  )
}
