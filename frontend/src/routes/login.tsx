/**
 * Login page with Cognito authentication.
 * Clean, accessible design with large touch targets.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dumbbell, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate({ to: "/" });
    return <></>;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate({ to: "/" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 bg-gradient-to-br from-emerald-600 to-teal-700">
        <div className="max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
              <Dumbbell className="h-20 w-20 text-white" />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white">Fitness Room</h1>
          <p className="text-xl text-emerald-100">
            Sistema de gestión para tu gimnasio. Simple, rápido y fácil de usar.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-sm text-emerald-200">Miembros</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">50+</div>
              <div className="text-sm text-emerald-200">Clases/semana</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">10+</div>
              <div className="text-sm text-emerald-200">Instructores</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-8 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-600 p-3">
                <Dumbbell className="h-8 w-8 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Fitness Room</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">¡Bienvenido!</h2>
            <p className="mt-2 text-lg text-slate-400">
              Ingresa tus datos para acceder al sistema
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full rounded-xl border-2 border-slate-700 bg-slate-800/50 py-4 pl-12 pr-4 text-lg text-white placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border-2 border-slate-700 bg-slate-800/50 py-4 pl-12 pr-14 text-lg text-white placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          {/* Help text */}
          <div className="mt-8 text-center">
            <p className="text-slate-500">
              ¿Problemas para acceder?{" "}
              <a href="#" className="text-emerald-500 hover:text-emerald-400">
                Contacta al administrador
              </a>
            </p>
          </div>

          {/* Dev mode indicator */}
          {import.meta.env.VITE_APP_ENV === "local" && (
            <div className="mt-6 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
              <p className="text-xs text-amber-400">
                🛠️ Modo desarrollo — Login automático activado
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
