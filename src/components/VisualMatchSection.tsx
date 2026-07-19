import { useState } from "react";
import { ExternalLink, ScanSearch } from "lucide-react";
import type { VisualMatch } from "../types";
import { formatKRW } from "./SettingsBar";

function VisualMatchCard({ item, dimmed }: { item: VisualMatch; dimmed?: boolean }) {
  const priceLabel = item.price != null ? formatKRW(item.price) : item.priceText || "";
  return (
    <a
      href={item.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-32 shrink-0 bg-white rounded-xl border border-neutral-150 overflow-hidden hover:shadow-md hover:border-neutral-300 transition-all ${
        dimmed ? "opacity-55" : ""
      }`}
    >
      <div className="relative bg-neutral-100" style={{ aspectRatio: "3/3.8" }}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">이미지 없음</div>
        )}
      </div>
      <div className="p-2">
        <p className="text-[10px] leading-snug font-medium text-neutral-800 mb-1 line-clamp-2 min-h-[2.2em]">
          {item.title}
        </p>
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-bold text-neutral-900 truncate">{priceLabel || "가격정보 링크"}</p>
          <ExternalLink size={10} className="text-neutral-400 shrink-0" />
        </div>
        {item.source && <p className="text-[9px] text-neutral-400 truncate mt-0.5">{item.source}</p>}
      </div>
    </a>
  );
}

export default function VisualMatchSection({
  matches,
  priceLimit,
}: {
  matches: VisualMatch[];
  priceLimit: number;
}) {
  const [showOver, setShowOver] = useState(false);
  if (matches.length === 0) return null;

  const within = matches.filter((m) => m.price == null || m.price <= priceLimit);
  const over = matches.filter((m) => m.price != null && m.price > priceLimit);

  return (
    <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-1.5 mb-1">
        <ScanSearch size={15} className="text-emerald-600" />
        <h4 className="text-sm font-bold text-neutral-900">📸 사진과 시각적으로 똑같은 상품</h4>
      </div>
      <p className="text-[11px] text-neutral-500 mb-3">
        구글 렌즈가 이 코디 사진과 실제로 닮은 상품을 찾았어요 (쇼핑몰 제한 없음).
      </p>

      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {within.map((m) => (
          <VisualMatchCard key={m.id} item={m} />
        ))}
        {showOver && over.map((m) => <VisualMatchCard key={m.id} item={m} dimmed />)}
      </div>

      {within.length === 0 && !showOver && (
        <p className="text-xs text-neutral-400 py-1">설정한 단가 이하의 결과가 없어요.</p>
      )}

      {over.length > 0 && (
        <button
          onClick={() => setShowOver((s) => !s)}
          className="text-[11px] text-neutral-500 hover:text-neutral-800 transition-colors mt-2"
        >
          {showOver ? "단가 초과 숨기기" : `단가 초과 ${over.length}개 더 보기`}
        </button>
      )}
    </div>
  );
}
