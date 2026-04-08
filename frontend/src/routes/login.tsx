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
    <div className="flex min-h-screen bg-[--bg-base]">
      {/* Left side - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12"
        style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1500 50%, #0a0a0a 100%)" }}
      >
        <div className="max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <div
              className="rounded-2xl p-6"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                boxShadow: "0 8px 32px var(--gold-bg)",
              }}
            >
              <Dumbbell className="h-20 w-20" style={{ color: "var(--gold-fg)" }} />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-[--tx-primary]">Fitness Room</h1>
          <p className="text-xl text-[--tx-muted]">
            Sistema de gestión para tu gimnasio. Simple, rápido y fácil de usar.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-[--gold]">500+</div>
              <div className="text-sm text-[--tx-muted]">Miembros</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[--gold]">50+</div>
              <div className="text-sm text-[--tx-muted]">Clases/semana</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[--gold]">10+</div>
              <div className="text-sm text-[--tx-muted]">Instructores</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-8 py-12 sm:px-12 lg:px-16 bg-[--bg-surface]">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="flex items-center gap-3">
              <div
                className="rounded-xl p-3"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                }}
              >
                <Dumbbell className="h-8 w-8" style={{ color: "var(--gold-fg)" }} />
              </div>
              <span className="text-2xl font-bold text-[--tx-primary]">Fitness Room</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[--tx-primary]">¡Bienvenido!</h2>
            <p className="mt-2 text-lg text-[--tx-muted]">
              Ingresa tus datos para acceder al sistema
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-[--color-danger-bg] border border-[--color-danger-bd] p-4">
              <p className="text-sm text-[--color-danger]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[--tx-primary]">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-[--tx-disabled]" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full rounded-xl border-2 border-[--bd-default] bg-[--bg-input] py-4 pl-12 pr-4 text-lg text-[--tx-primary] placeholder-[--tx-disabled] transition-colors focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bg]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-[--tx-primary]">
                Contraseña
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-[--tx-disabled]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border-2 border-[--bd-default] bg-[--bg-input] py-4 pl-12 pr-14 text-lg text-[--tx-primary] placeholder-[--tx-disabled] transition-colors focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bg]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-[--tx-disabled] hover:text-[--tx-primary]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-4 text-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--gold)",
              color: "var(--gold-fg)",
              boxShadow: "0 4px 16px var(--gold-bg)",
            }}
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
            <p className="text-[--tx-muted]">
              ¿Problemas para acceder?{" "}
              <a href="#" className="text-[--gold] hover:text-[--gold-hover]">
                Contacta al administrador
              </a>
            </p>
          </div>

          {/* Dev mode indicator */}
          {import.meta.env.VITE_APP_ENV === "local" && (
            <div className="mt-6 rounded-lg bg-[--color-warning-bg] border border-[--color-warning-bd] p-3 text-center">
              <p className="text-xs text-[--color-warning]">
                🛠️ Modo desarrollo — Login automático activado
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
