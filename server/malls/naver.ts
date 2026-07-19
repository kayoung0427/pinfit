import { MallId, MallProduct, MallSearcher } from "./types.js";

// Naver Shopping open API — free & official. Aggregates products across
// hundreds of Korean malls, so it dramatically widens the candidate pool
// compared to scraping one mall at a time. Requires a (free) developer app:
// https://developers.naver.com  ->  X-Naver-Client-Id / X-Naver-Client-Secret.

const NAVER_ENDPOINT = "https://openapi.naver.com/v1/search/shop.json";

// Map Naver's mallName onto our known mall ids so those get proper branding;
// everything else is shown under the generic "naver" tag with its real store name.
const KNOWN_MALL_BY_NAME: Record<string, MallId> = {
  무신사: "musinsa",
  MUSINSA: "musinsa",
  "29CM": "29cm",
  W컨셉: "wconcept",
  더블유컨셉: "wconcept",
  지그재그: "zigzag",
};

export function isNaverConfigured(): boolean {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
}

function buildSearchUrl(query: string): string {
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;
}

async function search(query: string, limit: number): Promise<MallProduct[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  const url = `${NAVER_ENDPOINT}?query=${encodeURIComponent(query)}&display=${Math.min(limit, 20)}&sort=sim`;
  const res = await fetch(url, {
    headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret },
  });
  if (!res.ok) {
    throw new Error(`Naver API ${res.status}`);
  }
  const data = await res.json();
  const items: any[] = data.items || [];

  return items.slice(0, limit).map((it): MallProduct => {
    const storeName = it.mallName || "네이버쇼핑";
    const mappedMall = KNOWN_MALL_BY_NAME[storeName];
    const price = it.lprice ? parseInt(it.lprice, 10) : null;
    return {
      id: `naver-${it.productId}`,
      mall: mappedMall || "naver",
      mallLabel: storeName,
      name: stripHtml(it.title || "상품"),
      price: Number.isNaN(price as number) ? null : price,
      imageUrl: it.image,
      productUrl: it.link,
      isSearchLink: false,
    };
  });
}

export const naverSearcher: MallSearcher = {
  id: "naver",
  displayName: "네이버쇼핑",
  buildSearchUrl,
  search,
};
