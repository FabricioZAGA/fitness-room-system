"use client";

import { useState } from "react";
import type { DictFaqData } from "@/lib/i18n";

interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

function FAQAccordion({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-[--gold]"
      >
        <span className="pr-4 font-medium text-[--tx-primary]">{item.question}</span>
        <span
          className="shrink-0 text-xl font-light transition-transform duration-200"
          style={{
            color: "var(--gold)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div className="pb-5">
          <p className="leading-relaxed text-[--tx-muted]">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

interface FAQProps {
  t: DictFaqData;
  preview?: boolean;
}

export function FAQ({ t, preview = false }: FAQProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered =
    activeCategory === "all"
      ? t.items
      : t.items.filter((i) => i.category === activeCategory);

  const displayItems = preview ? filtered.slice(0, 6) : filtered;

  return (
    <div>
      {/* Category filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
            activeCategory === "all"
              ? "bg-[--gold-bg] text-[--gold]"
              : "bg-[--bg-surface] text-[--tx-muted] hover:text-[--tx-primary]"
          }`}
        >
          {t.allCategory}
        </button>
        {Object.entries(t.categories).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeCategory === key
                ? "bg-[--gold-bg] text-[--gold]"
                : "bg-[--bg-surface] text-[--tx-muted] hover:text-[--tx-primary]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="rounded-2xl bg-[--bg-surface] px-6">
        {displayItems.map((item) => (
          <FAQAccordion key={item.question} item={item} />
        ))}
      </div>
    </div>
  );
}
