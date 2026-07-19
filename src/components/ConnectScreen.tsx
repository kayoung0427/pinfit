import { useState } from "react";
import { RefreshCw, Search, ShoppingBag, Sparkles, Upload } from "lucide-react";
import PinterestLogo from "./PinterestLogo";

interface ConnectScreenProps {
  onConnectUsername: (username: string) => void;
  connecting: boolean;
  errorMessage?: string | null;
  onSkipToUpload: () => void;
}

export default function ConnectScreen({
  onConnectUsername,
  connecting,
  errorMessage,
  onSkipToUpload,
}: ConnectScreenProps) {
  const [username, setUsername] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) onConnectUsername(username.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-[#E60023]">
          <PinterestLogo size={32} color="#fff" />
        </div>

        <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          PinFit
        </h1>
        <p className="text-neutral-500 text-sm leading-relaxed mb-8">
          Pinterest에 저장해 둔 코디 취향을
          <br />
          무신사 · 29CM · W컨셉 · 지그재그에서
          <br />
          바로 찾아드려요.
        </p>

        <div className="bg-white rounded-2xl border border-neutral-150 p-5 mb-6 text-left space-y-4 shadow-sm">
          {[
            { icon: <PinterestLogo size={18} />, title: "Pinterest 아이디 입력", desc: "내가 저장한 공개 핀에서 취향 코디 자동 수집" },
            { icon: <Sparkles size={18} className="text-amber-500" />, title: "AI 아이템 인식", desc: "상의·하의·아우터·신발·가방 자동 분석" },
            { icon: <ShoppingBag size={18} className="text-neutral-700" />, title: "4개 쇼핑몰 매칭", desc: "설정한 단가 이하로 비슷한 옷 바로 연결" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center shrink-0">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{title}</p>
                <p className="text-xs text-neutral-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-2.5">
          <div className="flex items-center border border-neutral-200 rounded-xl bg-white overflow-hidden focus-within:border-black transition-colors">
            <span className="pl-3 pr-1 text-neutral-400 text-sm font-semibold select-none">
              pinterest.com /
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="내아이디"
              disabled={connecting}
              autoCapitalize="none"
              autoCorrect="off"
              className="flex-1 min-w-0 py-3 pr-3 text-sm outline-none placeholder:text-neutral-300 disabled:bg-neutral-50"
            />
          </div>

          <button
            type="submit"
            disabled={connecting || !username.trim()}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-semibold text-white text-sm hover:opacity-90 active:scale-[0.99] transition-all bg-[#E60023] disabled:opacity-50"
          >
            {connecting ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> 핀 가져오는 중...
              </>
            ) : (
              <>
                <PinterestLogo size={18} color="#fff" /> 내 핀 가져오기
              </>
            )}
          </button>
        </form>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mt-3 text-left leading-relaxed">
            {errorMessage}
          </div>
        )}

        <button
          onClick={onSkipToUpload}
          className="w-full flex items-center justify-center gap-2 mt-3 py-3.5 rounded-xl font-semibold text-neutral-700 text-sm border border-neutral-200 hover:bg-neutral-50 transition-all"
        >
          <Upload size={16} /> 아이디 없이 사진 업로드로 시작
        </button>

        <p className="text-xs text-neutral-400 mt-4 flex items-center justify-center gap-1 leading-relaxed">
          <Search size={11} className="shrink-0" />
          프로필과 보드가 '공개(Public)'로 설정되어 있어야 해요
        </p>
      </div>
    </div>
  );
}
