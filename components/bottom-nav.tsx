'use client'

import { NotebookPen, BarChart3, UserCog } from 'lucide-react'
import { type Screen } from '@/lib/health'
import { cn } from '@/lib/utils'

const ITEMS: { id: Screen; label: string; icon: typeof NotebookPen }[] = [
  { id: 'record', label: '体調記録', icon: NotebookPen },
  { id: 'report', label: 'レポート', icon: BarChart3 },
  { id: 'profile', label: '基本情報', icon: UserCog },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: Screen
  onChange: (s: Screen) => void
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 pb-6 pt-2">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-14 items-center justify-center rounded-full transition-all',
                  isActive ? 'bg-primary/12' : 'bg-transparent',
                )}
              >
                <Icon className="size-5.5" strokeWidth={isActive ? 2.4 : 2} />
              </span>
              <span className="text-[11px] font-semibold">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
