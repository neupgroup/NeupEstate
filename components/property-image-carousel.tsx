"use client"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { SafeImage } from "./safe-image"

interface PropertyImageCarouselProps {
  images: string[]
  title: string
}

export function PropertyImageCarousel({ images, title }: PropertyImageCarouselProps) {
  return (
    <Carousel className="w-full rounded-lg overflow-hidden shadow-lg">
      <CarouselContent>
        {images.map((src, index) => (
          <CarouselItem key={index}>
            <SafeImage
              src={src}
              alt={`${title} - image ${index + 1}`}
              width={1200}
              height={800}
              className="w-full h-96 object-cover"
              data-ai-hint="house interior"
              priority={index === 0}
              fallbackSrc="https://placehold.co/1200x800.png"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="absolute left-4" />
      <CarouselNext className="absolute right-4" />
    </Carousel>
  )
}
