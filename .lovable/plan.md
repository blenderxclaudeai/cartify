

## Clean up Impact Calculator

### Changes to `src/components/ImpactCalculator.tsx`

**1. Remove the "did you know" stat boxes** (lines 180-194) — they clutter the section and duplicate what the calculator already shows.

**2. Simplify the visual design:**
- Remove icons from result cards — just show the number and label, cleaner
- Remove the bordered/muted background from result cards — use simple text hierarchy instead
- Make the results feel like a single summary area rather than a grid of mini-cards

**3. Improve calculations — Business tab:**
- Add: **Revenue recovered / year** = returns avoided × AOV × 12 (products kept instead of returned)
- Add: **Processing cost saved / year** = returns avoided × ~$10 restocking/processing cost × 12
- Keep: CO₂ and shipping savings
- Remove: Landfill waste (overlaps with CO₂ conceptually, less tangible)

**4. Improve calculations — Shopper tab:**
- Add: **Money kept** = returns avoided × avg item price × 12 (items you'd keep and love instead of return)
- Keep: Time saved, CO₂ prevented
- Remove: Return shipping saved (less impactful number for shoppers)

**5. Layout cleanup:**
- Sliders on the left, results on the right (keep)
- Results shown as a clean vertical list with large numbers — no cards, no icons, no borders
- More whitespace, fewer visual elements

### Result: A minimal, focused calculator that matches the site's clean aesthetic — just sliders and big numbers.

