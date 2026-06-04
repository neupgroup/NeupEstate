import type { Property } from "@/types";

export function getPriceDisplayMode(property: Pick<Property, "details" | "pricing">): "show-price" | "price-on-call" | "offer-yours-first" {
  const mode = property.details?.priceDisplayMode || property.pricing?.priceDisplayMode || "show-price";
  return mode === "price-on-call" || mode === "offer-yours-first" ? mode : "show-price";
}

export function getHiddenPriceLabel(property: Pick<Property, "details" | "pricing">): string | null {
  const mode = getPriceDisplayMode(property);
  if (mode === "price-on-call") return "Price on call";
  if (mode === "offer-yours-first") return "Offer yours first";
  return null;
}
