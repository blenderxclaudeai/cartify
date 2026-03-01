

## Expand Profile Categories

Final category groups: **You**, **Home**, **Pets**, **Vehicle**, **Garden/Outdoor**

### Database Migration
Add new enum values to `photo_category`:
- You: `hands`, `fingers`, `nails`, `hair`, `ears`
- Home: `living_room`, `kitchen`, `bedroom`, `bathroom`, `office`
- Pets: `dog`, `cat`
- Vehicle: `car_interior`, `car_exterior`
- Garden/Outdoor: `patio`, `garden`, `balcony`

Remove old `lifestyle` value (or keep for backward compat — will check if any data uses it).

### Profile Page Update (`src/pages/Profile.tsx`)
- Replace the flat 4-category grid with horizontal **Tabs** (You / Home / Pets / Vehicle / Garden)
- Each tab shows a scrollable 2-column grid of its subcategories as upload slots
- Keep the same upload/replace/delete UX per slot
- Tabs use the existing `@radix-ui/react-tabs` component

### Category Map (in code)
```text
You:      full_body, upper_body, face, hands, fingers, nails, hair, ears
Home:     living_room, kitchen, bedroom, bathroom, office
Pets:     dog, cat
Vehicle:  car_interior, car_exterior
Garden:   patio, garden, balcony
```

### No Other Changes
- No backend logic changes — upload flow stays the same
- No new tables or RLS changes needed
- Enum expansion is additive and non-breaking

