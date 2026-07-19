import { useState } from "react";
import { Check, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import type { Category, MallId, PriceLimits } from "../types";

const MALL_META: Record<MallId, { label: string; color: string }> = {
  musinsa: { label: "무신사", color: "#000000" },
  "29cm": { label: "29CM", color: "#e2231a" },
  wconcept: { label: "W컨셉", color: "#222222" },
  zigzag: { label: "지그재그", color: "#ff5289" },
  naver: { label: "네이버쇼핑", color: "#03c75a" },
};

const CATEGORY_META: Record<Category, string> = {
  top: "상의",
  bottom: "하의",
  outerwear: "아우터",
  shoes: "신발",
  bag: "가방",
  accessory: "액세서리",
};

const PRESETS = [30000, 50000, 80000, 120000, 200000];

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

interface SettingsBarProps {
  priceLimits: PriceLimits;
  onChangePriceLimits: (limits: PriceLimits) => void;
  selectedMalls: MallId[];
  onChangeMalls: (malls: MallId[]) => void;
  allMalls: MallId[];
}

export default function SettingsBar({
  priceLimits,
  onChangePriceLimits,
  selectedMalls,
  onChangeMalls,
  allMalls,
}: SettingsBarProps) {
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const toggleMall = (mall: MallId) => {
    if (selectedMalls.includes(mall)) {
      if (selectedMalls.length > 1) onChangeMalls(selectedMalls.filter((m) => m !== mall));
    } else {
      onChangeMalls([...selectedMalls, mall]);
    }
  };

  const setDefault = (value: number) => {
    onChangePriceLimits({ ...priceLimits, default: value });
  };

  const setCategoryLimit = (cat: Category, value: number) => {
    onChangePriceLimits({ ...priceLimits, byCategory: { ...priceLimits.byCategory, [cat]: value } });
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-150 shadow-sm sticky top-4 z-30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-neutral-900">
          <SlidersHorizontal size={15} />
          아이템 단가 {formatKRW(priceLimits.default)} 이하 · 쇼핑몰 {selectedMalls.length}곳
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="border-t border-neutral-100 p-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                기본 단가 상한 (아이템 1개 최대 가격)
              </p>
              <span className="text-lg font-extrabold text-black">{formatKRW(priceLimits.default)}</span>
            </div>
            <input
              type="range"
              min={10000}
              max={500000}
              step={5000}
              value={priceLimits.default}
              onChange={(e) => setDefault(Number(e.target.value))}
              className="w-full accent-black"
            />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setDefault(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    priceLimits.default === p
                      ? "bg-black text-white border-black"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {formatKRW(p)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={() => setAdvanced((a) => !a)}
              className="text-xs font-semibold text-neutral-500 hover:text-black underline underline-offset-2"
            >
              {advanced ? "카테고리별 세부 설정 닫기" : "카테고리별로 단가를 다르게 설정하기"}
            </button>

            {advanced && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
                {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
                  const value = priceLimits.byCategory[cat] ?? priceLimits.default;
                  return (
                    <div key={cat} className="border border-neutral-150 rounded-xl p-2.5">
                      <p className="text-[11px] font-bold text-neutral-700 mb-1">{CATEGORY_META[cat]}</p>
                      <input
                        type="range"
                        min={10000}
                        max={500000}
                        step={5000}
                        value={value}
                        onChange={(e) => setCategoryLimit(cat, Number(e.target.value))}
                        className="w-full accent-black h-1"
                      />
                      <p className="text-[10px] text-neutral-500 mt-1">{formatKRW(value)} 이하</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">쇼핑몰 선택</p>
            <div className="flex flex-wrap gap-2">
              {allMalls.map((mall) => {
                const active = selectedMalls.includes(mall);
                return (
                  <button
                    key={mall}
                    onClick={() => toggleMall(mall)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      active ? "bg-black text-white border-black" : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MALL_META[mall].color }} />
                    {MALL_META[mall].label}
                    {active && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { MALL_META, CATEGORY_META, formatKRW };
