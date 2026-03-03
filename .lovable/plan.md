

## Interactive Impact Calculator Section

Replace the static impact stats cards with a tabbed, interactive calculator — inspired by the reference image's slider-based UI. Users pick their audience (Business or Shopper), adjust sliders, and see real-time calculated savings.

### Tabs

**1. For Businesses**
- Sliders:
  - Monthly orders (100–100,000)
  - Return rate (5%–60%, default 30%)
  - Average order value ($20–$500)
  - Average return shipping cost ($5–$30)
- Calculated outputs:
  - Returns avoided per month (orders × return rate × estimated 30% reduction from VTO)
  - Money saved per year (returns avoided × shipping cost × 12)
  - CO₂ saved per year (returns avoided × 5kg × 12)
  - Landfill waste prevented (returns avoided × estimated weight)

**2. For Shoppers**
- Sliders:
  - Online orders per month (1–50)
  - Items you typically return (0%–80%, default 30%)
  - Average item price ($10–$300)
- Calculated outputs:
  - Returns you'd avoid per month
  - Money saved on return shipping per year
  - Hours saved per year (estimated time per return ~30min)
  - CO₂ you'd personally prevent

### Layout
- Section heading: "Calculate your impact"
- Subtitle: "See how much you could save — for your business, your wallet, and the planet."
- Two tabs at top: "Business" | "Shopper"
- Left side: sliders with labels and current values (like the reference image)
- Right side (or top on mobile): large calculated result with breakdown
- Keep the existing 5 stat cards below as a static "did you know" row, but smaller

### Files to change
- `src/pages/LandingPage.tsx` — Replace the Impact Stats section with the interactive calculator + condensed stats below
- Uses existing `Slider` component from `@/components/ui/slider` and `Tabs` from `@/components/ui/tabs`

### Technical notes
- Pure client-side calculation with `useState` for slider values
- No backend needed
- Formulas are simple multiplication with VTO's estimated 30% return reduction rate
- Responsive: stacked on mobile, side-by-side on desktop

