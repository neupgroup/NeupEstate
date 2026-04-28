/**
 * Property selection rules.
 * Defines which options are disabled and which are auto-selected
 * based on the current purpose/category/type selections.
 */

export type PropertyCategory =
    | "House" | "Bungalow" | "Villa" | "Multiplex"
    | "Apartment" | "Penthouse" | "Flat"
    | "Land"
    | "Commercial Space" | "Shop Space";

export type PropertyPurpose = "Sale" | "Rent" | "Lease" | "Exchange";

export type PropertyNature =
    | "Residential" | "Semi-Commercial" | "Commercial" | "Industrial" | "Agricultural";

// ─── Category rules ───────────────────────────────────────────────────────────

const HOUSE_GROUP     = ["House", "Bungalow", "Villa", "Multiplex"] as const;
const APARTMENT_GROUP = ["Apartment", "Penthouse"] as const;
const COMMERCIAL_GROUP = ["Commercial Space", "Shop Space"] as const;

/**
 * Returns which categories should be disabled given the current selections.
 * Rules apply based on any selected item in the array.
 */
export function getDisabledCategories(selected: string[]): Set<string> {
    const disabled = new Set<string>();

    for (const s of selected) {
        if (HOUSE_GROUP.includes(s as any)) {
            ["Apartment", "Penthouse"].forEach(d => disabled.add(d));
        }
        if (APARTMENT_GROUP.includes(s as any)) {
            ["House", "Bungalow", "Villa", "Multiplex", "Land", "Commercial Space", "Shop Space"].forEach(d => disabled.add(d));
        }
        if (s === "Flat") {
            ["Apartment", "Penthouse", "Land", "Commercial Space", "Shop Space"].forEach(d => disabled.add(d));
        }
    }

    // Never disable something already selected
    for (const s of selected) disabled.delete(s);

    return disabled;
}

// ─── Purpose rules ────────────────────────────────────────────────────────────

/**
 * Returns which purposes should be disabled given the current categories.
 */
export function getDisabledPurposes(categories: string[]): Set<string> {
    const disabled = new Set<string>();
    const allCommercialOrFlat = categories.length > 0 &&
        categories.every(c => ["Flat", "Commercial Space", "Shop Space"].includes(c));

    if (allCommercialOrFlat) {
        ["Sale", "Exchange"].forEach(d => disabled.add(d));
    }
    return disabled;
}

// ─── Nature (type) rules ──────────────────────────────────────────────────────

/**
 * Returns which natures should be disabled given the current categories.
 */
export function getDisabledNatures(categories: string[]): Set<string> {
    const disabled = new Set<string>();

    for (const c of categories) {
        if (APARTMENT_GROUP.includes(c as any)) {
            ["Semi-Commercial", "Commercial", "Industrial", "Agricultural"].forEach(d => disabled.add(d));
        }
        if (COMMERCIAL_GROUP.includes(c as any)) {
            ["Residential", "Agricultural"].forEach(d => disabled.add(d));
        }
    }
    return disabled;
}

/**
 * Returns which natures should be disabled given the currently selected natures.
 */
export function getDisabledNaturesByNature(selectedNatures: string[]): Set<string> {
    const disabled = new Set<string>();
    if (selectedNatures.includes("Commercial")) {
        disabled.add("Agricultural");
    }
    if (selectedNatures.includes("Agricultural")) {
        disabled.add("Commercial");
    }
    return disabled;
}

/**
 * Returns the nature that should be auto-selected given the current categories.
 */
export function getAutoSelectedNature(categories: string[]): PropertyNature | undefined {
    if (categories.length === 0) return undefined;
    if (categories.every(c => APARTMENT_GROUP.includes(c as any))) {
        return "Residential";
    }
    return undefined;
}

/**
 * At least one selection is required for categories and natures.
 * Returns true if the toggle should be allowed (won't result in empty selection).
 */
export function canDeselect(current: string[], option: string): boolean {
    return current.length > 1 || !current.includes(option);
}

/**
 * Returns the full derived state for a given selection combo.
 */
export function deriveSelectionState(categories: string[], purposes: string[]) {
    return {
        disabledCategories: getDisabledCategories(categories),
        disabledPurposes:   getDisabledPurposes(categories),
        disabledNatures:    getDisabledNatures(categories),
        autoNature:         getAutoSelectedNature(categories),
    };
}
