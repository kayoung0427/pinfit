// Google Lens visual search via SerpApi — this is the real "네이버 렌즈" style
// step: instead of keyword-searching, it finds products that actually LOOK like
// the source photo. Requires a SerpApi key (free tier ~100 searches/mo):
// https://serpapi.com/manage-api-key
//
// Limitation: Google Lens must be able to fetch the image, so the source must be
// a public https URL (Pinterest pins are; locally-uploaded data: URIs are not).

const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

export interface VisualMatch {
  id: string;
  title: string;
  price: number | null;
  priceText?: string;
  imageUrl?: string;
  productUrl: string;
  source?: string;
}

export function isLensConfigured(): boolean {
  return Boolean(process.env.SERPAPI_KEY);
}

export function isPublicImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Returns products visually similar to the given photo, best matches first.
 * Only items that carry a price are kept (those are real shopping results
 * rather than generic "related images").
 */
export async function findVisualMatches(imageUrl: string, limit = 12): Promise<VisualMatch[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key || !isPublicImageUrl(imageUrl)) return [];

  const params = new URLSearchParams({
    engine: "google_lens",
    type: "products", // shopping products (with price/link), not generic web matches
    url: imageUrl,
    api_key: key,
    hl: "ko",
    country: "kr",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${SERPAPI_ENDPOINT}?${params.toString()}`, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`SerpApi ${res.status}`);
    }
    const data = await res.json();
    const matches: any[] = data.visual_matches || [];

    // Google Lens products are global, so prices come in mixed currencies. Only
    // treat KRW prices as a real number for the "단가 이하" filter; foreign
    // currencies keep their display text but are excluded from KRW filtering.
    const isKrw = (p: any): boolean =>
      p?.currency === "₩" || p?.currency === "KRW" || (typeof p?.value === "string" && p.value.includes("₩"));

    const mapped = matches.map((m, i): VisualMatch => ({
      id: `lens-${m.position ?? i}`,
      title: m.title || "비슷한 상품",
      price: isKrw(m.price) ? m.price.extracted_value ?? null : null,
      priceText: m.price?.value,
      imageUrl: m.thumbnail,
      productUrl: m.link,
      source: m.source,
    }));

    // Prefer items that at least have a price tag (real shopping results) —
    // show those first, then the rest, capped at `limit`.
    const priced = mapped.filter((m) => m.priceText);
    const unpriced = mapped.filter((m) => !m.priceText);
    return [...priced, ...unpriced].slice(0, limit);
  } catch (err) {
    console.error("[lens] visual search failed:", (err as Error).message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
