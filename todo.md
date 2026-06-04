# Component Reorganization Todo

## Done

- Create `components/layout` as pure layout wrappers.
- Create `components/elements` for reusable page parts.
- Create `components/ui` for primitives.
- Create `components/logic` for shared behavioral rules.
- Create `components/guide` for usage guidance.
- Create `components/estate` for app-specific components.
- Keep compatibility exports in the existing layout entrypoints.

## Next

- Split link-selection logic into more focused `components/logic` files as needed.
- Add `v2` implementations when there is a concrete alternate layout or interaction pattern.
- Reclassify existing `components/*` files into the new folder structure.
- Decide which app-specific components should be relocated into `components/estate`.

