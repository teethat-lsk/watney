import type { Staff } from './auth'

export function Home({ staff }: { staff: Staff }) {
  return (
    <>
      <h1>ระบบจัดเก็บค่าน้ำประปาหมู่บ้าน</h1>
      {staff.role === 'meter_reader' ? (
        <p>เจ้าหน้าที่จดมาตรใช้งานผ่านแอปจดมาตรบนมือถือ</p>
      ) : (
        <p>เลือกเมนูด้านบนเพื่อเริ่มใช้งาน</p>
      )}
    </>
  )
}
