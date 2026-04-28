
"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { X } from "lucide-react";

interface RoomsAndSpaceSectionProps {
    control: any;
    category: CreatePropertyFormValues['category'];
}

type RoomConfig = {
    key: keyof CreatePropertyFormValues;
    label: string;
    emoji: string;
};

const ROOMS: RoomConfig[] = [
    { key: "bedrooms",         label: "Bedroom",      emoji: "🛏️" },
    { key: "bathrooms",        label: "Bathroom",     emoji: "🚿" },
    { key: "kitchens",         label: "Kitchen",      emoji: "🍳" },
    { key: "livingRooms",      label: "Living Room",  emoji: "🛋️" },
    { key: "diningRooms",      label: "Dining Room",  emoji: "🍽️" },
    { key: "carParkingSpots",  label: "Car Parking",  emoji: "🚗" },
    { key: "bikeParkingSpots", label: "Bike Parking", emoji: "🏍️" },
];

function RoomCard({ config, onRemove }: { config: RoomConfig; onRemove: () => void }) {
    const { watch, setValue } = useFormContext<CreatePropertyFormValues>();
    const value = Number(watch(config.key) ?? 1);

    const set = (next: number) =>
        setValue(config.key, Math.max(0, next) as any, { shouldDirty: true, shouldValidate: true });

    return (
        <div className="rounded-2xl border bg-card shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base font-bold">
                    <span>{config.emoji}</span>
                    <span className="text-primary">{config.label}</span>
                </span>
                <button
                    type="button"
                    onClick={onRemove}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="rounded-xl bg-muted p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Number of Rooms</p>
                <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{value}</span>
                    <div className="flex gap-2">
                        {[-1, +1, +2].map((delta) => (
                            <button
                                key={delta}
                                type="button"
                                onClick={() => set(value + delta)}
                                className="rounded-xl border-2 border-border bg-background px-3 py-1.5 text-sm font-bold hover:border-primary hover:text-primary transition-colors"
                            >
                                {delta > 0 ? `+${delta}` : delta}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function RoomsAndSpaceSection({ category }: RoomsAndSpaceSectionProps) {
    const { watch, setValue } = useFormContext<CreatePropertyFormValues>();
    const [added, setAdded] = useState<string[]>([]);

    if (category === 'Land') return null;

    const active = added.map((key) => ROOMS.find((r) => r.key === key)!);
    const inactive = ROOMS.filter((r) => !added.includes(r.key));

    const add = (config: RoomConfig) => {
        setAdded((prev) => [...prev, config.key]);
        setValue(config.key, 1 as any, { shouldDirty: true, shouldValidate: true });
    };

    const remove = (config: RoomConfig) => {
        setAdded((prev) => prev.filter((k) => k !== config.key));
        setValue(config.key, 0 as any, { shouldDirty: true, shouldValidate: true });
    };

    return (
        <section className="space-y-6">
            {active.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {active.map((r) => (
                        <RoomCard key={r.key} config={r} onRemove={() => remove(r)} />
                    ))}
                </div>
            )}

            {inactive.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {inactive.map((r) => (
                        <button
                            key={r.key}
                            type="button"
                            onClick={() => add(r)}
                            className="flex items-center gap-2 rounded-full border-2 border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
                        >
                            <span>{r.emoji}</span>
                            <span>{r.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}
