import { useState, type FormEvent } from 'react'
import { LoginError, type Auth, type LoginFailure, type Staff } from './auth'

const failureMessages: Record<LoginFailure | 'unknown', string> = {
  invalid: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  inactive: 'บัญชีนี้ถูกปิดใช้งาน ติดต่อผู้ดูแลระบบ',
  unreachable: 'ติดต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง',
  unknown: 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง',
}

interface LoginFormProps {
  auth: Auth
  onLogin: (staff: Staff) => void
}

export function LoginForm({ auth, onLogin }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      onLogin(await auth.login(String(form.get('email')), String(form.get('password'))))
    } catch (failure) {
      setError(failureMessages[failure instanceof LoginError ? failure.reason : 'unknown'])
      setPending(false)
    }
  }

  return (
    <main>
      <h1>Watney Admin</h1>
      <p>ระบบจัดเก็บค่าน้ำประปาหมู่บ้าน</p>
      <form aria-label="เข้าสู่ระบบ" onSubmit={handleSubmit}>
        <p>
          <label>
            อีเมล <input name="email" type="email" autoComplete="username" required />
          </label>
        </p>
        <p>
          <label>
            รหัสผ่าน <input name="password" type="password" autoComplete="current-password" required />
          </label>
        </p>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          เข้าสู่ระบบ
        </button>
      </form>
    </main>
  )
}
