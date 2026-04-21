import { GYM_CONFIG } from "@/lib/config";
import {
  Phone, MapPin, Clock, Camera,
  Dumbbell, Star, Check, ArrowRight, Mail,
  MessageCircle, Calendar, Users, Shield, Sparkles,
} from "lucide-react";

const c = GYM_CONFIG;
const waLink = `https://wa.me/${c.contact.whatsapp}?text=${encodeURIComponent(`Hola, me interesa una membresía en ${c.name}`)}`;

/* ── DATA ── */
const SOCIAL_PROOF = [
  { value: "500+", label: "Miembros activos" },
  { value: "4.9", label: "Calificación Google" },
  { value: "6", label: "Disciplinas" },
  { value: "3+", label: "Años operando" },
];

const BENEFITS = [
  { icon: Shield, title: "Sin contratos", desc: "Cancela cuando quieras. Sin letra chica ni permanencias." },
  { icon: Users, title: "Comunidad real", desc: "Más de 500 miembros que te motivan cada día." },
  { icon: Sparkles, title: "Equipamiento premium", desc: "Equipo de última generación renovado constantemente." },
  { icon: Clock, title: "Horarios flexibles", desc: "Abiertos desde las 6 AM para que entrenes a tu ritmo." },
];

export default function GymLanding() {
  return (
    <div className="min-h-screen">

      {/* ═══ NAV ═══ */}
      <nav className="glass sticky top-0 z-50 border-b border-[--border-subtle]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <a href="#" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold" style={{ background: "linear-gradient(135deg, var(--gold-vivid), var(--gold-hover))", color: "var(--bg)" }}>
              {c.logoText}
            </div>
            <span className="text-[15px] font-semibold text-[--text]">{c.name}</span>
          </a>
          <div className="hidden items-center gap-0.5 md:flex">
            {[
              { label: "Beneficios", id: "beneficios" },
              { label: "Clases", id: "clases" },
              { label: "Planes", id: "planes" },
              { label: "Ubicación", id: "ubicacion" },
            ].map((s) => (
              <a key={s.id} href={`#${s.id}`} className="rounded-lg px-3.5 py-2 text-[13px] text-[--text-secondary] transition-all hover:text-[--text]">{s.label}</a>
            ))}
          </div>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-gold !py-2.5 !px-5 !text-[13px]">
            Clase gratis
          </a>
        </div>
      </nav>

      {/* ═══ HERO — CTA above the fold + social proof ═══ */}
      <section className="relative overflow-hidden">
        {/* Layered BG */}
        <div className="absolute inset-0">
          <img src={c.images.hero} alt={c.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0.75) 40%, rgba(10,10,11,0.92) 70%, var(--bg) 100%)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-24 text-center sm:pb-28 sm:pt-32">
          {/* Urgency badge */}
          <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-[--gold-bd] bg-[--gold-bg] px-4 py-1.5 text-[13px] font-medium text-[--gold]">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full rounded-full bg-[--gold]" style={{ animation: "pulse-dot 2s infinite" }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[--gold]" /></span>
            Primera clase totalmente gratis
          </div>

          <h1 className="animate-fade-up text-[clamp(2.2rem,6vw,3.8rem)] font-extrabold leading-[1.12] tracking-[-0.02em] text-[--text]" style={{ animationDelay: "0.08s" }}>
            {c.tagline.split(",")[0]},
            <br />
            <span className="text-[--gold-vivid]">{c.tagline.split(",")[1]?.trim()}</span>
          </h1>

          <p className="animate-fade-up mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[--text-secondary]" style={{ animationDelay: "0.16s" }}>
            Clases grupales, coaches certificados y la mejor comunidad fitness de {c.location.city}. Desde <span className="font-semibold text-[--gold]">$799/mes</span>.
          </p>

          {/* CTAs — above the fold */}
          <div className="animate-fade-up mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: "0.24s" }}>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-gold w-full sm:w-auto">
              <MessageCircle size={17} /> Agendar clase gratis
            </a>
            <a href="#planes" className="btn-ghost w-full sm:w-auto">
              Ver planes <ArrowRight size={15} />
            </a>
          </div>

          {/* Social proof strip — immediately after CTA */}
          <div className="animate-fade-up mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4" style={{ animationDelay: "0.36s" }}>
            {SOCIAL_PROOF.map((s) => (
              <div key={s.label} className="rounded-2xl border border-[--border-subtle] bg-[--surface]/60 px-4 py-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-[--gold-vivid]">{s.value}</p>
                <p className="mt-0.5 text-[12px] text-[--text-muted]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BENEFITS — Concrete value props ═══ */}
      <section id="beneficios" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="section-label">¿Por qué elegirnos?</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight text-[--text]">
              Todo lo que necesitas para transformarte
            </h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="card group p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[--gold-bg] border border-[--gold-bd] transition-transform group-hover:scale-110">
                  <b.icon size={20} className="text-[--gold]" />
                </div>
                <h3 className="mb-1.5 text-[15px] font-semibold text-[--text]">{b.title}</h3>
                <p className="text-[13px] leading-relaxed text-[--text-muted]">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ═══ ABOUT — Story with image ═══ */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          <div className="group overflow-hidden rounded-[var(--r-xl)] border border-[--border]">
            <img src={c.images.about} alt="Interior del gym" className="img-cover aspect-[4/3]" loading="lazy" />
          </div>
          <div>
            <p className="section-label">Nuestra historia</p>
            <h2 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold leading-tight text-[--text]">
              Más que un gym, una comunidad que te impulsa
            </h2>
            <p className="mt-5 text-[15px] leading-[1.75] text-[--text-secondary]">
              En {c.name} creemos que cada persona merece un espacio donde sentirse bienvenida.
              Nuestros coaches certificados te acompañan en cada paso — ya sea tu primera clase
              o tu récord personal. Llevamos más de 3 años transformando vidas en {c.location.city}.
            </p>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-gold mt-8">
              Conoce nuestras instalaciones
            </a>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ═══ CLASSES ═══ */}
      <section id="clases" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="section-label">Nuestras clases</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight text-[--text]">
              Encuentra tu actividad ideal
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[--text-secondary]">
              Desde energía pura hasta calma total. Hay una clase para ti.
            </p>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.classes.map((cls) => (
              <div key={cls.name} className="card group flex items-start gap-5 p-5">
                <span className="shrink-0 text-3xl">{cls.emoji}</span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-[--text]">{cls.name}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[--text-muted]">
                    <span className="flex items-center gap-1"><Clock size={12} className="text-[--gold]" /> {cls.time}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} className="text-[--gold]" /> {cls.days}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRAINERS ═══ */}
      <section className="px-6 py-24 bg-[--bg-warm]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="section-label">Nuestro equipo</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight text-[--text]">
              Coaches que inspiran resultados
            </h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {c.trainers.map((t) => (
              <div key={t.name} className="card group overflow-hidden">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={t.image} alt={t.name} className="img-cover" loading="lazy" />
                </div>
                <div className="p-5">
                  <h3 className="text-[15px] font-semibold text-[--text]">{t.name}</h3>
                  <p className="text-[13px] text-[--gold]">{t.specialty}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PLANS ═══ */}
      <section id="planes" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="section-label">Membresías</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight text-[--text]">
              Elige tu plan perfecto
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-[--text-secondary]">Sin contratos, sin cuota de inscripción. Cancela cuando quieras.</p>
          </div>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {c.plans.map((plan) => {
              const isHl = plan.highlight;
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-[var(--r-xl)] border p-7 transition-all ${isHl ? "border-[--gold-bd] bg-[--elevated]" : "card"}`}
                  style={isHl ? { boxShadow: "0 0 80px rgba(201,168,76,0.06), 0 0 0 1px var(--gold-bd)" } : undefined}
                >
                  {isHl && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="btn-gold !py-1 !px-3.5 !text-[11px] !gap-1 !rounded-full">
                        <Star size={11} /> Más popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-[--text]">{plan.name}</h3>
                  <div className="mt-3 mb-5">
                    <span className="text-3xl font-extrabold text-[--text]">{plan.price}</span>
                    {plan.period && <span className="text-[13px] text-[--text-muted]">{plan.period}</span>}
                  </div>
                  <ul className="mb-7 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] text-[--text-secondary]">
                        <Check size={15} className="mt-0.5 shrink-0 text-[--gold]" /> {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={isHl ? "btn-gold w-full justify-center" : "btn-ghost w-full justify-center"}
                  >
                    Inscribirme
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ═══ SCHEDULE ═══ */}
      <section id="horarios" className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-label justify-center">Horarios</p>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight text-[--text]">Siempre abiertos para ti</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { day: "Lunes a Viernes", hours: c.schedule.weekdays },
              { day: "Sábado", hours: c.schedule.saturday },
              { day: "Domingo", hours: c.schedule.sunday },
            ].map((s) => (
              <div key={s.day} className="card p-5 text-center">
                <p className="text-[13px] text-[--text-muted]">{s.day}</p>
                <p className="mt-2 text-xl font-bold text-[--gold-vivid]">{s.hours}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LOCATION ═══ */}
      <section id="ubicacion" className="px-6 py-24 bg-[--bg-warm]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="section-label justify-center">Ubicación</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight text-[--text]">Visítanos</h2>
          </div>
          <div className="mt-14 grid items-start gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              {[
                { icon: MapPin, main: c.location.address, sub: `${c.location.city}, ${c.location.state} ${c.location.zip}` },
                { icon: Phone, main: c.contact.phone, sub: "Llámanos o envíanos WhatsApp" },
                { icon: Mail, main: c.contact.email, sub: "Escríbenos para más info" },
              ].map((item) => (
                <div key={item.main} className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[--gold-bg] border border-[--gold-bd]">
                    <item.icon size={19} className="text-[--gold]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[--text]">{item.main}</p>
                    <p className="text-[13px] text-[--text-muted]">{item.sub}</p>
                  </div>
                </div>
              ))}
              {/* Social */}
              <div className="flex gap-2.5 pt-2">
                {c.contact.instagram && (
                  <a href={`https://instagram.com/${c.contact.instagram}`} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[--border] text-[--text-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]">
                    <Camera size={17} />
                  </a>
                )}
                {c.contact.tiktok && (
                  <a href={`https://tiktok.com/@${c.contact.tiktok}`} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[--border] text-[--text-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]">
                    <Dumbbell size={17} />
                  </a>
                )}
              </div>
            </div>
            <div className="overflow-hidden rounded-[var(--r-xl)] border border-[--border]">
              <iframe
                src={c.location.googleMapsUrl}
                width="100%"
                height="380"
                style={{ border: 0, filter: "invert(0.92) hue-rotate(180deg) brightness(0.75) contrast(1.3) saturate(0.3)" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación del gym"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="relative overflow-hidden px-6 py-28">
        <div className="absolute inset-0">
          <img src={c.images.cta} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-[--bg]/80" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="section-label justify-center">Da el primer paso</p>
          <h2 className="text-[clamp(1.8rem,5vw,3rem)] font-bold tracking-tight text-[--text]">
            Tu primera clase es <span className="text-[--gold-vivid]">gratis</span>
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[--text-secondary]">
            Ven a conocernos. Sin compromiso, sin presión. Solo tú y tu mejor versión.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-gold w-full sm:w-auto">
              <MessageCircle size={17} /> Agendar clase gratis
            </a>
            <a href={`tel:${c.contact.phone.replace(/\s/g, "")}`} className="btn-ghost w-full sm:w-auto">
              <Phone size={16} /> Llamar ahora
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[--border-subtle] px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-extrabold" style={{ background: "linear-gradient(135deg, var(--gold-vivid), var(--gold-hover))", color: "var(--bg)" }}>
              {c.logoText}
            </div>
            <span className="text-[14px] font-semibold text-[--text-secondary]">{c.name}</span>
          </div>
          <p className="text-[12px] text-[--text-dim]">
            © {new Date().getFullYear()} {c.name}. Todos los derechos reservados.
          </p>
          <div className="flex gap-3">
            {c.contact.instagram && (
              <a href={`https://instagram.com/${c.contact.instagram}`} target="_blank" rel="noopener noreferrer" className="text-[--text-muted] transition-colors hover:text-[--gold]"><Camera size={16} /></a>
            )}
            <a href={`mailto:${c.contact.email}`} className="text-[--text-muted] transition-colors hover:text-[--gold]"><Mail size={16} /></a>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-[--text-muted] transition-colors hover:text-[--gold]"><MessageCircle size={16} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
