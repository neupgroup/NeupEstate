/*
::neup.documentation::property-price-display

Shared helpers for choosing and labeling the public-facing property price.

::end
*/

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

export function getPrimaryPrice(property: Pick<Property, "price" | "pricing">): number {
  const listed = property.pricing?.listed;
  return typeof listed === "number" && listed > 0 ? listed : property.price;
}

export function getPrimaryCurrency(property: Pick<Property, "pricing">): string {
  return property.pricing?.currency || "USD";
}

export function getPrimaryPricingSuffix(property: Pick<Property, "pricing">): string | null {
  const basis = property.pricing?.basis?.trim()?.toLowerCase() || "";
  const frequency = property.pricing?.basis && property.pricing?.basisFrequencies?.[property.pricing.basis]?.trim();
  const unit = property.pricing?.basis && property.pricing?.basisUnits?.[property.pricing.basis]?.trim();
  const hasPerUnitBasis = basis.includes("unit") || basis.includes("per-aana") || basis.includes("per-ropani") || basis.includes("per-sqft");
  const hasFlatBasis = basis.includes("flat") || basis === "flat-price";

  if (frequency && unit) {
    return `per ${unit} per ${frequency}`;
  }

  if (unit && hasPerUnitBasis) {
    return `per ${unit}`;
  }

  if (frequency && (!hasFlatBasis || basis.includes("rent"))) {
    return `per ${frequency}`;
  }

  return null;
}
