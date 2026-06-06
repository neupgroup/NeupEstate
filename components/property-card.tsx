
"use client";

import Link from "next/link";
import type { Property } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, BedDouble, Bath, SquareGanttChart, Loader2, Star } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { cn } from "@/logica/core/utils";
import { getHiddenPriceLabel } from "@/logica/core/property-price-display";
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

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };
  const hiddenPriceLabel = getHiddenPriceLabel(property);
  
  return (
    <Card className="flex flex-col overflow-hidden rounded-lg card-hover-effect h-full">
      <CardHeader className="p-0 relative">
        <Link href={`/properties/${slugOrId}`}>
          <SafeImage
            src={imageUrl || fallbackImage || "https://placehold.co/600x400.png"}
            alt={property.title}
            width={600}
            height={400}
            className="w-full h-48 object-cover"
            data-ai-hint="house exterior"
            fallbackSrc={fallbackImage || "https://placehold.co/600x400.png"}
          />
        </Link>
        <Badge
          className="absolute top-3 left-3"
          variant={property.purpose === 'Sale' ? 'default' : 'secondary'}
        >
          For {property.purpose}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-white/70 hover:bg-white rounded-full"
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
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl font-headline mb-2 truncate">
          <Link href={`/properties/${slugOrId}`} className="hover:underline">
            {property.title}
          </Link>
        </CardTitle>
        <p className="text-muted-foreground text-sm mb-4 truncate">{property.location}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            {rating !== undefined && (
                <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="font-semibold">{rating.toFixed(1)}</span>
                    <span className="text-xs">({reviewCount || 0})</span>
                </div>
            )}
             {propertyCount !== undefined && (
                <div className="flex items-center gap-1">
                    <span className="font-semibold">{propertyCount}</span>
                    <span className="text-xs">Properties</span>
                </div>
            )}
        </div>
        <p className="text-sm text-gray-700 h-10 overflow-hidden text-ellipsis">
          {stripHtml(property.description).substring(0, 80)}
          {stripHtml(property.description).length > 80 && "..."}
        </p>
      </CardContent>
      <CardFooter className="p-4 bg-gray-50 flex-col items-start">
        <div className="w-full flex justify-between items-center mb-4">
          <p className="text-2xl font-bold text-primary">
            {hiddenPriceLabel || formatPrice(property.price)}
            {!hiddenPriceLabel && property.purpose === 'Rent' && <span className="text-sm font-normal text-muted-foreground">/month</span>}
          </p>
        </div>
        <div className="w-full flex justify-between text-sm text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-primary" />
            <span>{property.bedrooms} Beds</span>
          </div>
          <div className="flex items-center gap-2">
            <Bath className="h-4 w-4 text-primary" />
            <span>{property.bathrooms} Baths</span>
          </div>
          <div className="flex items-center gap-2">
            <SquareGanttChart className="h-4 w-4 text-primary" />
            <span>{property.area.toLocaleString()} sqft</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
