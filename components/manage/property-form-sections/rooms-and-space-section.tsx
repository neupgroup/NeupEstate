
"use client";

import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { CounterCard } from "@/components/ui/counter-card";

interface RoomsAndSpaceSectionProps {
    control: any;
    category: string | undefined;
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

export function RoomsAndSpaceSection({ category }: RoomsAndSpaceSectionProps) {
    const { watch, setValue } = useFormContext<CreatePropertyFormValues>();
    const values = watch([
        "bedrooms",
        "bathrooms",
        "kitchens",
        "livingRooms",
        "diningRooms",
        "carParkingSpots",
        "bikeParkingSpots",
    ]) as Array<number | undefined>;

    if (category === 'Land') return null;

    const active = useMemo(() => ROOMS.filter((room, index) => {
        const value = values[index];
        return typeof value === "number" ? value > 0 : false;
    }), [values]);
    const inactive = useMemo(() => ROOMS.filter((room) => {
        const value = watch(room.key as any);
        return !(typeof value === "number" && value > 0);
    }), [watch, active]);

    const add = (config: RoomConfig) => {
        setValue(config.key, 1 as any, { shouldDirty: true, shouldValidate: true });
    };

    const remove = (config: RoomConfig) => {
        setValue(config.key, 0 as any, { shouldDirty: true, shouldValidate: true });
    };

    return (
        <section className="space-y-6">
            {active.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {active.map((r) => (
                        <CounterCard
                            key={r.key}
                            name={r.key}
                            label={r.label}
                            emoji={r.emoji}
                            sublabel="Number of Rooms"
                            steps={[-1, 1, 2]}
                            onRemove={() => remove(r)}
                        />
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
