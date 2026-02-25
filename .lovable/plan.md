

## UI/Styling Changes for the Hero Section

Three targeted changes to `src/pages/Index.tsx`:

### 1. Hero Background
Change the hero `<section>` from `bg-primary` (dark teal) to `bg-background` (off-white) to blend with the rest of the page. Remove the radial gradient overlay since it was designed for the dark background.

### 2. Hero Text Color
Change "Your Health," from `text-primary-foreground` (white) to `text-primary` (dark teal — the color that was previously the hero background). Update the subtitle and badge colors accordingly so they remain readable on the light background.

### 3. "Join as a Professional" Button
Replace the outline variant styling with a solid white background (`bg-white`) and deep navy text (`text-[#0A1F44]`). Remove hover effects that change background color — keep it flat and clean.

### Technical Details

**File:** `src/pages/Index.tsx`

Changes at lines 22-55:
- Line 22: `bg-primary` → `bg-background`
- Line 23: Remove the radial gradient div
- Line 26: Update badge border/bg/text for light background
- Line 30: `text-primary-foreground` → `text-primary`
- Line 34: `text-primary-foreground/70` → `text-muted-foreground`
- Lines 48-54: Replace outline button classes with `bg-white text-[#0A1F44] border-border hover:bg-white`

