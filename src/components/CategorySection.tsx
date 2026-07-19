import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { DetectedItem } from "../types";
import { CATEGORY_META, MALL_META, formatKRW } from "./SettingsBar";
import ItemCard from "./ItemCard";

export default function CategorySection({ item, priceLimit }: { item: DetectedItem; priceLimit: number }) {
  const [showOver, setShowOver] = useState(false);

  const realItems = item.matches.filter((m) => !m.isSearchLink);
  const linkOnly = item.matches.filter((m) => m.isSearchLink);

  const within = realItems.filter((m) => m.price == null || m.price <= priceLimit);
  const over = realItems.filter((m) => m.price != null && m.price > priceLimit);

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-neutral-100">
        <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
          {CATEGORY_META[item.category]}
        </span>
        <span className="text-[10px] text-neutral-400">{item.label}</span>
      </div>

      {within.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {within.map((m) => (
            <ItemCard key={m.id} item={m} />
          ))}
        </div>
      )}

      {within.length === 0 && realItems.length > 0 && (
        <p className="text-xs text-neutral-400 py-2">설정한 단가 이하의 실시간 상품이 없어요.</p>
      )}

      {over.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowOver((s) => !s)}
            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            {showOver ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            단가 초과 {over.length}개 더 보기
          </button>
          {showOver && (
            <div className="grid grid-cols-2 gap-2.5 mt-2 opacity-70">
              {over.map((m) => (
                <ItemCard key={m.id} item={m} dimmed />
              ))}
            </div>
          )}
        </div>
      )}

      {linkOnly.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {linkOnly.map((m) => (
            <a
              key={m.id}
              href={m.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-neutral-150 hover:border-neutral-300 hover:bg-neutral-50 transition-all text-xs"
            >
              <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MALL_META[m.mall].color }} />
                {MALL_META[m.mall].label}에서 "{item.searchQuery}" 실시간 검색 결과 보기
              </span>
              <ExternalLink size={12} className="text-neutral-400 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
