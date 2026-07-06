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
