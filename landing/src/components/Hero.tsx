"use client";

import { Zap, Shield, Globe } from "lucide-react";
import type { DictHero } from "@/lib/i18n";

const STAT_ICONS = [Globe, Zap, Shield];

export function Hero({ t }: { t: DictHero }) {
  return (
    <section className="relative overflow-hidden px-6 pb-32 pt-24">
      {/* Multi-layer background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% -5%, rgba(196,163,79,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle 600px at 80% 60%, rgba(196,163,79,0.04) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Floating orbs */}
      <div
        className="absolute left-1/4 top-20 h-2 w-2 rounded-full bg-[--gold] opacity-40"
        style={{ animation: "float 6s ease-in-out infinite" }}
      />
      <div
        className="absolute right-1/3 top-40 h-1.5 w-1.5 rounded-full bg-[--gold-hover] opacity-30"
        style={{ animation: "float 8s ease-in-out infinite 1s" }}
      />
      <div
        className="absolute left-1/3 bottom-40 h-1 w-1 rounded-full bg-[--gold-light] opacity-25"
        style={{ animation: "float 7s ease-in-out infinite 2s" }}
      />

      <div className="mx-auto max-w-5xl text-center">
        {/* Badge */}
        <div
          className="animate-fade-in mb-8 inline-flex items-center gap-2.5 rounded-full border px-5 py-2 text-sm font-medium"
          style={{
            borderColor: "var(--gold-bd)",
            background: "var(--gold-bg)",
            color: "var(--gold)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: "var(--gold)", animation: "pulse-glow 2s infinite" }}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[--gold]" />
          </span>
          {t.badge}
        </div>

        {/* Headline */}
        <h1 className="animate-slide-up text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-[--tx-primary]">{t.headline1}</span>
          <br className="hidden sm:block" />
          <span className="gradient-text">{t.headline2}</span>
        </h1>

        <p
          className="animate-slide-up mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[--tx-muted] sm:text-xl"
          style={{ animationDelay: "0.15s" }}
        >
          {t.subtitle}
        </p>

        {/* CTAs */}
        <div
          className="animate-slide-up mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          style={{ animationDelay: "0.3s" }}
        >
          <a
            href="#pricing"
            className="group relative w-full overflow-hidden rounded-2xl px-10 py-4 text-base font-semibold transition-all hover:scale-[1.02] sm:w-auto"
            style={{
              background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "0 10px 40px rgba(196,163,79,0.2)",
            }}
          >
            <span className="relative z-10">{t.ctaPrimary}</span>
          </a>
          <a
            href="#features"
            className="w-full rounded-2xl px-10 py-4 text-base font-semibold text-[--tx-primary] transition-all hover:bg-[--bg-elevated] sm:w-auto"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {t.ctaSecondary}
          </a>
        </div>

        {/* Stats */}
        <div
          className="animate-slide-up mx-auto mt-20 grid max-w-3xl grid-cols-3 gap-8"
          style={{ animationDelay: "0.45s" }}
        >
          {t.stats.map((stat, i) => {
            const Icon = STAT_ICONS[i] ?? Globe;
            return (
              <div key={stat.label} className="group text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[--bg-elevated] transition-all group-hover:bg-[--gold-bg]">
                  <Icon size={20} className="text-[--gold]" />
                </div>
                <p className="text-2xl font-bold text-[--tx-primary] sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-sm text-[--tx-muted]">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Trust strip */}
        <div
          className="animate-fade-in mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-[--tx-disabled]"
          style={{ animationDelay: "0.6s" }}
        >
          {t.trust.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i === 0 && <Shield size={14} className="text-[--gold]" />}
              {i === 1 && <span className="text-[--gold]">AWS</span>}
              {i === 2 && <Globe size={14} className="text-[--gold]" />}
              {i === 1 ? item.replace("AWS ", "") : item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
