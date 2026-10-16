import type { Role, Staff } from './auth'

const roleLabels: Record<Role, string> = {
  meter_reader: 'เจ้าหน้าที่จดมาตร',
  office: 'เจ้าหน้าที่สำนักงาน',
  admin: 'ผู้ดูแลระบบ',
}

interface HomeProps {
  staff: Staff
  onLogout: () => void
}

/** Placeholder home screen until the admin's real pages arrive (#3 onward). */
export function Home({ staff, onLogout }: HomeProps) {
  return (
    <main>
      <h1>Watney Admin</h1>
      <p>
        เข้าสู่ระบบในชื่อ <strong>{staff.name || staff.email}</strong> ({roleLabels[staff.role]})
      </p>
      <button type="button" onClick={onLogout}>
        ออกจากระบบ
      </button>
    </main>
  )
}
