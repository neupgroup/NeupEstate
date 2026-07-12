"use client";

import * as React from "react";
import { Control, useWatch } from "react-hook-form";
import { usePathname, useSearchParams } from "next/navigation";
import { Bold, Building2, Italic, List, ListOrdered, Pilcrow, Underline, UserRound } from "lucide-react";
import { CreatePropertyFormValues } from "@/types";
import { ClientLink } from "@/components/client-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/core/utils";

interface TitleDescriptionSectionProps {
    control: Control<CreatePropertyFormValues>;
    fieldChangeNotes?: Partial<Record<string, string>>;
    listingContext?: {
        name: string;
        label: string;
        imageUrl?: string | null;
        agencyName?: string | null;
    } | null;
    canEditListingContext?: boolean;
    listingAgentOptions?: Array<{ id: string; name: string; imageUrl?: string | null; agencyId?: string | null; agencyName?: string | null }>;
    postingProfile?: {
        name: string;
        id: string;
        label: string;
        description: string;
        canChange?: boolean;
    } | null;
    showListingProfile?: boolean;
    showPublishingCopy?: boolean;
}

function getInitials(value: string): string {
    return value
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "A";
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
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const selectedListingAgentId = useWatch({
        control,
        name: "listingAgentAccountId",
    });
    const selectedListingAgent = listingAgentOptions.find((agent) => agent.id === selectedListingAgentId);
    const listingCardName = selectedListingAgent?.name || listingContext?.name || "No listing agent/owner found.";
    const listingCardImage = selectedListingAgent?.imageUrl || listingContext?.imageUrl || null;
    const listingCardLabel = selectedListingAgent ? "Agent" : (listingContext?.label || "Listing profile unavailable");
    const postingProfileHref = React.useMemo(() => {
        if (!postingProfile) return "/accounts";

        const params = new URLSearchParams();
        const currentPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

        params.set("workingProfile", postingProfile.id);
        params.set("backs", `inapp@${encodeURIComponent(currentPath)}`);

        return `/accounts?${params.toString()}`;
    }, [pathname, postingProfile, searchParams]);

    return (
        <section className="space-y-10">
            <div className="space-y-8">
                {showListingProfile && (listingContext || postingProfile) ? (
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                            {listingContext ? (
                                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-11 w-11 shrink-0 rounded-lg border border-sky-200">
                                            <AvatarImage src={listingCardImage || undefined} alt={listingCardName} />
                                            <AvatarFallback className="rounded-lg bg-sky-50 text-xs font-semibold text-sky-600">
                                                {listingCardImage ? getInitials(listingCardName) : <UserRound className="h-5 w-5" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-950">{listingCardName}</p>
                                            <p className="mt-0.5 text-xs font-medium text-slate-500">{listingCardLabel}</p>
                                        </div>
                                    </div>

                                    {canEditListingContext && listingAgentOptions.length > 0 ? (
                                        <FormField
                                            control={control}
                                            name="listingAgentAccountId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="space-y-2">
                                                        <FormLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                            Change Listing Agent
                                                        </FormLabel>
                                                        <Select
                                                            value={field.value?.trim() ? field.value : "__none__"}
                                                            onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="h-10 rounded-lg border-slate-200">
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
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    ) : null}
                                </div>
                            ) : null}

                            {postingProfile ? (
                                <ClientLink
                                    href={postingProfileHref}
                                    aria-label={`Open accounts for ${postingProfile.name}`}
                                    className="block space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-colors hover:border-sky-200 hover:bg-sky-50/40"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-500">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-950">{postingProfile.name}</p>
                                            <p className="mt-0.5 text-xs font-medium text-slate-500">{postingProfile.label}</p>
                                        </div>
                                    </div>
                                </ClientLink>
                            ) : null}
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
