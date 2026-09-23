/** Rules for valid combinations in the property creation form. */

export type PropertyCategory =
  | 'House' | 'Bungalow' | 'Villa' | 'Multiplex'
  | 'Apartment' | 'Penthouse' | 'Flat'
  | 'Land' | 'Commercial Space' | 'Shop Space';
export type PropertyPurpose = 'Sale' | 'Rent' | 'Lease' | 'Exchange';
export type PropertyNature = 'Residential' | 'Semi-Commercial' | 'Commercial' | 'Industrial' | 'Agricultural';

const HOUSE_CATEGORIES = new Set<string>(['House', 'Bungalow', 'Villa', 'Multiplex']);
const APARTMENT_CATEGORIES = new Set<string>(['Apartment', 'Penthouse']);
const COMMERCIAL_CATEGORIES = new Set<string>(['Commercial Space', 'Shop Space']);
const FLAT_OR_COMMERCIAL_CATEGORIES = new Set(['Flat', 'Commercial Space', 'Shop Space']);

export function getDisabledCategories(selected: readonly string[]): Set<string> {
  const disabled = new Set<string>();
  if (selected.some((category) => HOUSE_CATEGORIES.has(category))) {
    ['Apartment', 'Penthouse'].forEach((category) => disabled.add(category as PropertyCategory));
  }
  if (selected.some((category) => APARTMENT_CATEGORIES.has(category))) {
    ['House', 'Bungalow', 'Villa', 'Multiplex', 'Land', 'Commercial Space', 'Shop Space'].forEach((category) => disabled.add(category as PropertyCategory));
  }
  if (selected.includes('Flat')) {
    ['Apartment', 'Penthouse', 'Land', 'Commercial Space', 'Shop Space'].forEach((category) => disabled.add(category as PropertyCategory));
  }
  selected.forEach((category) => disabled.delete(category));
  return disabled;
}

export function getDisabledPurposes(categories: readonly string[]): Set<string> {
  if (categories.length > 0 && categories.every((category) => FLAT_OR_COMMERCIAL_CATEGORIES.has(category))) {
    return new Set<string>(['Sale', 'Exchange']);
  }
  return new Set<string>();
}

export function getDisabledNatures(categories: readonly string[]): Set<string> {
  const disabled = new Set<string>();
  if (categories.some((category) => APARTMENT_CATEGORIES.has(category))) {
    ['Semi-Commercial', 'Commercial', 'Industrial', 'Agricultural'].forEach((nature) => disabled.add(nature as PropertyNature));
  }
  if (categories.some((category) => COMMERCIAL_CATEGORIES.has(category))) {
    ['Residential', 'Agricultural'].forEach((nature) => disabled.add(nature as PropertyNature));
  }
  return disabled;
}

export function getDisabledNaturesByNature(selected: readonly string[]): Set<string> {
  const disabled = new Set<string>();
  if (selected.includes('Commercial')) disabled.add('Agricultural');
  if (selected.includes('Agricultural')) disabled.add('Commercial');
  return disabled;
}

export function getAutoSelectedNature(categories: readonly string[]): PropertyNature | undefined {
  return categories.length > 0 && categories.every((category) => APARTMENT_CATEGORIES.has(category)) ? 'Residential' : undefined;
}

export function canDeselect(current: readonly string[], option: string): boolean {
  return current.length > 1 || !current.includes(option);
}

export function deriveSelectionState(categories: readonly string[], purposes: readonly string[]) {
  void purposes;
  return {
    disabledCategories: getDisabledCategories(categories),
    disabledPurposes: getDisabledPurposes(categories),
    disabledNatures: getDisabledNatures(categories),
    autoNature: getAutoSelectedNature(categories),
  };
}
