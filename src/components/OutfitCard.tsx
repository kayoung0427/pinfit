import { useState } from "react";
import { ChevronDown, ChevronUp, Upload } from "lucide-react";
import type { OutfitAnalysis, PriceLimits } from "../types";
import PinterestLogo from "./PinterestLogo";
import CategorySection from "./CategorySection";
import VisualMatchSection from "./VisualMatchSection";

interface OutfitCardProps {
  outfit: OutfitAnalysis;
  priceLimits: PriceLimits;
}

export default function OutfitCard({ outfit, priceLimits }: OutfitCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-neutral-150 overflow-hidden shadow-sm">
      <div className="flex items-stretch">
        <div className="relative shrink-0 w-28 sm:w-40">
          <img
            src={outfit.sourceImageUrl}
            alt={outfit.mood}
            className="w-full h-full object-cover"
            style={{ minHeight: 160 }}
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-2 left-2">
            {outfit.sourceType === "pinterest" ? (
              <span className="flex items-center gap-1 bg-white/90 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                <PinterestLogo size={10} /> Pinterest
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-white/90 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                <Upload size={10} /> 직접 업로드
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-base leading-snug text-neutral-900" style={{ fontFamily: "var(--font-display)" }}>
                {outfit.mood}
              </h3>
              <button
                onClick={() => setExpanded((s) => !s)}
                className="text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
              >
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            {outfit.sourceTitle && <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{outfit.sourceTitle}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {outfit.items.map((it, idx) => (
                <span key={`${it.category}-${idx}`} className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">
                  {it.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-100 p-4 bg-neutral-50/40">
          {outfit.visualMatches && outfit.visualMatches.length > 0 && (
            <VisualMatchSection matches={outfit.visualMatches} priceLimit={priceLimits.default} />
          )}
          {outfit.items.length === 0 ? (
            <p className="text-sm text-center text-neutral-400 py-4">인식된 아이템이 없어요.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {outfit.items.map((it, idx) => (
                <CategorySection
                  key={`${it.category}-${idx}`}
                  item={it}
                  priceLimit={priceLimits.byCategory[it.category] ?? priceLimits.default}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
