/**
 * Login page with Cognito authentication.
 * Handles: login, new-password-required, forgot password, confirm reset.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, type AuthStep } from "@/contexts/AuthContext";
import { Dumbbell, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, KeyRound, ShieldCheck, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isKeepSessionEnabled, setKeepSession } from "@/lib/sessionPreferences";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const inputClass =
  "w-full rounded-xl border-2 border-[--bd-default] bg-[--bg-input] py-4 pl-12 pr-4 text-lg text-[--tx-primary] placeholder-[--tx-disabled] transition-colors focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bg]";
const inputClassPr14 =
  "w-full rounded-xl border-2 border-[--bd-default] bg-[--bg-input] py-4 pl-12 pr-14 text-lg text-[--tx-primary] placeholder-[--tx-disabled] transition-colors focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bg]";

function GoldButton({ children, disabled, onClick, type = "button" }: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}): React.JSX.Element {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-xl py-4 text-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: "var(--gold)", color: "var(--gold-fg)", boxShadow: "0 4px 16px var(--gold-bg)" }}
    >
      {children}
    </button>
  );
}

function PasswordInput({ id, value, onChange, placeholder, show, onToggle }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <Lock className="h-5 w-5 text-[--tx-disabled]" />
      </div>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className={inputClassPr14}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-[--tx-disabled] hover:text-[--tx-primary]"
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

function LoginPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    login, isAuthenticated, authStep,
    completeNewPassword, forgotPassword, confirmForgotPassword, resetAuthStep,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localStep, setLocalStep] = useState<"login" | "forgotPassword" | "confirmReset">("login");
  const [keepSession, setKeepSessionState] = useState<boolean>(() => isKeepSessionEnabled());

  const step: AuthStep | "forgotPassword" | "confirmReset" =
    authStep !== "login" ? authStep : localStep;

  if (isAuthenticated) {
    navigate({ to: "/" });
    return <></>;
  }

  function clearState(): void {
    setError(null);
    setSuccessMsg(null);
    setNewPw("");
    setConfirmPw("");
    setResetCode("");
    setShowNewPw(false);
  }

  async function handleLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      setKeepSession(keepSession);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNewPassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (newPw !== confirmPw) { setError(t("login.passwordMismatch")); return; }
    if (newPw.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    setError(null);
    setIsLoading(true);
    try {
      await completeNewPassword(newPw);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar contraseña");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email) { setError("Ingresa tu correo electrónico primero"); return; }
    setError(null);
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setLocalStep("confirmReset");
      setSuccessMsg("Te enviamos un código de verificación a tu correo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar código");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmReset(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (newPw !== confirmPw) { setError(t("login.passwordMismatch")); return; }
    if (newPw.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    setError(null);
    setIsLoading(true);
    try {
      await confirmForgotPassword(email, resetCode, newPw);
      setLocalStep("login");
      setSuccessMsg("Contraseña actualizada. Inicia sesión con tu nueva contraseña.");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al restaurar contraseña");
    } finally {
      setIsLoading(false);
    }
  }

  function goBack(): void {
    clearState();
    resetAuthStep();
    setLocalStep("login");
  }

  const titles: Record<string, { heading: string; sub: string }> = {
    login: { heading: t("login.welcome"), sub: t("login.subtitle") },
    newPasswordRequired: { heading: t("login.changePassword"), sub: t("login.changePasswordSubtitle") },
    forgotPassword: { heading: t("login.recoverPassword"), sub: t("login.recoverSubtitle") },
    confirmReset: { heading: t("login.restorePassword"), sub: t("login.restoreSubtitle") },
  };

  const { heading, sub } = titles[step] ?? titles.login;

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
          <p className="text-xl text-[--tx-muted]">{t("login.tagline")}</p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-[--gold]">500+</div>
              <div className="text-sm text-[--tx-muted]">{t("login.members")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[--gold]">50+</div>
              <div className="text-sm text-[--tx-muted]">{t("login.classesPerWeek")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[--gold]">10+</div>
              <div className="text-sm text-[--tx-muted]">{t("nav.instructors")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-8 py-12 sm:px-12 lg:px-16 bg-[--bg-surface]">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-6 flex justify-center lg:hidden">
            <div className="flex items-center gap-3">
              <div
                className="rounded-xl p-3"
                style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)" }}
              >
                <Dumbbell className="h-8 w-8" style={{ color: "var(--gold-fg)" }} />
              </div>
              <span className="text-2xl font-bold text-[--tx-primary]">Fitness Room</span>
            </div>
          </div>

          {/* App identifier badge */}
          <div className="mb-8 flex justify-center">
            <div
              className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{
                background: "var(--gold-bg)",
                borderColor: "var(--gold)",
                color: "var(--gold)",
              }}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Panel Administrativo</span>
            </div>
          </div>

          {/* Back button for sub-flows */}
          {step !== "login" && (
            <button onClick={goBack} className="mb-6 flex items-center gap-2 text-[--tx-muted] hover:text-[--gold] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">{t("login.backToLogin")}</span>
            </button>
          )}

          {/* Step icon */}
          {step === "newPasswordRequired" && (
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl p-4" style={{ background: "var(--gold-bg)" }}>
                <KeyRound className="h-10 w-10 text-[--gold]" />
              </div>
            </div>
          )}
          {(step === "forgotPassword" || step === "confirmReset") && (
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl p-4" style={{ background: "var(--gold-bg)" }}>
                <ShieldCheck className="h-10 w-10 text-[--gold]" />
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[--tx-primary]">{heading}</h2>
            <p className="mt-2 text-lg text-[--tx-muted]">{sub}</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-[--color-danger-bg] border border-[--color-danger-bd] p-4">
              <p className="text-sm text-[--color-danger]">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 rounded-xl p-4" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <p className="text-sm" style={{ color: "#22c55e" }}>{successMsg}</p>
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {step === "login" && (
            <>
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-[--tx-primary]">
                    {t("login.email")}
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-5 w-5 text-[--tx-disabled]" />
                    </div>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com" required className={inputClass} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-[--tx-primary]">{t("login.password")}</label>
                    <button type="button" onClick={() => { clearState(); setLocalStep("forgotPassword"); }}
                      className="text-sm text-[--gold] hover:text-[--gold-hover] transition-colors">
                      {t("login.forgotPassword")}
                    </button>
                  </div>
                  <PasswordInput id="password" value={password} onChange={setPassword}
                    placeholder="••••••••" show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[--bd-subtle] px-4 py-3 transition-colors hover:bg-[--bg-muted]">
                  <input
                    type="checkbox"
                    checked={keepSession}
                    onChange={(e) => setKeepSessionState(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[--gold]"
                  />
                  <div>
                    <div className="text-sm font-medium text-[--tx-primary]">
                      {t("login.keepSession")}
                    </div>
                    <div className="text-xs text-[--tx-muted]">
                      {t("login.keepSessionHelp")}
                    </div>
                  </div>
                </label>
                <GoldButton type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" /> {t("login.loading")}
                    </span>
                  ) : t("login.login")}
                </GoldButton>
              </form>
              {import.meta.env.VITE_APP_ENV === "local" && (
                <div className="mt-6 rounded-lg bg-[--color-warning-bg] border border-[--color-warning-bd] p-3 text-center">
                  <p className="text-xs text-[--color-warning]">{t("login.devMode")}</p>
                </div>
              )}
              <div className="mt-8 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] p-4 text-center">
                <p className="text-xs text-[--tx-muted]">¿Eres socio del gym?</p>
                <a
                  href="https://portal.fitnessroom.mx"
                  className="mt-1 inline-block text-sm font-semibold text-[--gold] hover:text-[--gold-hover] transition-colors"
                >
                  Ir al Portal del Socio →
                </a>
              </div>
            </>
          )}

          {/* ── NEW PASSWORD REQUIRED ── */}
          {step === "newPasswordRequired" && (
            <form onSubmit={handleNewPassword} className="space-y-6">
              <div>
                <label htmlFor="newPw" className="mb-2 block text-sm font-medium text-[--tx-primary]">{t("login.newPassword")}</label>
                <PasswordInput id="newPw" value={newPw} onChange={setNewPw}
                  placeholder={t("login.minCharsPlaceholder")} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />
              </div>
              <div>
                <label htmlFor="confirmPw" className="mb-2 block text-sm font-medium text-[--tx-primary]">{t("login.confirmPassword")}</label>
                <PasswordInput id="confirmPw" value={confirmPw} onChange={setConfirmPw}
                  placeholder={t("login.repeatPasswordPlaceholder")} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />
                {confirmPw.length > 0 && newPw !== confirmPw && (
                  <p className="mt-2 text-sm text-[--color-danger]">{t("login.passwordMismatch")}</p>
                )}
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--gold-bg)" }}>
                <p className="text-xs text-[--tx-muted]">{t("login.passwordRequirements")}</p>
              </div>
              <GoldButton type="submit" disabled={isLoading || newPw.length < 8 || newPw !== confirmPw}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> {t("login.changing")}
                  </span>
                ) : t("login.changePassword")}
              </GoldButton>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {step === "forgotPassword" && (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label htmlFor="resetEmail" className="mb-2 block text-sm font-medium text-[--tx-primary]">
                  {t("login.email")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail className="h-5 w-5 text-[--tx-disabled]" />
                  </div>
                  <input id="resetEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com" required className={inputClass} />
                </div>
              </div>
              <GoldButton type="submit" disabled={isLoading || !email}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> {t("login.sendingCode")}
                  </span>
                ) : t("login.sendCode")}
              </GoldButton>
            </form>
          )}

          {/* ── CONFIRM RESET ── */}
          {step === "confirmReset" && (
            <form onSubmit={handleConfirmReset} className="space-y-6">
              <div>
                <label htmlFor="code" className="mb-2 block text-sm font-medium text-[--tx-primary]">{t("login.verificationCode")}</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <ShieldCheck className="h-5 w-5 text-[--tx-disabled]" />
                  </div>
                  <input id="code" type="text" value={resetCode} onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456" required maxLength={6}
                    className={inputClass} style={{ letterSpacing: "4px", fontFamily: "monospace" }} />
                </div>
              </div>
              <div>
                <label htmlFor="resetNewPw" className="mb-2 block text-sm font-medium text-[--tx-primary]">{t("login.newPassword")}</label>
                <PasswordInput id="resetNewPw" value={newPw} onChange={setNewPw}
                  placeholder={t("login.minCharsPlaceholder")} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />
              </div>
              <div>
                <label htmlFor="resetConfirmPw" className="mb-2 block text-sm font-medium text-[--tx-primary]">{t("login.confirmPassword")}</label>
                <PasswordInput id="resetConfirmPw" value={confirmPw} onChange={setConfirmPw}
                  placeholder={t("login.repeatPasswordPlaceholder")} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />
                {confirmPw.length > 0 && newPw !== confirmPw && (
                  <p className="mt-2 text-sm text-[--color-danger]">{t("login.passwordMismatch")}</p>
                )}
              </div>
              <GoldButton type="submit" disabled={isLoading || !resetCode || newPw.length < 8 || newPw !== confirmPw}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> {t("login.restoring")}
                  </span>
                ) : t("login.restorePassword")}
              </GoldButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
