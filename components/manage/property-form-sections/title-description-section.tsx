"use client";

import * as React from "react";
import { Control, useWatch } from "react-hook-form";
import { Bold, Building2, Italic, List, ListOrdered, Pilcrow, Underline, UserRound } from "lucide-react";
import { CreatePropertyFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/logica/core/utils";

interface TitleDescriptionSectionProps {
    control: Control<CreatePropertyFormValues>;
    fieldChangeNotes?: Partial<Record<string, string>>;
    listingContext?: {
        name: string;
        label: string;
        agencyName?: string | null;
    } | null;
    canEditListingContext?: boolean;
    listingAgentOptions?: Array<{ id: string; name: string; agencyId?: string | null; agencyName?: string | null }>;
    postingProfile?: {
        name: string;
        id: string;
        description: string;
    } | null;
    showListingProfile?: boolean;
    showPublishingCopy?: boolean;
}

function RichTextEditor({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    const editorRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        if (editor.innerHTML !== value) {
            editor.innerHTML = value || "";
        }
    }, [value]);

    function exec(format: string, option?: string) {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        document.execCommand(format, false, option);
        onChange(editor.innerHTML);
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-1 rounded-md border bg-muted/30 p-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => exec("bold")}>
                    <Bold className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec("italic")}>
                    <Italic className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec("underline")}>
                    <Underline className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec("insertUnorderedList")}>
                    <List className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec("insertOrderedList")}>
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec("formatBlock", "p")}>
                    <Pilcrow className="h-4 w-4" />
                </Button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                data-placeholder={placeholder}
                className={cn(
                    "min-h-40 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "empty:before:text-muted-foreground",
                )}
                onInput={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
                onBlur={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
            />
            <p className="text-xs text-muted-foreground">
                Use basic formatting for emphasis, bullet lists, and structure. The description is stored as HTML.
            </p>
        </div>
    );
}

export function TitleDescriptionSection({
    control,
    fieldChangeNotes,
    listingContext,
    canEditListingContext = false,
    listingAgentOptions = [],
    postingProfile = null,
    showListingProfile = true,
    showPublishingCopy = true,
}: TitleDescriptionSectionProps) {
    const selectedListingAgentId = useWatch({
        control,
        name: "listingAgentAccountId",
    });
    const selectedListingAgent = listingAgentOptions.find((agent) => agent.id === selectedListingAgentId);
    const selectedAgencyName = selectedListingAgent
        ? (selectedListingAgent.agencyName?.trim() || null)
        : (listingContext?.agencyName?.trim() || null);
    const listingCardName = selectedListingAgent?.name || listingContext?.name || "No listing agent/owner found.";
    const listingCardLabel = selectedListingAgent
        ? (selectedAgencyName ? `Agent, Agent from ${selectedAgencyName}` : "Agent")
        : (listingContext?.label || "No individual associated with this listing was found.");

    return (
        <section className="space-y-10">
            <div className="space-y-8">
                {showListingProfile && listingContext ? (
                    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                        <div className="space-y-1">
                            <h3 className="text-base font-semibold">Listed by</h3>
                            <p className="text-sm text-muted-foreground">
                                Review who is associated with this listing.
                            </p>
                        </div>

                        <div className="rounded-lg border bg-background p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                                    <UserRound className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground">{listingCardName}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{listingCardLabel}</p>
                                    {selectedAgencyName ? (
                                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                                            <Building2 className="h-3.5 w-3.5" />
                                            Connected agency: {selectedAgencyName}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {canEditListingContext ? (
                            <FormField
                                control={control}
                                name="listingAgentAccountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Listing agent</FormLabel>
                                        <Select
                                            value={field.value?.trim() ? field.value : "__none__"}
                                            onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a listing agent" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="__none__">No listing agent</SelectItem>
                                                {listingAgentOptions.map((agent) => (
                                                    <SelectItem key={agent.id} value={agent.id}>
                                                        {agent.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Only accounts with transfer permission can change the listing agent.
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : null}

                        {canEditListingContext && selectedAgencyName ? (
                            <div className="space-y-2">
                                <FormLabel>Listing agency</FormLabel>
                                <Input value={selectedAgencyName} readOnly disabled />
                            </div>
                        ) : null}

                    </div>
                ) : null}

                {showListingProfile && postingProfile ? (
                    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                        <div className="space-y-1">
                            <h3 className="text-base font-semibold">Posting Profile</h3>
                            <p className="text-sm text-muted-foreground">
                                {postingProfile.description}
                            </p>
                        </div>

                        <div className="rounded-lg border bg-background p-4">
                            <p className="font-medium">{postingProfile.name}</p>
                            <p className="text-sm text-muted-foreground">{postingProfile.id}</p>
                        </div>
                    </div>
                ) : null}

                {showPublishingCopy ? (
                    <>
                        <FormField
                            control={control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Modern Downtown Loft" {...field} />
                                    </FormControl>
                                    {fieldChangeNotes?.title && <p className="text-xs text-muted-foreground">{fieldChangeNotes.title}</p>}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <RichTextEditor
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            placeholder="Describe the property..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold">Publishing</h3>
                                <p className="text-sm text-muted-foreground">
                                    Control how this property appears on the website.
                                </p>
                            </div>

                            <FormField
                                control={control}
                                name="isPrivate"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-sm font-medium">Make private</FormLabel>
                                            <p className="text-xs text-muted-foreground">
                                                The description will not show on the public website.
                                            </p>
                                        </div>
                                        <FormControl>
                                            <Switch checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(checked)} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <div className="grid gap-3 sm:grid-cols-2">
                                <FormField
                                    control={control}
                                    name="showMap"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">Show map</FormLabel>
                                                <p className="text-xs text-muted-foreground">Display the map on the public listing.</p>
                                            </div>
                                            <FormControl>
                                                <Switch checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(checked)} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="showOwnerInformation"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">Show owner info</FormLabel>
                                                <p className="text-xs text-muted-foreground">Display owner details on the public listing.</p>
                                            </div>
                                            <FormControl>
                                                <Switch checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(checked)} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </section>
    );
}
