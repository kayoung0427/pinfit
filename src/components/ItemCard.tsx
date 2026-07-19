import { ExternalLink } from "lucide-react";
import type { MatchedProduct } from "../types";
import { MALL_META, formatKRW } from "./SettingsBar";

export default function ItemCard({ item, dimmed }: { item: MatchedProduct; dimmed?: boolean }) {
  return (
    <a
      href={item.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block bg-white rounded-xl border border-neutral-150 overflow-hidden hover:shadow-md hover:border-neutral-300 transition-all ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <div className="relative bg-neutral-100" style={{ aspectRatio: "3/3.8" }}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">이미지 없음</div>
        )}
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
            style={{ backgroundColor: MALL_META[item.mall].color }}
          >
            {MALL_META[item.mall].label}
          </span>
          {item.mall === "naver" && item.mallLabel && (
            <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-white/85 text-neutral-700 max-w-[90px] truncate">
              {item.mallLabel}
            </span>
          )}
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-[11px] leading-snug font-medium text-neutral-800 mb-1 line-clamp-2 min-h-[2.4em]">
          {item.name}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-900">{item.price != null ? formatKRW(item.price) : "-"}</p>
          <ExternalLink size={11} className="text-neutral-400" />
        </div>
      </div>
    </a>
  );
}
