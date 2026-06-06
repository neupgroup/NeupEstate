"use client";

import * as React from "react";
import { Control } from "react-hook-form";
import { Bold, Italic, Underline, List, ListOrdered, Pilcrow } from "lucide-react";
import { CreatePropertyFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/logica/core/utils";

interface TitleDescriptionSectionProps {
    control: Control<CreatePropertyFormValues>;
    fieldChangeNotes?: Partial<Record<string, string>>;
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

export function TitleDescriptionSection({ control, fieldChangeNotes }: TitleDescriptionSectionProps) {
    return (
        <section className="space-y-10">
            <div className="space-y-8">
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
            </div>
        </section>
    );
}
