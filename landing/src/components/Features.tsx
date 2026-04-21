import {
  Zap, CreditCard, CalendarDays, Users, LayoutDashboard,
  GraduationCap, QrCode, Smartphone, Snowflake, BarChart3,
  Mail, Moon, Globe, type LucideIcon,
} from "lucide-react";
import type { DictFeatures } from "@/lib/i18n";

const ICONS: LucideIcon[] = [
  Zap, CreditCard, CalendarDays, Users, LayoutDashboard,
  GraduationCap, QrCode, Smartphone, Snowflake, BarChart3,
  Mail, Moon, Globe,
];
const SPANS = [0, 4, 7]; // indices that get sm:col-span-2

export function Features({ t }: { t: DictFeatures }) {
  return (
    <section id="features" className="px-6 py-28">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-20 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[--gold]">
            {t.label}
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-[--tx-primary] sm:text-5xl">
            {t.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[--tx-muted]">
            {t.subtitle}
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.items.map((f, i) => {
            const Icon = ICONS[i] ?? Globe;
            return (
              <div
                key={f.title}
                className={`card-hover group rounded-[20px] p-6 ${SPANS.includes(i) ? "sm:col-span-2" : ""}`}
              >
                {/* Icon */}
                <div
                  className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl transition-all group-hover:scale-110"
                  style={{ background: "var(--gold-bg)" }}
                >
                  <Icon size={20} className="text-[--gold]" />
                </div>

                <h3 className="mb-2 text-base font-semibold text-[--tx-primary]">{f.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-[--tx-muted]">{f.description}</p>

                <span
                  className="inline-block rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: "var(--gold-bg)", color: "var(--gold)" }}
                >
                  {f.tag}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
