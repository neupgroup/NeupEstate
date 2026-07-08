"use client";

import { useFormContext } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";

const AMENITY_GROUPS: { label: string; items: { name: string; emoji: string }[] }[] = [
    {
        label: "Interior",
        items: [
            { name: "Air Conditioning", emoji: "❄️" },
            { name: "Central Heating", emoji: "🔥" },
            { name: "Fireplace", emoji: "🪵" },
            { name: "False Ceiling", emoji: "🏠" },
            { name: "Modular Kitchen", emoji: "🍳" },
            { name: "Built-in Wardrobes", emoji: "🚪" },
            { name: "Walk-in Closet", emoji: "👗" },
            { name: "Study Room", emoji: "📚" },
            { name: "Home Office", emoji: "💻" },
            { name: "Servant Room", emoji: "🛏️" },
            { name: "Pooja Room", emoji: "🪔" },
            { name: "Store Room", emoji: "📦" },
        ],
    },
    {
        label: "Utilities",
        items: [
            { name: "Water Supply", emoji: "💧" },
            { name: "24/7 Water Supply", emoji: "💧" },
            { name: "Electricity", emoji: "⚡" },
            { name: "Borewell", emoji: "🕳️" },
            { name: "Solar Water Heater", emoji: "☀️" },
            { name: "Solar Panels", emoji: "🔆" },
            { name: "Generator Backup", emoji: "⚡" },
            { name: "Inverter Backup", emoji: "🔋" },
            { name: "Internet", emoji: "🌐" },
            { name: "High-speed Internet", emoji: "📶" },
            { name: "Drainage", emoji: "🚰" },
            { name: "Garbage Disposal", emoji: "🗑️" },
            { name: "Telephone", emoji: "☎️" },
            { name: "Cable TV", emoji: "📺" },
            { name: "Intercom", emoji: "📞" },
            { name: "Smart Home System", emoji: "🏡" },
        ],
    },
    {
        label: "Recreation & Fitness",
        items: [
            { name: "Swimming Pool", emoji: "🏊" },
            { name: "Gym", emoji: "💪" },
            { name: "Yoga Room", emoji: "🧘" },
            { name: "Spa", emoji: "💆" },
            { name: "Sauna", emoji: "🧖" },
            { name: "Jacuzzi", emoji: "🛁" },
            { name: "Rooftop Terrace", emoji: "🌇" },
            { name: "Garden", emoji: "🌿" },
            { name: "Lawn", emoji: "🌱" },
            { name: "Playground", emoji: "🛝" },
            { name: "Indoor Games Room", emoji: "🎮" },
            { name: "Home Theatre", emoji: "🎬" },
            { name: "Clubhouse", emoji: "🏛️" },
            { name: "Community Hall", emoji: "🎪" },
        ],
    },
    {
        label: "Security",
        items: [
            { name: "24/7 Security", emoji: "💂" },
            { name: "CCTV Surveillance", emoji: "📷" },
            { name: "Gated Community", emoji: "🚧" },
            { name: "Video Door Phone", emoji: "🔔" },
            { name: "Fire Alarm", emoji: "🚨" },
            { name: "Fire Extinguisher", emoji: "🧯" },
            { name: "Fire Sprinklers", emoji: "🚿" },
            { name: "Earthquake Resistant", emoji: "🏗️" },
        ],
    },
    {
        label: "Parking & Access",
        items: [
            { name: "Car Parking", emoji: "🚗" },
            { name: "Bike Parking", emoji: "🏍️" },
            { name: "EV Charging", emoji: "🔌" },
            { name: "Lift / Elevator", emoji: "🛗" },
            { name: "Wheelchair Access", emoji: "♿" },
            { name: "Ramp Access", emoji: "📐" },
        ],
    },
    {
        label: "Outdoor & Views",
        items: [
            { name: "Mountain View", emoji: "🏔️" },
            { name: "City View", emoji: "🌆" },
            { name: "River View", emoji: "🏞️" },
            { name: "Garden View", emoji: "🌳" },
            { name: "Balcony", emoji: "🪟" },
            { name: "Private Terrace", emoji: "🌅" },
            { name: "Courtyard", emoji: "🏯" },
            { name: "BBQ Area", emoji: "🍖" },
            { name: "Pet Friendly", emoji: "🐾" },
        ],
    },
];

interface FeaturesAmenitiesSectionProps {
    control: any;
    fieldChangeNotes?: Partial<Record<string, string>>;
    previousAmenities?: string;
}

export function FeaturesAmenitiesSection({ control, fieldChangeNotes, previousAmenities }: FeaturesAmenitiesSectionProps) {
    const { watch, setValue } = useFormContext<CreatePropertyFormValues>();

    const raw = watch("amenities") || "";
    const selected: string[] = raw ? raw.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    const previousSelected: string[] = previousAmenities
        ? previousAmenities.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    // flat list of all items for lookup
    const allItems = AMENITY_GROUPS.flatMap((g) => g.items);

    const add = (name: string) => {
        setValue("amenities", [...selected, name].join(", "), { shouldDirty: true, shouldValidate: true });
    };

    const remove = (name: string) => {
        setValue("amenities", selected.filter((s) => s !== name).join(", "), { shouldDirty: true, shouldValidate: true });
    };

    return (
        <section className="space-y-10">
            <FormField
                control={control}
                name="amenities"
                render={() => (
                    <FormItem>
                        <div className="space-y-8">
                            {fieldChangeNotes?.amenities && (
                                <p className="text-xs text-muted-foreground">{fieldChangeNotes.amenities}</p>
                            )}
                            {AMENITY_GROUPS.map((group) => {
                                return (
                                    <div key={group.label} className="space-y-2">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {group.items.map((item) => {
                                                const isSelected = selected.includes(item.name);
                                                const wasPreviouslySelected = previousSelected.includes(item.name);
                                                const toneClass = isSelected
                                                    ? (wasPreviouslySelected ? "border-foreground bg-black/5 text-foreground" : "border-emerald-500 bg-emerald-50 text-foreground")
                                                    : (wasPreviouslySelected ? "border-red-500 bg-red-50 text-foreground" : "border-border bg-background text-foreground");

                                                return (
                                                <button
                                                    key={item.name}
                                                    type="button"
                                                    onClick={() => (isSelected ? remove(item.name) : add(item.name))}
                                                    className={[
                                                        "flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all",
                                                        toneClass,
                                                        !isSelected ? "hover:border-foreground hover:text-foreground" : "",
                                                    ].join(" ")}
                                                >
                                                    <span>{item.emoji}</span>
                                                    <span>{item.name}</span>
                                                </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </section>
    );
}
