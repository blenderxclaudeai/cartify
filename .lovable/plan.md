

## Landing Page for VTO (Virtual Try-On)

A public landing page at `/` matching the app's monochrome, clean design system. No login required.

### Sections (top to bottom)

1. **Hero** - Product name "VTO", tagline, Chrome Web Store download button, and a mock screenshot of the extension in action
2. **How it works** - 3-step visual walkthrough: Browse any store → Click Try On → See it on you
3. **Features** - Grid of 4-6 key features (AI-powered, works on any store, save to showroom, etc.) with lucide icons
4. **Reviews / Testimonials** - Carousel or grid of user quotes with name, avatar placeholder, and star rating (hardcoded mock data for now)
5. **Pricing** - Simple card showing free tier info
6. **FAQ** - Accordion with common questions
7. **Footer** - Links, copyright, social placeholders

### Route changes
- `src/App.tsx`: Change `/` from redirecting to `/profile` → render the new `LandingPage` component (public, no auth)
- Keep `/profile` redirect for logged-in users handled inside the landing page itself (optional CTA)

### New files
- `src/pages/LandingPage.tsx` - Full landing page with all sections above

### Design
- Same monochrome palette, SF Pro font stack, rounded corners, subtle borders
- No emojis in any UI element
- Responsive: looks good full-width on desktop, stacks on mobile
- Consistent with the 400x600 extension aesthetic but expanded to full viewport

