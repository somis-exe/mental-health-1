import Link from 'next/link'
import { Logo } from '@/components/ui-kit'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div>
        <h1 className="text-lg font-bold text-foreground">ログインに失敗しました</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          認証リンクが無効か、期限切れの可能性があります。
          <br />
          もう一度お試しください。
        </p>
      </div>
      <Link
        href="/"
        className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
      >
        ログイン画面に戻る
      </Link>
    </div>
  )
}
