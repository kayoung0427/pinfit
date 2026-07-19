import { fetchHtml, MallProduct, MallSearcher } from "./types.js";

// Musinsa's search page is server-rendered (Next.js) and embeds the full product
// list as JSON inside a <script id="__NEXT_DATA__"> tag, under a react-query
// "dehydrated state" cache entry whose queryKey looks like ["search","goods",{...}].
// We parse that instead of scraping HTML markup, which is far more stable.

function buildSearchUrl(query: string): string {
  return `https://www.musinsa.com/search/goods?keyword=${encodeURIComponent(query)}&gf=A`;
}

function extractNextData(html: string): any | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function findGoodsQuery(nextData: any): any | null {
  const queries: any[] = nextData?.props?.pageProps?.dehydratedState?.queries || [];
  const goodsQuery = queries.find(
    (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "search" && q.queryKey[1] === "goods"
  );
  return goodsQuery || null;
}

async function search(query: string, limit: number): Promise<MallProduct[]> {
  const html = await fetchHtml(buildSearchUrl(query));
  const nextData = extractNextData(html);
  if (!nextData) return [];

  const goodsQuery = findGoodsQuery(nextData);
  const pages: any[] = goodsQuery?.state?.data?.pages || [];
  const items: any[] = pages.flatMap((p) => p?.items || []);

  return items
    .filter((it) => it && !it.isSoldOut && it.goodsNo)
    .slice(0, limit)
    .map((it): MallProduct => ({
      id: `musinsa-${it.goodsNo}`,
      mall: "musinsa",
      name: it.goodsName || "무신사 상품",
      price: typeof it.finalPrice === "number" ? it.finalPrice : it.price ?? it.normalPrice ?? null,
      imageUrl: it.thumbnail,
      productUrl: it.goodsLinkUrl || `https://www.musinsa.com/products/${it.goodsNo}`,
      isSearchLink: false,
    }));
}

export const musinsaSearcher: MallSearcher = {
  id: "musinsa",
  displayName: "무신사",
  buildSearchUrl,
  search,
};
