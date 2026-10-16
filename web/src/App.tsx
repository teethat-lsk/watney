import { useState } from 'react'
import type { Auth, Staff } from './auth'
import { Home } from './Home'
import { LoginForm } from './LoginForm'

function App({ auth }: { auth: Auth }) {
  const [staff, setStaff] = useState<Staff | null>(() => auth.current())

  if (!staff) {
    return <LoginForm auth={auth} onLogin={setStaff} />
  }

  function logout() {
    auth.logout()
    setStaff(null)
  }

  return <Home staff={staff} onLogout={logout} />
}

export default App
