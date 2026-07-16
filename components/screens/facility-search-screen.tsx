'use client'

import { useState } from 'react'
import { ChevronLeft, MapPin, Navigation, Phone, Search } from 'lucide-react'
import { Section } from '@/components/ui-kit'

const HOTLINES = [
  { name: 'よりそいホットライン', note: '24時間・無料', tel: '0120279338', display: '0120-279-338' },
  { name: 'いのちの電話', note: '', tel: '0570783556', display: '0570-783-556' },
]

function openMapSearch(query: string) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function FacilitySearchScreen({ onBack }: { onBack: () => void }) {
  const [area, setArea] = useState('')

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

  const searchByArea = () => {
    openMapSearch(area.trim() ? `心療内科 精神科 ${area.trim()}` : '心療内科 精神科')
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="-mb-1 -ml-1 flex w-fit items-center gap-1 rounded-full py-1 pr-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4.5" />
        戻る
      </button>

      <div>
        <h1 className="text-lg font-bold text-foreground">医療機関検索</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          近くの心療内科・精神科や相談窓口を探せます。
        </p>
      </div>

      <Section title="近くの医療機関を探す" icon={<MapPin className="size-4.5 text-primary" />}>
        <button
          type="button"
          onClick={searchNearMe}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99]"
        >
          <Navigation className="size-4" />
          現在地から探す
        </button>

        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground" htmlFor="facility-area">
            地域を指定して探す
          </label>
          <div className="flex gap-2">
            <input
              id="facility-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchByArea()}
              placeholder="例）東京都渋谷区"
              className="w-full flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={searchByArea}
              aria-label="検索"
              className="flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]"
            >
              <Search className="size-4.5" />
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Googleマップで検索結果を開きます。
        </p>
      </Section>

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
      </Section>
    </div>
  )
}
