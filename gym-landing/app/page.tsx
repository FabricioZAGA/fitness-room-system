import { GYM_CONFIG } from "@/lib/config";
import {
  Phone, MapPin, Clock, Camera, ChevronDown,
  Dumbbell, Star, Check, ArrowRight, Mail,
  MessageCircle, Calendar,
} from "lucide-react";

const c = GYM_CONFIG;
const waLink = `https://wa.me/${c.contact.whatsapp}?text=${encodeURIComponent(`Hola, me interesa una membresía en ${c.name} 💪`)}`;

export default function GymLanding() {
  return (
    <div className="min-h-screen bg-[--bg]">
      {/* ═══════ NAV ═══════ */}
      <nav className="glass sticky top-0 z-50 border-b border-[--border]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-extrabold" style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-hover))", color: "var(--bg)" }}>
              {c.logoText}
            </div>
            <span className="text-lg font-bold">{c.name}</span>
          </a>
          <div className="hidden items-center gap-1 md:flex">
            {["Nosotros","Clases","Planes","Horarios","Ubicación"].map((s) => (
              <a key={s} href={`#${s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`} className="rounded-xl px-4 py-2 text-sm text-[--text-muted] transition-all hover:bg-[--elevated] hover:text-[--text]">{s}</a>
            ))}
          </div>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-hover))", color: "var(--bg)", boxShadow: "0 4px 20px rgba(212,175,55,0.2)" }}>
            <span className="hidden sm:inline">Inscríbete</span>
            <span className="sm:hidden"><MessageCircle size={18} /></span>
          </a>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="relative flex min-h-[100vh] items-center justify-center overflow-hidden">
        {/* BG Image */}
        <div className="absolute inset-0">
          <img src={c.images.hero} alt={c.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,5,5,0.5) 0%, rgba(5,5,5,0.7) 50%, var(--bg) 100%)" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[--gold-bd] bg-[--gold-bg] px-5 py-2 text-sm font-medium text-[--gold]">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-[--gold]" style={{ animation: "pulse-soft 2s infinite" }} /><span className="relative inline-flex h-2 w-2 rounded-full bg-[--gold]" /></span>
              Cupo limitado — Inscríbete hoy
            </div>
          </div>

          <h1 className="animate-fade-up text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-7xl lg:text-8xl" style={{ animationDelay: "0.1s" }}>
            <span className="gradient-text">{c.tagline.split(",")[0]},</span>
            <br />
            <span className="text-[--text]">{c.tagline.split(",")[1]?.trim() || ""}</span>
          </h1>

          <p className="animate-fade-up mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[--text-muted] sm:text-xl" style={{ animationDelay: "0.25s" }}>
            {c.description}
          </p>

          <div className="animate-fade-up mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: "0.4s" }}>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-2xl px-10 py-4 text-base font-semibold transition-all hover:scale-[1.02] sm:w-auto" style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-hover))", color: "var(--bg)", boxShadow: "0 10px 40px rgba(212,175,55,0.3)" }}>
              <MessageCircle size={18} /> Clase de prueba gratis
            </a>
            <a href="#planes" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[--border] bg-[--surface]/80 px-10 py-4 text-base font-semibold text-[--text] transition-all hover:border-[--gold-bd] sm:w-auto">
              Ver planes <ArrowRight size={16} />
            </a>
          </div>
        </div>

        <a href="#nosotros" className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[--text-muted]" style={{ animation: "float 3s ease-in-out infinite" }}>
          <ChevronDown size={28} />
        </a>
      </section>

      {/* ═══════ ABOUT ═══════ */}
      <section id="nosotros" className="px-6 py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">Sobre nosotros</p>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Más que un gym,{" "}
              <span className="gradient-text">una comunidad</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[--text-muted]">
              En {c.name} creemos que el fitness es para todos. Nuestro equipo de coaches certificados
              te acompaña en cada paso — ya sea tu primera clase de Zumba o tu récord personal en CrossFit.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-6">
              {[
                { value: "500+", label: "Miembros activos" },
                { value: "6", label: "Clases diferentes" },
                { value: "3", label: "Coaches certificados" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-3xl font-extrabold text-[--gold]">{s.value}</p>
                  <p className="mt-1 text-sm text-[--text-muted]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-[--border]">
            <img src={c.images.about} alt="Interior del gym" className="img-zoom aspect-[4/3] w-full object-cover" loading="lazy" />
          </div>
        </div>
      </section>

      {/* ═══════ CLASSES ═══════ */}
      <section id="clases" className="px-6 py-28" style={{ background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.03), transparent)" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">Nuestras clases</p>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Encuentra tu actividad ideal</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.classes.map((cls) => (
              <div key={cls.name} className="card-hover group rounded-[20px] border border-[--border] bg-[--surface] p-7">
                <span className="mb-4 block text-4xl">{cls.emoji}</span>
                <h3 className="mb-1 text-xl font-bold">{cls.name}</h3>
                <div className="flex items-center gap-4 text-sm text-[--text-muted]">
                  <span className="flex items-center gap-1.5"><Clock size={14} className="text-[--gold]" /> {cls.time}</span>
                  <span className="flex items-center gap-1.5"><Calendar size={14} className="text-[--gold]" /> {cls.days}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TRAINERS ═══════ */}
      <section className="px-6 py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">Nuestro equipo</p>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Coaches que inspiran</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {c.trainers.map((t) => (
              <div key={t.name} className="card-hover group overflow-hidden rounded-[24px] border border-[--border] bg-[--surface]">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={t.image} alt={t.name} className="img-zoom h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold">{t.name}</h3>
                  <p className="text-sm text-[--gold]">{t.specialty}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PLANS ═══════ */}
      <section id="planes" className="px-6 py-28" style={{ background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.03), transparent)" }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-20 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">Membresías</p>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Elige tu plan</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[--text-muted]">Sin contratos. Sin inscripción. Solo resultados.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {c.plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-[24px] border p-8 transition-all ${plan.highlight ? "border-[--gold-bd] bg-[--elevated]" : "border-[--border] bg-[--surface]"}`}
                style={plan.highlight ? { boxShadow: "0 0 60px rgba(212,175,55,0.08)" } : undefined}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-bold" style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-hover))", color: "var(--bg)", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}>
                      <Star size={12} /> Más popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.period && <span className="text-[--text-muted]">{plan.period}</span>}
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-[--text-muted]">
                      <Check size={16} className="mt-0.5 shrink-0 text-[--gold]" /> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block rounded-2xl py-3.5 text-center text-sm font-semibold transition-all hover:scale-[1.02] ${plan.highlight ? "" : "border border-[--border] hover:border-[--gold-bd]"}`}
                  style={plan.highlight ? { background: "linear-gradient(135deg, var(--gold), var(--gold-hover))", color: "var(--bg)", boxShadow: "0 8px 30px rgba(212,175,55,0.2)" } : undefined}
                >
                  Inscribirme
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SCHEDULE ═══════ */}
      <section id="horarios" className="px-6 py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">Horarios</p>
          <h2 className="mb-12 text-4xl font-extrabold tracking-tight sm:text-5xl">Siempre abiertos para ti</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { day: "Lunes a Viernes", hours: c.schedule.weekdays },
              { day: "Sábado", hours: c.schedule.saturday },
              { day: "Domingo", hours: c.schedule.sunday },
            ].map((s) => (
              <div key={s.day} className="rounded-[20px] border border-[--border] bg-[--surface] p-6">
                <p className="mb-2 text-sm text-[--text-muted]">{s.day}</p>
                <p className="text-2xl font-bold text-[--gold]">{s.hours}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ LOCATION ═══════ */}
      <section id="ubicacion" className="px-6 py-28" style={{ background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.03), transparent)" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">Ubicación</p>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Visítanos</h2>
          </div>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-8 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-bd)" }}>
                  <MapPin size={22} className="text-[--gold]" />
                </div>
                <div>
                  <p className="font-semibold">{c.location.address}</p>
                  <p className="text-[--text-muted]">{c.location.city}, {c.location.state} {c.location.zip}</p>
                </div>
              </div>
              <div className="mb-8 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-bd)" }}>
                  <Phone size={22} className="text-[--gold]" />
                </div>
                <div>
                  <p className="font-semibold">{c.contact.phone}</p>
                  <p className="text-[--text-muted]">Llámanos o envíanos un WhatsApp</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--gold-bg)", border: "1px solid var(--gold-bd)" }}>
                  <Mail size={22} className="text-[--gold]" />
                </div>
                <div>
                  <p className="font-semibold">{c.contact.email}</p>
                  <p className="text-[--text-muted]">Escríbenos para más información</p>
                </div>
              </div>
              {/* Social */}
              <div className="mt-10 flex gap-3">
                {c.contact.instagram && (
                  <a href={`https://instagram.com/${c.contact.instagram}`} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-xl border border-[--border] text-[--text-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]">
                    <Camera size={20} />
                  </a>
                )}
                {c.contact.tiktok && (
                  <a href={`https://tiktok.com/@${c.contact.tiktok}`} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-xl border border-[--border] text-[--text-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]">
                    <Dumbbell size={20} />
                  </a>
                )}
              </div>
            </div>
            {/* Map */}
            <div className="overflow-hidden rounded-[24px] border border-[--border]">
              <iframe
                src={c.location.googleMapsUrl}
                width="100%"
                height="400"
                style={{ border: 0, filter: "invert(0.9) hue-rotate(180deg) brightness(0.8) contrast(1.2)" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación del gym"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA FINAL ═══════ */}
      <section className="relative overflow-hidden px-6 py-32">
        <div className="absolute inset-0">
          <img src={c.images.cta} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, var(--bg) 0%, rgba(5,5,5,0.85) 50%, var(--bg) 100%)" }} />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Tu primera clase es{" "}
            <span className="gradient-text">gratis</span>
          </h2>
          <p className="mt-6 text-xl text-[--text-muted]">
            Ven a conocernos. Sin compromiso, sin presión. Solo tú y tu mejor versión.
          </p>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-10 py-5 text-lg font-semibold transition-all hover:scale-[1.02] sm:w-auto"
              style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-hover))", color: "var(--bg)", boxShadow: "0 10px 40px rgba(212,175,55,0.3)" }}
            >
              <MessageCircle size={20} /> Agendar clase gratis
            </a>
            <a href={`tel:${c.contact.phone.replace(/\s/g, "")}`} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[--border] bg-[--surface]/80 px-10 py-5 text-lg font-semibold transition-all hover:border-[--gold-bd] sm:w-auto">
              <Phone size={18} /> Llamar ahora
            </a>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-[--border] bg-[--surface] px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold" style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-hover))", color: "var(--bg)" }}>
              {c.logoText}
            </div>
            <span className="font-bold">{c.name}</span>
          </div>
          <p className="text-xs text-[--text-dim]">
            {new Date().getFullYear()} {c.name}. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            {c.contact.instagram && (
              <a href={`https://instagram.com/${c.contact.instagram}`} target="_blank" rel="noopener noreferrer" className="text-[--text-muted] hover:text-[--gold]"><Camera size={18} /></a>
            )}
            <a href={`mailto:${c.contact.email}`} className="text-[--text-muted] hover:text-[--gold]"><Mail size={18} /></a>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-[--text-muted] hover:text-[--gold]"><MessageCircle size={18} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
