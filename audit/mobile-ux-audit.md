# Mobile UX Audit - TripSync

## Per-Component Analysis

### 1. Header / Top Bar
**Screenshot:** `header-topbar-mobile.png`

**Issues:**
- Header height 48px is adequate but brand text "TripSync" at 14px could be slightly bolder for mobile
- City/people count hidden on mobile (sm:inline) — lost context
- Refresh button and scrape status cramped in top-right corner

**Severity:** Minor
**Recommendation:** Header is functional. Keep as-is for Phase 4.

---

### 2. Mobile Filter Chips Bar
**Screenshot:** `mobile-filter-chips.png`

**Issues:**
- Chips at 11px font are too small for easy reading (below 12px minimum)
- Chip padding (py-1, px-2.5) creates touch targets of ~28px height — below 44px minimum
- All chips open the same filter sheet — no direct chip interaction
- No visual hierarchy between active and changeable filters

**Severity:** Major
**Recommendation:** Increase chip height to 36-40px, font to 13px. Add distinct tap behavior per chip (e.g., tap budget chip → scroll to budget section in filter sheet).

---

### 3. View Toggle (Overview / Ranked List)
**Screenshot:** `dashboard-overview-mobile.png`

**Issues:**
- Toggle is at the top of content area — requires thumb stretch on tall phones
- Buttons at 12px text are readable but small
- Toggle padding (py-1.5, px-3) gives ~32px height — below 44px touch target

**Severity:** Major
**Recommendation:** Increase button height to 40px minimum. Consider making it a sticky element that stays visible during scroll.

---

### 4. ComboSummary - Overview Mode (Mobile)
**Screenshot:** `dashboard-overview-mobile.png`

**Issues:**
- Flight category tabs (horizontal scroll) work well on mobile
- Budget section cards are functional but list items are cramped
- Each combo item row has small text (11px for dates, 10px for day labels)
- The "Popular" button is well-placed but easy to miss
- Popular weekends panel has very dense information — 9 items with bars and stats
- No price comparison visualization between budget tiers

**Severity:** Major
**Recommendation:** Increase row heights for combo items. Add subtle price comparison visual between Budget/Mid-Range/Premium within each flight category.

---

### 5. Ranked List Weekend Cards
**Screenshot:** `dashboard-ranked-list-mobile.png`

**Issues (CRITICAL):**
- Each card takes ~150px+ of vertical space in collapsed state — way too much
- The $725 price in 2xl (24px) bold font dominates the card — price hero section eats 40% of card height
- "avg/person" label at 11px below the huge price looks disconnected
- Rank indicator + score badge + date + price + meta pills all compete for attention
- Vertical scrolling through 20+ cards means enormous scroll distance (~3000px+)
- Meta pills ("14 stays", "108d away") at 11px are barely readable
- The expand chevron at 16px (w-4 h-4) is too small as a touch target
- Information hierarchy is wrong: price dominates but date/rank should be primary

**Severity:** Critical
**Recommendation:** Completely redesign collapsed card layout:
- Reduce price font to 18-20px, inline with date
- Make the full card row a more compact horizontal layout
- Target ~80px card height for collapsed state
- Make the entire card the tap target (already is, but make it feel more tappable)
- Consider grouped date-range headers for same-month weekends

---

### 6. Expanded Weekend Card - Flights Tab
**Screenshot:** `weekend-card-expanded-flights-mobile.png`

**Issues:**
- Tab bar (Flights/Stays/Costs) has small touch targets — tab buttons are ~32px height
- Per-city flight rows are very dense with tiny text (10-11px throughout)
- Flight details (airline, times, stops) are at 10px — below minimum
- Price links at 14px are ok but compete with surrounding noise
- "All Flight Options" expandable section adds another level of nesting
- Flight category tabs within expanded section create 3 levels of nested tabs (View toggle > Card tabs > Flight category tabs)
- Mobile city cards in "All Flight Options" have adequate spacing

**Severity:** Major
**Recommendation:**
- Increase tab bar height to 44px with larger text (14px)
- Increase flight detail text to 12-13px minimum
- Simplify per-city rows with clearer visual hierarchy
- Consider making flight options a separate bottom sheet instead of nested expansion

---

### 7. Expanded Weekend Card - Stays Tab
**Screenshot:** `weekend-card-expanded-stays-mobile.png`

**Issues:**
- Villa cards are single-column on mobile — good layout choice
- Image aspect ratio 16:10 works well
- Card text is appropriately sized (14px name, 11px details)
- Amenity pills at 9px are too tiny to read
- "Superhost" badge at 9px is too small
- Price display is clear ($56/pp/night at 16px)
- "Show more" link for additional listings is discoverable
- Additional listings show as a compact list — good progressive disclosure
- Rank badge overlay on images is subtle and effective

**Severity:** Minor
**Recommendation:** Increase amenity pill text to 11px and superhost badge to 10px. Consider horizontal swipe carousel for villa cards instead of vertical scroll (reduces scroll fatigue within expanded card).

---

### 8. Expanded Weekend Card - Costs Tab
**Screenshot:** `weekend-card-expanded-costs-mobile.png`

**Issues:**
- Table layout works on mobile but city names truncate ("San Francisco" wraps)
- Table cells are compact but readable
- Header row at 10px uppercase is a bit small
- "Group Total" row is clearly highlighted — good
- Horizontal scroll wrapper exists but table fits within viewport
- Column alignment (right-aligned numbers) is correct with tabular-nums

**Severity:** Minor
**Recommendation:** Consider card-based layout instead of table for mobile — one card per city showing Flight + Stay = Total. This would eliminate truncation issues and be more thumb-friendly.

---

### 9. Filter Sheet (Bottom Sheet)
**Screenshot:** `filter-sheet-open-mobile.png`

**Issues:**
- Bottom sheet implementation is solid — has grab handle, backdrop, swipe-to-dismiss
- Flight type buttons in 2-column grid with 2.5px padding gives good touch targets (~44px height)
- Budget tier buttons are full-width with adequate height
- Select dropdowns for City and Scoring at 40px height meet minimum
- "Apply" button is prominent at bottom — good sticky CTA
- "Reset" link in header is discoverable
- Overall spacing and typography are good

**Severity:** Minor (already well-implemented)
**Recommendation:** Add a close X button in addition to grab handle (NN/g best practice). Consider replacing select dropdowns with button groups for City selection (more mobile-native).

---

### 10. Settings Panel (Mobile Config)
**Screenshot:** `settings-panel-mobile.png`

**Issues (CRITICAL):**
- The panel shows a single "Config" button and massive empty space
- Full-screen overlay with just one button is terrible UX
- The ConfigModal is rendered inside this panel but appears to not be loading its content
- Close button (X) is properly sized at 44px — good
- Header "Settings" text at 14px is clear

**Severity:** Critical
**Recommendation:** The ConfigModal likely renders as a dialog/modal which doesn't work when embedded in a full-screen panel. Need to render config content inline instead of inside a modal wrapper. This is a functionality bug, not just a design issue.

---

### 11. Jobs Panel (Mobile)
**Screenshot:** `jobs-panel-mobile.png`

**Issues (CRITICAL):**
- Like Settings, the Jobs panel is nearly empty
- JobsPanel component likely renders minimally when no active jobs exist
- The empty state shows nothing — no message, no guidance
- Massive wasted space

**Severity:** Critical
**Recommendation:** Add proper empty state ("No recent jobs. Trigger a data refresh to see job progress here."). When jobs exist, show them with adequate spacing and mobile-friendly cards.

---

### 12. Bottom Navigation
**Screenshot:** `bottom-nav-mobile.png`

**Issues:**
- 4 tabs with icon + label — follows material design guidelines
- Height 56px with safe area padding — good
- Glass effect backdrop — visually clean
- Active state uses blue color — clear indicator
- Touch targets span full flex-1 width — good
- Filter badge count indicator works well

**Severity:** None (well-implemented)
**Recommendation:** Keep as-is. Consider adding subtle haptic-style visual feedback on tap (scale animation).

---

### 13. Popular Weekends Section
**Screenshot:** `popular-weekends-mobile.png`

**Issues:**
- Dense list of 9 items with rank, date, points, bar chart, and stats
- Text at 10-11px throughout is quite small
- Bar charts (progress bars) help with visual scanning — good
- The info header ("1st = 3pts, 2nd = 2pts, 3rd = 1pt") is helpful
- Close (X) button is available — good
- Rank numbers (#1-#9) are clearly visible

**Severity:** Minor
**Recommendation:** Increase base text size to 12-13px. Consider showing only top 5 with "Show all" toggle to reduce initial density.

---

### 14. Loading Skeleton
**Screenshot:** `loading-state-mobile.png`

**Issues:**
- Clean skeleton loading with rectangular placeholders — good pattern
- Cards are clearly identifiable as loading placeholders
- Bottom nav is visible during loading — good
- Header is present — good

**Severity:** None (well-implemented)
**Recommendation:** Add shimmer animation if not already present (it exists in CSS but may need to be applied to skeleton elements).

---

## Global Issues

### Components that are "shrunk desktop":
1. **Cost breakdown table** — desktop table shrunk to fit mobile; should be card-based
2. **Settings panel** — desktop modal embedded in mobile overlay; broken UX
3. **Jobs panel** — desktop component with no mobile adaptation or empty state

### Missing mobile-native patterns:
- **Swipe gestures:** No swipe-to-dismiss on weekend cards, no horizontal swipe carousels
- **Bottom sheets:** Filter sheet is good; Settings/Jobs should also use bottom sheets instead of full-screen overlays
- **Sticky CTAs:** No persistent action button beyond bottom nav
- **Pull-to-refresh:** No pull-to-refresh on the weekend list
- **Skeleton loading:** Exists but could be enhanced with shimmer
- **Progressive disclosure:** Weekend cards do this well with expand/collapse
- **Scroll snap:** No horizontal carousels use scroll-snap

### Navigation assessment:
- Bottom nav with 4 tabs is appropriate and well-implemented
- Settings and Jobs open as full-screen overlays but should use bottom sheets
- View toggle (Overview/Ranked List) placement is good

---

## Redesign Priority Matrix

### High Impact, Low Effort (DO FIRST):
1. **Fix Settings panel** — render config content inline instead of embedded modal
2. **Fix Jobs panel** — add empty state, render content properly
3. **Increase filter chip touch targets** — padding and font size bump
4. **Increase view toggle touch targets** — height to 44px
5. **Increase tab bar touch targets** in expanded weekend cards
6. **Increase filter sheet close button** — add X button

### High Impact, High Effort (DO SECOND):
7. **Redesign ranked list weekend cards** — compact layout, better information hierarchy
8. **Convert Settings/Jobs to bottom sheets** instead of full-screen overlays
9. **Add horizontal swipe carousel** for villa listings in stays tab
10. **Redesign cost breakdown** as card-based layout for mobile

### Low Impact, Low Effort (DO IF TIME):
11. **Increase amenity pill text size** to 11px
12. **Increase popular weekends text size** to 12px
13. **Add shimmer to skeleton loading**
14. **Add subtle press feedback** to bottom nav items

### Low Impact, High Effort (DEFER):
15. Pull-to-refresh on weekend list
16. Swipe gestures on weekend cards
17. Scroll-snap horizontal carousels (beyond villa carousel)
