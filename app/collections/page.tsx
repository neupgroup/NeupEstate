
import { RecommendedProperties } from "@/components/recommended-properties";
import { Wand2 } from "lucide-react";

export default function CollectionsPage() {
  return (
    <main className="flex-1">
      <div className="bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
            <Wand2 className="h-8 w-8 text-primary" />
            Curated For You
          </h1>
          <p className="mt-2 text-muted-foreground">
            Properties recommended based on your interests.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <RecommendedProperties />
      </div>
    </main>
  );
}
