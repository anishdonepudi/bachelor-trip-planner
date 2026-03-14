# Mobile Travel UX Patterns Research

## 1. Bottom Sheet Modals (Airbnb, Google Travel, Material Design)

**Pattern:** Slide-up panels from screen bottom for secondary content, filters, and details.

**Key principles (NN/g, Material Design):**
- Always include visible Close (X) button - don't rely solely on grab handle
- Swipe-down to dismiss with velocity threshold (~100px drag)
- Dim background at 40-60% black opacity for focus isolation
- Max height 85vh to maintain spatial context
- Snap points: collapsed (peek), half, full-screen
- Progressive disclosure: start with key info, reveal details on expand

**Application to TripSync:**
- Filter sheet (already implemented - good)
- Weekend card details should use bottom sheet instead of inline expansion
- Settings/Config should use bottom sheet instead of full-screen overlay
- Villa detail previews on tap

## 2. Horizontal Swipeable Card Carousels (Airbnb, Hopper, Booking.com)

**Pattern:** Horizontally scrollable cards with CSS scroll-snap for browsing comparable items.

**Key principles:**
- Use `scroll-snap-type: x mandatory` for single-card focus
- Show partial next card (peek ~20-40px) as affordance for more content
- Keep transition duration 150-300ms
- Cards should be consistent height within a carousel
- Dot indicators or count badge for position awareness

**Application to TripSync:**
- Villa listings in stays tab (currently vertical grid - should be horizontal carousel on mobile)
- Flight category comparison cards
- Budget tier quick-browse in overview mode
- Weekend top-3 cards per combo

## 3. Color-Coded Price Visualization (Hopper)

**Pattern:** Color-coded calendar/cards showing price tiers at a glance.

**Key principles:**
- Green (cheapest) to red (most expensive) gradient
- 3-4 color tiers maximum
- Show price prominently with color as secondary signal
- Always include text labels (don't rely on color alone for accessibility)

**Application to TripSync:**
- Already partially implemented in FlightAllOptions (price tier backgrounds)
- Weekend cards could show score-based color coding more prominently
- Cost comparison between budget tiers

## 4. Group Cost Splitting Interface (Splitwise)

**Pattern:** Clean per-person breakdowns with clear labels and hierarchy.

**Key principles:**
- Show individual amount prominently, group total secondary
- Green/red for who owes/is owed (clear signifiers)
- Equal split as default, with options visible but not overwhelming
- Progressive disclosure for breakdown details
- Tabular numbers for alignment

**Application to TripSync:**
- Cost breakdown table needs mobile-optimized layout (cards instead of table)
- Per-city costs should use card-based layout on mobile
- Flight + Stay = Total visual equation per person

## 5. Sticky Bottom CTA Bar (Airbnb, Hopper, Google Travel)

**Pattern:** Fixed bottom bar with primary action always visible.

**Key principles:**
- Safe area padding for notched devices (env(safe-area-inset-bottom))
- Primary action button full-width or prominent
- Semi-transparent glass background
- Should not overlap with bottom navigation
- Context-aware: changes based on current view state

**Application to TripSync:**
- "Compare Selected" or "View Details" when browsing weekends
- Bottom nav already serves this role partially - consider integrating CTAs

## 6. Collapsible Accordion Sections (Google Travel, TripIt)

**Pattern:** Expand/collapse sections for dense information.

**Key principles:**
- Clear expand/collapse indicator (chevron rotation)
- Smooth animation (200-300ms ease-out)
- Only one section open at a time (optional, reduces cognitive load)
- Section header shows key metric even when collapsed

**Application to TripSync:**
- Flight details per city
- Cost breakdown per city
- Villa amenities list
- Weekend card detail tabs already work well as tabs

## 7. Thumb-Zone-Aware Layout (iOS HIG, Material Design)

**Pattern:** Place primary actions in bottom 60% of screen for one-handed use.

**Key principles:**
- Critical CTAs near bottom of screen
- Secondary info/navigation near top
- Avoid top corners for frequent actions
- Bottom sheet > top modal for mobile interactions

**Application to TripSync:**
- View toggle (Overview/Ranked List) could be closer to bottom
- Filter chips should remain in easy reach
- Expand/collapse controls well-placed already

## 8. Bottom Tab Navigation (Material Design, iOS HIG)

**Pattern:** Fixed bottom bar with 3-5 primary destinations.

**Key principles:**
- Max 5 items
- Icon + text label for each
- Active state clearly highlighted
- Badge indicators for updates
- Safe area respect

**Application to TripSync:**
- Already implemented with 4 tabs (Weekends, Filters, Settings, Jobs)
- Good implementation - maintain this pattern

## 9. Progressive Disclosure & Skeleton Loading (Airbnb, Google)

**Pattern:** Show structure immediately, load content progressively.

**Key principles:**
- Skeleton screens instead of spinners for >300ms loads
- Shimmer animation for loading placeholders
- Progressive image loading (blur-up or fade-in)
- Content priority: show prices/dates first, images second

**Application to TripSync:**
- Already has LoadingSkeleton component - good
- Villa images should lazy-load with placeholder
- Consider skeleton states for individual card expansion

## 10. Segmented Controls for View Switching (iOS HIG)

**Pattern:** Pill/segment toggle for switching between related views.

**Key principles:**
- 2-5 segments maximum
- Equal width segments
- Clear active state (filled vs outline)
- Smooth transition between views

**Application to TripSync:**
- Overview/Ranked List toggle already uses this pattern
- Flight category tabs use horizontal scroll chips - good for >4 options
