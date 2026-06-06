
"use client";

import { useMemo } from "react";
import { Control, useFormContext } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { CounterCard } from "@/components/ui/counter-card";

interface RoomsAndSpaceSectionProps {
    control: Control<CreatePropertyFormValues>;
    category: string | undefined;
    fieldChangeNotes?: Partial<Record<string, string>>;
}

type RoomKey =
    | "bedrooms"
    | "bathrooms"
    | "kitchens"
    | "livingRooms"
    | "diningRooms"
    | "carParkingSpots"
    | "bikeParkingSpots";

type RoomConfig = {
    key: RoomKey;
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

export function RoomsAndSpaceSection({ category, fieldChangeNotes }: RoomsAndSpaceSectionProps) {
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

    const active = useMemo(() => ROOMS.filter((room, index) => {
        const value = values[index];
        return typeof value === "number" ? value > 0 : false;
    }), [values]);
    const inactive = useMemo(() => ROOMS.filter((room, index) => {
        const value = values[index];
        return !(typeof value === "number" && value > 0);
    }), [values]);

    const add = (config: RoomConfig) => {
        setValue(config.key, 1, { shouldDirty: true, shouldValidate: true });
    };

    const remove = (config: RoomConfig) => {
        setValue(config.key, 0, { shouldDirty: true, shouldValidate: true });
    };

    if (category === 'Land') return null;

    return (
        <section className="space-y-6">
            {active.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {active.map((r) => (
                        <div key={r.key} className="space-y-1">
                            <CounterCard
                                name={r.key}
                                label={r.label}
                                emoji={r.emoji}
                                sublabel="Number of Rooms"
                                steps={[-1, 1, 2]}
                                onRemove={() => remove(r)}
                            />
                            {fieldChangeNotes?.[r.key] && <p className="text-xs text-muted-foreground">{fieldChangeNotes[r.key]}</p>}
                        </div>
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
