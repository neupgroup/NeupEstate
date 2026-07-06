
"use client";

/*
::neup.documentation::property-card

Reusable public property card used across homepage, search, saved, and collection listings.

::end
*/

import Link from "next/link";
import type { Property } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2, Star, MapPin } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { cn } from "@/logica/core/utils";
import { getHiddenPriceLabel, getPrimaryCurrency, getPrimaryPrice, getPrimaryPricingSuffix } from "@/logica/core/property-price-display";
import { SafeImage } from "./safe-image";
import { toggleSavePropertyAction } from "@/app/actions";
import { useToast } from "@/logica/core/hooks/use-toast";
import { isPropertySaved } from "@/services/property-service";
import { getClientAccountId } from "@/services/account/get-account-id";

interface PropertyCardProps {
  property: Property;
  propertyCount?: number;
  reviewCount?: number;
  rating?: number;
}

const FALLBACK_IMAGES = [
    'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
    'https://media.istockphoto.com/id/1026205392/photo/beautiful-luxury-home-exterior-at-twilight.jpg?s=612x612&w=0&k=20&c=HOCqYY0noIVxnp5uQf1MJJEVpsH_d4WtVQ6-OwVoeDo=',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmVhdXRpZnVsJTIwaG91c2V8ZW58MHx8MHx8fDA%3D',
    'https://media.istockphoto.com/id/1255835530/photo/modern-custom-suburban-home-exterior.jpg?s=612x612&w=0&k=20&c=0Dqjm3NunXjZtWVpsUvNKg2A4rK2gMvJ-827nb4AMU4='
];


export function PropertyCard({ property, propertyCount, reviewCount, rating }: PropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(true);
  const [isTogglingFavorite, startToggleTransition] = useTransition();
  const [userId, setUserId] = useState<string | null>(null);
  const [fallbackImage, setFallbackImage] = useState<string | null>(null);
  const { toast } = useToast();
  
  const imageUrl = property.images && property.images.length > 0 ? property.images[0] : null;
  const slugOrId = property.slug || property.id;

  useEffect(() => {
    // Set fallback image on client mount to avoid hydration mismatch
    setFallbackImage(FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)]);
    // Prefer aid from auth_accounts; fall back to temp_account_id
    const currentUserId = getClientAccountId();
    setUserId(currentUserId);

    async function checkInitialState() {
      if (!currentUserId) {
        setIsCheckingFavorite(false);
        return;
      }
      setIsCheckingFavorite(true);
      const saved = await isPropertySaved(currentUserId, property.id);
      setIsFavorited(saved);
      setIsCheckingFavorite(false);
    }
    checkInitialState();
  }, [property.id]);

  const handleFavoriteToggle = () => {
    if (!userId) {
        toast({
            variant: "destructive",
            title: "Could not save property",
            description: "No user session found. Please refresh the page.",
        });
        return;
    }
    startToggleTransition(async () => {
      try {
        const result = await toggleSavePropertyAction(userId, property.id);
        setIsFavorited(result.saved);
        toast({
          title: result.saved ? "Property Saved" : "Property Unsaved",
          description: `"${property.title}" has been ${result.saved ? 'added to' : 'removed from'} your saved properties.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not update saved status. Please try again.",
        });
      }
    });
  };

  const formatPrice = (price: number) => {
    const currency = getPrimaryCurrency(property);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };
  const hiddenPriceLabel = getHiddenPriceLabel(property);
  const primaryPrice = getPrimaryPrice(property);
  const primaryPricingSuffix = getPrimaryPricingSuffix(property);
  const propertyTagItems = [
    property.bedrooms ? `${property.bedrooms} Beds` : null,
    property.bathrooms ? `${property.bathrooms} Baths` : null,
    typeof property.area === "number" && property.area > 0
      ? `${property.area.toLocaleString()} ${property.areaUnit === "sqft" ? "SqFt" : property.areaUnit || "SqFt"}`
      : null,
  ].filter((item): item is string => Boolean(item));
  
  return (
    <Card className="group card-hover-effect flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <CardHeader className="relative p-0">
        <Link href={`/properties/${slugOrId}`} className="block overflow-hidden">
          <SafeImage
            src={imageUrl || fallbackImage || "https://placehold.co/600x400.png"}
            alt={property.title}
            width={600}
            height={400}
            className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            data-ai-hint="house exterior"
            fallbackSrc={fallbackImage || "https://placehold.co/600x400.png"}
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
        </Link>

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge
            className="rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm"
            variant="secondary"
          >
            For {property.purpose}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 h-9 w-9 rounded-full border border-white/25 bg-white/80 text-foreground shadow-sm backdrop-blur-sm hover:bg-white"
          onClick={handleFavoriteToggle}
          disabled={isTogglingFavorite || isCheckingFavorite}
        >
          {isTogglingFavorite || isCheckingFavorite ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
          ) : (
            <Heart className={cn("h-5 w-5 text-gray-600", isFavorited && "fill-red-500 text-red-500")} />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-primary">
                {hiddenPriceLabel || formatPrice(primaryPrice)}
              </p>
              {!hiddenPriceLabel && primaryPricingSuffix ? (
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {primaryPricingSuffix}
                </p>
              ) : null}
            </div>

            {(rating !== undefined || propertyCount !== undefined) ? (
              <div className="flex flex-col items-end gap-1">
                {rating !== undefined ? (
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{rating.toFixed(1)}</span>
                    <span className="text-amber-600/80">({reviewCount || 0})</span>
                  </div>
                ) : null}
                {propertyCount !== undefined ? (
                  <div className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                    {propertyCount} Properties
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <CardTitle className="line-clamp-2 text-base font-headline leading-snug text-foreground">
            <Link href={`/properties/${slugOrId}`} className="transition-colors hover:text-primary">
            {property.title}
            </Link>
          </CardTitle>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary/80" />
            <p className="truncate">{property.location}</p>
          </div>

          {propertyTagItems.length > 0 ? (
            <p className="text-sm text-foreground">
              {propertyTagItems.join(" • ")}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
