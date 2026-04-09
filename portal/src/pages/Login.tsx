import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // For local development, use a mock token
    localStorage.setItem('id_token', 'local-dev-token')
    localStorage.setItem('student_id', 'local-dev-user')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[--bg-base] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[--gold] mb-2">Fitness Room</h1>
          <p className="text-[--tx-muted]">Portal del Alumno</p>
        </div>
        
        <div className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-[--tx-muted] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[--bd-default] bg-[--bg-muted] text-[--tx-primary] focus:border-[--gold] focus:outline-none"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-[--tx-muted] mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[--bd-default] bg-[--bg-muted] text-[--tx-primary] focus:border-[--gold] focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-[--color-danger]">{error}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl border border-[--gold-bd] bg-[--gold-bg] text-[--gold] font-semibold hover:bg-[--gold] hover:text-[--gold-fg] transition-colors"
            >
              Iniciar Sesión
            </button>
          </form>
          <p className="text-center text-sm text-[--tx-muted] mt-4">
            Modo desarrollo - Click para entrar
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
