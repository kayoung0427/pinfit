export type Category = "top" | "bottom" | "outerwear" | "shoes" | "bag" | "accessory";

export type MallId = "musinsa" | "29cm" | "wconcept" | "zigzag" | "naver";

export interface MatchedProduct {
  id: string;
  mall: MallId;
  name: string;
  price: number | null;
  imageUrl?: string;
  productUrl: string;
  /** true = we could not confirm a live product, this just deep-links to the mall's search results */
  isSearchLink: boolean;
  /** For aggregators (Naver): the actual store name to display */
  mallLabel?: string;
}

export interface VisualMatch {
  id: string;
  title: string;
  price: number | null;
  priceText?: string;
  imageUrl?: string;
  productUrl: string;
  source?: string;
}

export interface DetectedItem {
  category: Category;
  label: string;
  colors: string[];
  searchQuery: string;
  matches: MatchedProduct[];
}

export interface OutfitAnalysis {
  id: string;
  sourceType: "pinterest" | "upload";
  sourceImageUrl: string;
  sourceTitle?: string;
  mood: string;
  visualMatches?: VisualMatch[];
  items: DetectedItem[];
  createdAt: string;
}

export interface PriceLimits {
  default: number;
  byCategory: Partial<Record<Category, number>>;
}

export interface PinterestBoard {
  id: string;
  name: string;
  pinCount?: number;
  imageUrl?: string;
}

export interface PinterestPin {
  id: string;
  imageUrl: string;
  title: string;
  boardId: string;
}

export interface PinterestSession {
  connected: boolean;
  username?: string;
}
