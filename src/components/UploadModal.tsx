import { useRef, useState } from "react";
import { ImagePlus, Sparkles, X } from "lucide-react";

interface UploadModalProps {
  onClose: () => void;
  onAnalyze: (dataUrl: string, title: string) => Promise<void>;
}

export default function UploadModal({ onClose, onAnalyze }: UploadModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!preview) return;
    setAnalyzing(true);
    setError(null);
    try {
      await onAnalyze(preview, title || "업로드한 코디");
      onClose();
    } catch (err: any) {
      setError(err.message || "분석 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-neutral-150 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <h2 className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>
            코디 사진으로 찾기
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {!preview ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-12 cursor-pointer transition-all ${
                dragOver ? "border-black bg-neutral-50" : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50"
              }`}
            >
              <ImagePlus size={36} className="mb-3 text-neutral-400" />
              <p className="font-semibold text-sm mb-1 text-neutral-800">사진을 드래그하거나 클릭해서 업로드</p>
              <p className="text-xs text-neutral-400">Pinterest 캡처, 인스타 캡처, 직접 촬영 모두 OK</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-neutral-100" style={{ aspectRatio: "3/4" }}>
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              {!analyzing && (
                <button
                  onClick={() => setPreview(null)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              )}
              {analyzing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                  <Sparkles size={32} className="text-white animate-pulse" />
                  <p className="text-white font-semibold text-sm">AI가 코디를 분석 중...</p>
                  <p className="text-white/70 text-xs">아이템 인식 → 4개 쇼핑몰 검색 중</p>
                </div>
              )}
            </div>
          )}

          {preview && (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="코디 이름 (선택)"
              disabled={analyzing}
              className="w-full mt-3 border border-neutral-200 focus:border-black rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400"
            />
          )}

          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

          {preview && !analyzing && (
            <button
              onClick={handleAnalyze}
              className="w-full mt-4 py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity bg-black"
            >
              <Sparkles size={16} /> 비슷한 코디 찾기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
