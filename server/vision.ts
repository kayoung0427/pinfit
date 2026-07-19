import OpenAI from "openai";

// Lazily constructed — module-level init would read process.env.OPENAI_API_KEY
// before dotenv.config() runs in index.ts (import statements execute first).
let client: OpenAI | null | undefined;

function getClient(): OpenAI | null {
  if (client === undefined) {
    // maxRetries: 0 — we run our own bounded retry (createWithRateLimitRetry)
    // for per-minute limits. The SDK's default auto-retry can silently sleep
    // for a long time honoring a huge Retry-After (e.g. a daily-limit reset
    // dozens of minutes out), which looks like the request just hung.
    client = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 30_000 })
      : null;
  }
  return client;
}

function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function isVisionConfigured(): boolean {
  return getClient() !== null;
}

export interface DetectedItemRaw {
  category: "top" | "bottom" | "outerwear" | "shoes" | "bag" | "accessory";
  label: string;
  colors: string[];
  searchQuery: string;
}

export interface OutfitVisionResult {
  mood: string;
  items: DetectedItemRaw[];
}

const PROMPT = `당신은 전문 패션 퍼스널 쇼퍼 AI입니다. 이 코디 이미지를 아주 꼼꼼히 뜯어보고, 사진 속에 실제로 보이는 의류/신발/가방/액세서리 아이템만 골라내세요. 목표는 "대충 비슷한 카테고리"가 아니라, 쇼핑몰에서 검색했을 때 사진 속 그 아이템과 실루엣·색상·디테일이 최대한 똑같아 보이는 상품을 찾는 것입니다.

각 아이템마다 다음을 관찰하세요:
- 정확한 색상(예: '베이지'가 아니라 '연한 카멜 베이지', '아이보리 화이트' 등 톤까지)
- 핏/실루엣 (오버핏/슬림핏/크롭/와이드 등)
- 소재 질감이 시각적으로 어떻게 보이는지 (니트/데님/가죽/시폰/코듀로이 등)
- 넥라인, 카라, 소매 길이/디테일, 여밈(단추/지퍼) 같은 디자인 요소
- 패턴이나 프린트, 로고/그래픽의 유무와 위치
- 기장(크롭/미디/롱)과 전체 비율

다음 JSON 스키마로만 응답하세요:
{
  "mood": "이 코디 전체의 분위기를 짧게 (예: '미니멀 오피스룩', '캐주얼 스트릿룩')",
  "items": [
    {
      "category": "top" | "bottom" | "outerwear" | "shoes" | "bag" | "accessory" 중 하나,
      "label": "이 아이템을 아주 구체적으로 묘사한 한국어 설명 — 색상/핏/소재/디테일을 최대한 자세히 (예: '카멜 베이지 오버핏 더블브레스티드 울 블레이저'). 이 설명은 나중에 사진과 후보 상품을 비교하는 데 쓰이니 상세할수록 좋습니다.",
      "colors": ["주요 색상을 톤까지 구체적으로 (한국어)"],
      "searchQuery": "쇼핑몰 검색창에 입력할 검색어. label과 달리 이건 짧고 검색이 잘 되는 게 최우선입니다 — 딱 2~3단어만 쓰세요 (색상 1개 + 핏/기장 1개 + 아이템명, 또는 색상 + 아이템명). '밝은', '연한' 같은 애매한 수식어나 3개 넘는 형용사를 쌓지 마세요 — 실제 쇼핑몰 상품명에 그대로 들어있을 법한 단순한 조합이어야 합니다 (예: '베이지 오버핏 블레이저', '옐로우 크롭 후드'). 브랜드명은 지어내지 마세요."
    }
  ]
}

규칙:
- 사진에 실제로 존재하는 아이템만 포함하세요 (없는 카테고리는 생성하지 마세요).
- 한 사진에 아이템이 여러 개면 전부 포함하세요 (최대 6개).
- searchQuery는 너무 뭉뚱그리지 말고 최대한 구체적으로 쓰되, 검색 결과가 아예 안 나올 정도로 지나치게 특이한 조합은 피하세요.`;

const MAX_RETRY_WAIT_SECONDS = 20;

// OpenAI's message gives either "...try again in 6s" or "...try again in 338ms".
function parseRetryAfterSeconds(message: string): number {
  const msMatch = message.match(/try again in ([\d.]+)ms/i);
  if (msMatch) return Math.min(Math.max(Math.ceil(parseFloat(msMatch[1]) / 1000), 1), MAX_RETRY_WAIT_SECONDS);
  const sMatch = message.match(/try again in ([\d.]+)s\b/i);
  if (sMatch) return Math.min(Math.ceil(parseFloat(sMatch[1])), MAX_RETRY_WAIT_SECONDS);
  return 8;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// New/low-usage OpenAI accounts have low per-MINUTE limits (both request count
// and token count), and this app calls the vision API once per pin in a batch
// — easy to trip briefly. We retry that case with a short, capped wait. A
// per-DAY limit is a different story (the reset can be tens of minutes away)
// — that one should fail immediately with a clear message instead.
async function createWithRateLimitRetry(
  openai: OpenAI,
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  attemptsLeft = 4
): Promise<OpenAI.Chat.ChatCompletion> {
  try {
    return await openai.chat.completions.create(params);
  } catch (err: any) {
    const message: string = err?.message || "";
    const isPerMinuteLimit = err?.status === 429 && /per min\b|\bRPM\b|\bTPM\b/i.test(message);
    const isPerDayLimit = err?.status === 429 && /per day\b|\bRPD\b|\bTPD\b/i.test(message);

    if (isPerMinuteLimit && attemptsLeft > 0) {
      const waitSeconds = parseRetryAfterSeconds(message);
      console.warn(`[vision] OpenAI per-minute limit hit, retrying in ${waitSeconds}s (${attemptsLeft} attempts left)`);
      await sleep(waitSeconds * 1000);
      return createWithRateLimitRetry(openai, params, attemptsLeft - 1);
    }
    if (isPerDayLimit) {
      throw new Error("OpenAI 하루 요청 한도를 다 썼어요. 계정 사용량 등급에 따라 시간이 지나면 다시 풀려요.");
    }
    throw err;
  }
}

export async function analyzeOutfitImage(imageUrl: string): Promise<OutfitVisionResult> {
  const openai = getClient();
  if (!openai) {
    throw new Error("OPENAI_API_KEY가 설정되어 있지 않아 이미지 분석을 할 수 없습니다.");
  }

  // OpenAI's vision input accepts either a remote https URL or a data: URI
  // directly, so we can pass imageUrl straight through without re-encoding.
  const response = await createWithRateLimitRetry(openai, {
    model: getModel(),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  const rawText = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(rawText.trim());

  const items: DetectedItemRaw[] = Array.isArray(parsed.items)
    ? parsed.items
        .filter((i: any) => i && i.category && i.searchQuery)
        .slice(0, 6)
        .map((i: any) => ({
          category: i.category,
          label: i.label || i.searchQuery,
          colors: Array.isArray(i.colors) ? i.colors : [],
          searchQuery: String(i.searchQuery).trim(),
        }))
    : [];

  return {
    mood: parsed.mood || "코디 분석 완료",
    items,
  };
}

export interface RerankCandidate {
  id: string;
  imageUrl?: string;
}

export interface RerankItemInput {
  index: number;
  label: string;
  candidates: RerankCandidate[];
}

const RERANK_PROMPT = `당신은 패션 이미지 비교 전문가입니다. 첫 번째 이미지("원본")는 사용자가 갖고 싶어하는 실제 코디 사진입니다. 그 아래로 아이템별 "후보" 상품 이미지들이 번호와 함께 주어집니다.

각 아이템에 대해, 후보들을 원본 사진 속 그 아이템과 실제로 얼마나 닮았는지(색상, 실루엣, 기장, 소재 느낌, 디자인 디테일 기준) 비교해서, 진짜로 비슷해 보이는 후보만 골라 유사도 높은 순서로 나열하세요. 카테고리만 같고 생김새가 확연히 다른 후보는 제외하세요. 비슷한 후보가 하나도 없으면 빈 배열로 응답하세요.

다음 JSON 스키마로만 응답하세요:
{
  "rankings": [
    { "itemIndex": 0, "bestCandidateNumbers": [2, 0, 3] }
  ]
}
모든 아이템에 대해 하나씩 응답하세요. bestCandidateNumbers는 후보 번호(0부터 시작) 배열이며, 가장 닮은 것부터 순서대로, 최대 4개까지만 포함하세요.`;

/**
 * Compares real mall search candidates against the original outfit photo and
 * returns, per item index, the candidate ids ordered by actual visual
 * similarity (best first). Uses low-detail image inputs to keep token cost
 * small even with many candidate thumbnails in one request.
 */
export async function rerankByVisualSimilarity(
  sourceImageUrl: string,
  items: RerankItemInput[]
): Promise<Record<number, string[]>> {
  const openai = getClient();
  const itemsWithCandidates = items.filter((it) => it.candidates.length > 0);
  if (!openai || itemsWithCandidates.length === 0) return {};

  const content: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: RERANK_PROMPT },
    { type: "text", text: "원본:" },
    { type: "image_url", image_url: { url: sourceImageUrl, detail: "low" } },
  ];

  // Track candidate number -> id per item, since we ask the model for
  // 0-based numbers rather than our real (longer) product ids.
  const numberToId: Record<number, Record<number, string>> = {};

  for (const item of itemsWithCandidates) {
    content.push({ type: "text", text: `\n아이템 #${item.index} (${item.label}) 후보들:` });
    numberToId[item.index] = {};
    item.candidates.forEach((c, num) => {
      if (!c.imageUrl) return;
      numberToId[item.index][num] = c.id;
      content.push({ type: "text", text: `후보 ${num}:` });
      content.push({ type: "image_url", image_url: { url: c.imageUrl, detail: "low" } });
    });
  }

  try {
    const response = await createWithRateLimitRetry(openai, {
      model: getModel(),
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const rankings: any[] = Array.isArray(parsed.rankings) ? parsed.rankings : [];

    const result: Record<number, string[]> = {};
    for (const r of rankings) {
      const idx = r.itemIndex;
      const nums: number[] = Array.isArray(r.bestCandidateNumbers) ? r.bestCandidateNumbers : [];
      const idMap = numberToId[idx];
      if (!idMap) continue;
      result[idx] = nums.map((n) => idMap[n]).filter((id): id is string => Boolean(id));
    }
    return result;
  } catch (err) {
    console.error("[vision] visual re-rank failed, keeping original order:", (err as Error).message);
    return {};
  }
}
