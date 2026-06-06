"use client";

import { useEffect, useState, useTransition } from "react";
import { Control, UseFormSetValue, useFieldArray, useWatch } from "react-hook-form";
import { CreatePropertyFormValues, User } from "@/types";
import { searchClients } from "@/services/lead-service";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Star, Trash2 } from "lucide-react";
import { cn } from "@/logica/core/utils";

type ClientSearchResult = {
    id: string;
    firstName: string;
    lastName: string;
    contact: {
        email?: string | null;
        phone?: string | null;
    };
    source?: string | null;
};

function OwnerClientPicker({
    control,
    setValue,
    index,
    remove,
    isPrimary,
    hasPrimaryOwner,
    makePrimary,
}: {
    control: Control<CreatePropertyFormValues>;
    setValue: UseFormSetValue<CreatePropertyFormValues>;
    index: number;
    remove: (index: number) => void;
    isPrimary: boolean;
    hasPrimaryOwner: boolean;
    makePrimary: (index: number) => void;
}) {
    const owner = useWatch({
        control,
        name: `owners.${index}`,
    });
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ClientSearchResult[]>([]);
    const [searched, setSearched] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (owner?.clientName && !query) {
            setQuery(owner.clientName);
        }
    }, [owner?.clientName, query]);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setSearched(false);
            return;
        }

        const timeout = window.setTimeout(() => {
            startTransition(async () => {
                const found = await searchClients(trimmed);
                setResults(found as ClientSearchResult[]);
                setSearched(true);
            });
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [query]);

    return (
        <div className="space-y-6 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h4 className="font-medium">Owner {index + 1}</h4>
                    <p className="text-sm text-muted-foreground">
                        Search by client name, phone number, or email and select the owner.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant={isPrimary ? "default" : "outline"}
                        size="sm"
                        onClick={() => makePrimary(index)}
                    >
                        <Star className="mr-2 h-4 w-4" />
                        {isPrimary ? "Primary Owner" : "Make Primary"}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            </div>

            <FormField
                control={control}
                name={`owners.${index}.ownerClientId`}
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Search Client</FormLabel>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search by owner name, phone, or email"
                                className="pl-9"
                            />
                        </div>

                        {owner?.clientName ? (
                            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                                <p className="font-medium">{owner.clientName}</p>
                                <p className="text-muted-foreground">
                                    {[owner.clientPhone, owner.clientEmail].filter(Boolean).join(" · ") || "No contact details"}
                                </p>
                            </div>
                        ) : null}

                        {isPending ? (
                            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                                Searching clients...
                            </div>
                        ) : null}

                        {!isPending && searched ? (
                            results.length > 0 ? (
                                <div className="space-y-2">
                                    {results.map((client) => {
                                        const fullName = `${client.firstName} ${client.lastName}`.trim();
                                        const email = client.contact?.email || "";
                                        const phone = client.contact?.phone || "";
                                        const isSelected = field.value === client.id;

                                        return (
                                            <button
                                                key={client.id}
                                                type="button"
                                                onClick={() => {
                                                    field.onChange(client.id);
                                                    if (!hasPrimaryOwner) {
                                                        setValue(`owners.${index}.isPrimaryOwner`, index === 0, { shouldDirty: true });
                                                    }
                                                    setValue(`owners.${index}.clientName`, fullName, { shouldDirty: true });
                                                    setValue(`owners.${index}.clientEmail`, email, { shouldDirty: true });
                                                    setValue(`owners.${index}.clientPhone`, phone, { shouldDirty: true });
                                                    setQuery(fullName);
                                                }}
                                                className={cn(
                                                    "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                                                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                                                )}
                                            >
                                                <p className="font-medium">{fullName}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {[phone, email].filter(Boolean).join(" · ") || "No contact details"}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                                    No matching clients found.
                                </div>
                            )
                        ) : null}

                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}

interface OwnerInfoSectionProps {
    control: Control<CreatePropertyFormValues>;
    setValue: UseFormSetValue<CreatePropertyFormValues>;
    users: User[];
    formErrors: any;
    fieldChangeNotes?: Partial<Record<string, string>>;
}

export function OwnerInfoSection({ control, setValue, formErrors, fieldChangeNotes }: OwnerInfoSectionProps) {
    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "owners",
    });
    const owners = useWatch({
        control,
        name: "owners",
    }) || [];

    function appendOwner() {
        append({
            ownerClientId: "",
            isPrimaryOwner: owners.length === 0,
            clientName: "",
            clientEmail: "",
            clientPhone: "",
        });
    }

    function makePrimary(index: number) {
        replace(
            owners.map((owner, ownerIndex) => ({
                ...owner,
                isPrimaryOwner: ownerIndex === index,
            }))
        );
    }

    function removeOwner(index: number) {
        const wasPrimary = Boolean(owners[index]?.isPrimaryOwner);
        remove(index);

        if (!wasPrimary) return;

        const remaining = owners.filter((_, ownerIndex) => ownerIndex !== index);
        if (remaining.length === 0) return;

        window.setTimeout(() => {
            replace(
                remaining.map((owner, ownerIndex) => ({
                    ...owner,
                    isPrimaryOwner: ownerIndex === 0,
                }))
            );
        }, 0);
    }

    return (
        <section className="space-y-10">
            {fieldChangeNotes?.owners && (
                <p className="text-xs text-muted-foreground">{fieldChangeNotes.owners}</p>
            )}
            <FormMessage>{formErrors.owners?.root?.message || formErrors.owners?.message}</FormMessage>
            <div className="space-y-6">
                {fields.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Add one or more client owners for this property.
                    </div>
                ) : null}

                {fields.map((field, index) => (
                    <OwnerClientPicker
                        key={field.id}
                        control={control}
                        setValue={setValue}
                        index={index}
                        remove={removeOwner}
                        isPrimary={Boolean(owners[index]?.isPrimaryOwner)}
                        hasPrimaryOwner={owners.some((owner) => owner?.isPrimaryOwner)}
                        makePrimary={makePrimary}
                    />
                ))}

                <Button type="button" variant="outline" size="sm" onClick={appendOwner} disabled={fields.length >= 4}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Owner
                </Button>
            </div>
        </section>
    );
}
