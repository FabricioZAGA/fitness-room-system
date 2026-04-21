"use client";

import { useState } from "react";
import { FAQ_ITEMS, FAQ_CATEGORIES, type FAQItem } from "@/lib/faq-data";

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
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

export function FAQ({ preview = false }: { preview?: boolean }) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered =
    activeCategory === "all"
      ? FAQ_ITEMS
      : FAQ_ITEMS.filter((i) => i.category === activeCategory);

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
          Todas
        </button>
        {Object.entries(FAQ_CATEGORIES).map(([key, label]) => (
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
