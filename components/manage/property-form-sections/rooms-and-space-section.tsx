
"use client";

import { useFormContext } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

interface RoomsAndSpaceSectionProps {
    control: any;
    category: CreatePropertyFormValues['category'];
}

type RoomConfig = {
    key: keyof CreatePropertyFormValues;
    label: string;
    emoji: string;
    min: number;
};

const ROOMS: RoomConfig[] = [
    { key: "bedrooms",        label: "Bedroom",       emoji: "🛏️",  min: 0 },
    { key: "bathrooms",       label: "Bathroom",      emoji: "🚿",  min: 0 },
    { key: "kitchens",        label: "Kitchen",       emoji: "🍳",  min: 0 },
    { key: "livingRooms",     label: "Living Room",   emoji: "🛋️",  min: 0 },
    { key: "diningRooms",     label: "Dining Room",   emoji: "🍽️",  min: 0 },
    { key: "carParkingSpots", label: "Car Parking",   emoji: "🚗",  min: 0 },
    { key: "bikeParkingSpots",label: "Bike Parking",  emoji: "🏍️",  min: 0 },
];

function RoomCounter({ config }: { config: RoomConfig }) {
    const { watch, setValue, formState: { errors } } = useFormContext<CreatePropertyFormValues>();
    const value = Number(watch(config.key) ?? 0);
    const isActive = value > 0;

    const set = (next: number) =>
        setValue(config.key, Math.max(config.min, next) as any, { shouldDirty: true, shouldValidate: true });

    return (
        <div className={cn(
            "rounded-xl border-2 p-4 transition-all",
            isActive ? "border-primary bg-primary/5" : "border-border bg-background"
        )}>
            <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 font-medium text-sm">
                    <span>{config.emoji}</span>
                    <span>{config.label}</span>
                </span>
                {isActive && (
                    <button
                        type="button"
                        onClick={() => set(0)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                        remove
                    </button>
                )}
            </div>

            {isActive ? (
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary w-8">{value}</span>
                    <div className="flex gap-2">
                        {[-1, +1, +2].map((delta) => (
                            <button
                                key={delta}
                                type="button"
                                onClick={() => set(value + delta)}
                                className="rounded-lg border-2 border-border px-3 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
                            >
                                {delta > 0 ? `+${delta}` : delta}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => set(1)}
                    className="w-full rounded-lg border-2 border-dashed border-muted-foreground/40 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                    + Add
                </button>
            )}
            <FormMessage>{(errors as any)[config.key]?.message}</FormMessage>
        </div>
    );
}

export function RoomsAndSpaceSection({ category }: RoomsAndSpaceSectionProps) {
    if (category === 'Land') return null;

    return (
        <section className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ROOMS.map((room) => (
                    <RoomCounter key={room.key} config={room} />
                ))}
            </div>
        </section>
    );
}
