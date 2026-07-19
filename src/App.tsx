import { useEffect, useState } from "react";
import { LogOut, RefreshCw, Upload } from "lucide-react";
import PinterestLogo from "./components/PinterestLogo";
import ConnectScreen from "./components/ConnectScreen";
import SettingsBar from "./components/SettingsBar";
import OutfitCard from "./components/OutfitCard";
import UploadModal from "./components/UploadModal";
import * as api from "./api";
import type { MallId, OutfitAnalysis, PriceLimits } from "./types";

const ALL_MALLS: MallId[] = ["musinsa", "29cm", "wconcept", "zigzag", "naver"];
const MAX_PINS = 12;

type ViewMode = "loading" | "connect" | "workspace";

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("loading");
  const [visionConfigured, setVisionConfigured] = useState(true);

  const [username, setUsername] = useState<string | undefined>();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);

  const [outfits, setOutfits] = useState<OutfitAnalysis[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [priceLimits, setPriceLimits] = useState<PriceLimits>({ default: 80000, byCategory: {} });
  const [selectedMalls, setSelectedMalls] = useState<MallId[]>(ALL_MALLS);

  useEffect(() => {
    (async () => {
      try {
        const config = await api.getConfigStatus();
        setVisionConfigured(config.visionConfigured);
      } catch {
        // non-fatal
      }
      setViewMode("connect");
    })();
  }, []);

  // Fetch a public profile's pins via RSS, then analyze each one.
  const connectUsername = async (name: string) => {
    setConnecting(true);
    setConnectError(null);
    try {
      const { username: resolved, pins } = await api.getProfilePins(name);
      setUsername(resolved);
      setViewMode("workspace");

      const limited = pins.slice(0, MAX_PINS);
      setSyncProgress({ done: 0, total: limited.length });

      const synced: OutfitAnalysis[] = [];
      let lastPinError: string | null = null;
      for (let i = 0; i < limited.length; i++) {
        const pin = limited[i];
        try {
          const outfit = await api.analyzeOutfit({
            imageUrl: pin.imageUrl,
            sourceType: "pinterest",
            sourceTitle: pin.title,
            malls: selectedMalls,
          });
          synced.push(outfit);
          // Show results incrementally so the user sees progress.
          setOutfits((prev) => [...synced, ...prev.filter((o) => o.sourceType !== "pinterest")]);
        } catch (err: any) {
          console.error("Pin analysis failed:", err);
          lastPinError = err.message || "핀 분석에 실패했습니다.";
        }
        setSyncProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        // Small gap between pins so a low-tier OpenAI token-per-minute budget
        // has time to refill, instead of firing all pins back-to-back.
        if (i < limited.length - 1) await new Promise((r) => setTimeout(r, 1500));
      }

      if (synced.length === 0 && lastPinError) {
        setGlobalError(`핀 ${limited.length}개를 모두 분석하지 못했어요: ${lastPinError}`);
      } else {
        setGlobalError(null);
      }
    } catch (err: any) {
      setConnectError(err.message || "핀을 불러오지 못했습니다.");
    } finally {
      setConnecting(false);
      setSyncProgress(null);
    }
  };

  const handleDisconnect = () => {
    setUsername(undefined);
    setOutfits([]);
    setConnectError(null);
    setViewMode("connect");
  };

  const handleUploadAnalyze = async (dataUrl: string, title: string) => {
    const outfit = await api.analyzeOutfit({
      imageUrl: dataUrl,
      sourceType: "upload",
      sourceTitle: title,
      malls: selectedMalls,
    });
    setOutfits((prev) => [outfit, ...prev]);
  };

  if (viewMode === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-neutral-400 text-sm">불러오는 중...</div>;
  }

  if (viewMode === "connect") {
    return (
      <>
        <ConnectScreen
          onConnectUsername={connectUsername}
          connecting={connecting}
          errorMessage={connectError}
          onSkipToUpload={() => {
            setViewMode("workspace");
            setShowUpload(true);
          }}
        />
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} onAnalyze={handleUploadAnalyze} />}
      </>
    );
  }

  const connected = Boolean(username);

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-150">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="flex items-center gap-1.5 mr-auto">
            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-white font-black text-xs">
              PF
            </div>
            <span className="font-bold text-base tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              PinFit
            </span>
          </div>

          {connected ? (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-full font-semibold">
              <PinterestLogo size={11} /> @{username}
            </span>
          ) : (
            <button
              onClick={handleDisconnect}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#E60023] text-white hover:opacity-90"
            >
              <PinterestLogo size={11} color="#fff" /> Pinterest 연동
            </button>
          )}

          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
          >
            <Upload size={13} /> 사진으로 찾기
          </button>

          {connected && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-black px-2 py-2 rounded-xl transition-colors"
              title="연동 해제 / 다른 아이디"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5 pb-20">
        {!visionConfigured && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 leading-relaxed">
            아직 서버에 <code className="bg-white px-1 rounded">OPENAI_API_KEY</code>가 설정되지 않아 이미지 분석이
            작동하지 않아요. README의 "환경변수 설정"을 참고해 키를 넣고 서버를 재시작해 주세요.
          </div>
        )}

        {globalError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{globalError}</div>
        )}

        {connected && (
          <div className="bg-white rounded-2xl border border-neutral-150 p-4 shadow-sm flex items-center justify-between gap-3">
            <span className="text-sm text-neutral-600 flex items-center gap-2 min-w-0">
              <PinterestLogo size={14} />
              <span className="truncate">
                <strong className="text-neutral-900">@{username}</strong>의 최근 저장 핀을 분석했어요
              </span>
            </span>
            <button
              onClick={() => username && connectUsername(username)}
              disabled={connecting}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white bg-black hover:bg-neutral-800 disabled:bg-neutral-300 transition-all"
            >
              <RefreshCw size={14} className={connecting ? "animate-spin" : ""} />
              {connecting ? "가져오는 중" : "다시 가져오기"}
            </button>
          </div>
        )}

        {syncProgress && (
          <div className="bg-white border border-neutral-150 rounded-xl p-3 text-xs text-neutral-500 flex items-center justify-between">
            <span>핀 분석 중... ({syncProgress.done}/{syncProgress.total})</span>
            <div className="w-32 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all"
                style={{ width: `${(syncProgress.done / Math.max(syncProgress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <SettingsBar
          priceLimits={priceLimits}
          onChangePriceLimits={setPriceLimits}
          selectedMalls={selectedMalls}
          onChangeMalls={setSelectedMalls}
          allMalls={ALL_MALLS}
        />

        {outfits.length === 0 && !syncProgress ? (
          <div className="text-center py-20 text-neutral-400">
            <p className="text-sm">
              {connected
                ? "분석된 코디가 없어요. '다시 가져오기'를 눌러보세요."
                : "사진으로 찾기 버튼을 눌러 시작해보세요."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {outfits.map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} priceLimits={priceLimits} />
            ))}
          </div>
        )}
      </main>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onAnalyze={handleUploadAnalyze} />}
    </div>
  );
}
