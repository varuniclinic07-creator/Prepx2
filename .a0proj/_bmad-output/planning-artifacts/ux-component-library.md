# PrepX Component Library

## Component Philosophy
Every component supports glassmorphism, light/dark modes, EN/HI text, and feels premium. No generic Bootstrap vibes. Every button click gives tactile feedback. Every card feels like a frosted glass panel floating in space.

---

## Buttons

### Primary Button
**Usage**: Main CTA — Quiz start, Submit, Upgrade
**Anatomy**:
```
┌────────────────────────────────────────────┐
│  ┌──────────────────────────────────────┐   │
│  │     Label   (e.g., "Start Quiz")    │   │
│  └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```
**Specs**:
- Background: `gradient-cta` (linear-gradient 90deg, #3B82F6 → #8B5CF6)
- Text: White, `button` token (15px, weight 600)
- Padding: `12px 24px`
- Border-radius: `radius-lg` (12px)
- Shadow: `shadow-glow-primary`
- Hover: `brightness(1.1)`, scale `1.02`, shadow intensifies
- Active: `scale(0.98)`, `brightness(0.95)`
- Disabled: `opacity 50%`, `cursor not-allowed`, no shadow
- Loading: Spinner replaces label, width preserved

**Dark Mode**: Gradient shifts to deeper saturation (~10% darker).
**Light Mode**: Gradient is brighter, shadow softer.
**Hindi Mode**: Padding increases by `4px` vertical for Devanagari ascents.
**State Machine**: idle → hover → active → loading → success → idle

---

### Secondary Button
**Usage**: Secondary actions — "Save for later", "Skip"
**Specs**:
- Background: `transparent`
- Border: `1px solid color-primary-500`
- Text: `color-primary-500`
- Hover: Background `color-primary-50` (light) / `rgba(59,130,246,0.08)` (dark)
- Active: Border `color-primary-600`, text `color-primary-600`

---

### Ghost Button
**Usage**: Low-emphasis, icon-only, toolbar
**Specs**:
- Background: `transparent`
- Text: `color-surface-400` (dark) / `color-surface-light-400` (light)
- Hover: Background `rgba(255,255,255,0.03)` / `rgba(0,0,0,0.03)`
- Icon only variant: Square `40x40`, `radius-md`, centered icon `icon-sm`

---

### Glass Button
**Usage**: Floating in glass panels, admin actions
**Specs**:
- Glass spec: `glass` class
- Text: `color-surface-500`
- Border: `glass-border`
- Hover: Background `rgba(255,255,255,0.08)` / `rgba(0,0,0,0.06)`
- Backdrop-filter: `blur(20px)`

---

## Cards

### Topic Card
**Usage**: Blueprint tree, content browser
**Anatomy**:
```
┌────────────────────────────────────────────┐
│  ┌────┐                                    │
│  │ 🔵 │  Polity — Fundamental Rights        │
│  └────┘  GS2 > Constitution > Part III    │
│           Progress: ████████░░ 80%         │
│                                            │
│  [Start Quiz]  [Read Topic]               │
└────────────────────────────────────────────┘
```
**Specs**:
- Glass card with `shadow-sm`
- Icon: Subject icon, `icon-lg`, inside glass circle
- Title: `h4` font, `text-primary`
- Breadcrumb: `caption`, muted
- Progress bar: Nested, `8px` height, `radius-full`
- Actions: Two `Ghost` or `Glass` buttons
- Hover: `shadow-md`, border glow `color-cyan-500` at `30%`, card lifts `translateY(-2px)`

---

### Quiz Card
**Usage**: Task list, quiz browser
**Anatomy**:
```
┌────────────────────────────────────────────┐
│  📋 Polity Quiz: Fundamental Rights          │
│     10 Questions · 15 min · Target: 75%     │
│                                            │
│  Difficulty: ████░░░░░ Medium               │
│  Last attempt: 80% (2 days ago)           │
│                                            │
│  [ Start → ]                               │
└────────────────────────────────────────────┘
```
**Specs**:
- Badge row: Question count, duration, target accuracy
- Difficulty bar: Dot scale, color-coded (green easy, yellow medium, red hard)
- Footer: Last attempt with result badge

---

### Stat Card
**Usage**: Dashboard KPIs
**Anatomy**:
```
┌────────────────────────────────────────────┐
│  ACCURACY                                  │
│  71%                                       │
│  ▲ +3% vs last week                        │
│  [Sparkline chart here]                    │
└────────────────────────────────────────────┘
```
**Specs**:
- Label: `overline`, muted
- Value: `h2`, gradient text for hero metrics
- Trend: Arrow icon + percentage, green (↑) / red (↓)
- Sparkline: Inline SVG, `40px` height, `gradient-nebula-1`

---

### Progress Card
**Usage**: Home dashboard, daily goal
**Anatomy**:
```
┌────────────────────────────────────────────┐
│  ┌─────────────────┐                     │
│  │    SVG Ring      │   Today\'s Progress   │
│  │    68%          │   5 of 8 tasks done   │
│  │   (stroke anim)  │   [See plan →]       │
│  └─────────────────┘                     │
└────────────────────────────────────────────┘
```
**Specs**:
- Ring: SVG `<circle>`, `r=56`, `strokeWidth=8`, `strokeLinecap=round`
- Progress: `stroke-dasharray` animates from 0 to value%
- Color: `gradient-nebula-1` on progress, `color-surface-200` on track
- Label: Centered number + `%` or `x/y`
- Shadow: Inner glow on ring

---

## Toggles

### Theme Switch
**Anatomy**:
```
┌────────────────────────────────────────────┐
│  ┌─────────────────────┐                   │
│  │  ☀️    ●    🌙      │                   │
│  │  Light     Dark     │                   │
│  └─────────────────────┘                   │
└────────────────────────────────────────────┘
```
**Specs**:
- Track: `48px x 24px`, `radius-full`
- Thumb: `20px` circle, white with shadow
- Position: Left (light) / Right (dark)
- Transition: Thumb slides `translateX(24px)`, `300ms ease-spring`
- Background: `color-surface-200` → `color-surface-700`
- Icon inside thumb: Sun/Moon fades (opacity 1→0 at midpoint)

---

### Language Switch (EN | HI)
**Anatomy**:
```
┌────────────────────────────────────────────┐
│  ┌─────────────────────┐                   │
│  │    EN     ●    HI   │                   │
│  └─────────────────────┘                   │
└────────────────────────────────────────────┘
```
**Specs**:
- Pill container: `radius-full`, glass background
- Segments: Both text buttons inside pill
- Active: Background `gradient-cta`, text white
- Inactive: Text `color-surface-400`
- Transition: Background slides behind active segment, `300ms ease-spring`
- Hindi Mode: `Noto Sans Devanagari` for "HI" label

---

### Feature Toggle (iOS Style)
**Usage**: Notifications, sound effects, data usage
**Specs**:
- Track: `44px x 24px`, `radius-full`
- Thumb: `20px`, white
- Active: Background `color-success-500`
- Inactive: Background `color-surface-300`
- Transition: Thumb `100ms`, background color `200ms`

---

## Inputs

### Search Input
**Usage**: Global search, topic search
**Anatomy**:
```
┌────────────────────────────────────────────┐
│  🔍 [ Search topics, quizzes, sources ]   │
└────────────────────────────────────────────┘
```
**Specs**:
- Height: `40px`
- Icon: `icon-md`, left, `color-surface-400`
- Background: Glass `glass` or `color-surface-50` (light)
- Border: `1px solid color-surface-200` → `color-primary-400` on focus
- Focus: `shadow-glow-primary` (subtle), border color `color-primary-400`
- Focus ring: `outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,0.15)`
- Placeholder: `body-sm`, muted
- Clear button: × icon on right when value present

---

### Text Field
**Usage**: Forms, email, name
**Specs**:
- Height: `44px`
- Label: Floats above on focus, `caption` size, `color-primary-400`
- Border-bottom only: Underline style, `2px`, `color-surface-200`
- Focus: Border `color-primary-400`
- Error: Border `color-error-500`, shake animation
- Supporting text: Below, `caption` size

---

### Textarea (Answer Writing)
**Usage**: Mains answer composition
**Specs**:
- Min-height: `200px`
- Max-height: `600px`, auto-resize
- Word counter: Bottom-right, `caption`
- Timer: Top-right, `overline`
- Scrollbar: Custom, `width: 6px`, `radius-full`, `color-surface-300`
- Placeholder: "Write your answer here..."

---

### Dropdown / Select
**Usage**: Goal selection, subject filter
**Specs**:
- Trigger: Same as button, chevron-down icon right
- Menu: Glass dropdown, `radius-lg`, `shadow-lg`
- Items: `body-sm`, hover bg `color-surface-50` / `rgba(255,255,255,0.03)`
- Active item: Left border `3px color-primary-500`, bg tint
- Animation: Slide down + fade, `200ms ease-out`
- Mobile: Native select overlay OR bottom sheet

---

### Checkbox
**Specs**:
- Size: `20px x 20px`, `radius-md`
- Unchecked: `1px solid color-surface-300`
- Checked: Background `color-primary-500`, checkmark white, scale-in `150ms spring`
- Label: `body-sm`, right-aligned, clickable area includes label

---

### Radio
**Specs**:
- Size: `20px` circle
- Unchecked: `2px solid color-surface-300`
- Checked: `6px` inner dot `color-primary-500`, scale-in `150ms spring`
- Label: Same as checkbox

---

## Navigation

### Top Bar (Desktop)
**Usage**: Persistent header
**Specs**:
- Height: `64px`
- Background: `glass` (blur 12px)
- Border-bottom: `1px solid glass-border`
- Left: Logo + app name
- Center: Breadcrumbs (on nested pages)
- Right: Search bar (compact), EN|HI toggle, Theme toggle, Notification bell, Avatar
- Shadow: Only on scroll (`shadow-sm` when `scrollY > 0`)
- Transition: Background opaque → transparent on scroll, `200ms`

---

### Bottom Tab Bar (Mobile)
**Usage**: Primary navigation on mobile
**Specs**:
- Height: `64px + safe-area-inset-bottom`
- Background: `glass` with `shadow-lg`
- 5 tabs: Home, Method, Action, Dashboard, Profile
- Active: Icon `color-primary-400`, label `color-primary-400`
- Inactive: `color-surface-400`
- Active indicator: Small dot or top border glow
- Tap feedback: Scale `0.95` on press

---

### Sidebar
**Usage**: Admin nav, AI Coach panel
**Specs**:
- Width: `240px` (desktop), `280px` (AI Coach)
- Background: `color-surface-0` or deeper glass
- Items: `icon-md` + label, `body-sm`
- Active: Left border `3px color-primary-500`, bg `rgba(59,130,246,0.06)`
- Hover: `translateX(4px)` or bg tint
- Collapsible: Icon-only at `64px` width, tooltip on hover

---

### Breadcrumbs
**Specs**:
- Separator: `>` chevron, `icon-xs`
- Color: Muted for separators, link color for items
- Last item: Current page, no link, bold
- Mobile: Truncated: `Home > ... > Current`

---

## Feedback

### Toast Notification
**Usage**: Success, error, info alerts
**Specs**:
- Max-width: `400px`
- Position: Bottom-right (desktop), bottom-center (mobile)
- Stacking: `8px` gap between toasts, max 3 visible
- Types: Success (green glass), Error (red glass), Info (blue glass), Warning (yellow glass)
- Icon: Left, `icon-lg`, type-colored
- Title: `body-sm`, bold
- Message: `caption`, muted
- Progress bar: Bottom, auto-dismiss countdown
- Enter: Slide from right + fade, `300ms ease-out`
- Exit: Slide right + fade + shrink, `200ms ease-in`

---

### Modal / Dialog
**Usages**: Confirmations, "How it works", preview
**Specs**:
- Overlay: `bg-black/60` with `backdrop-filter: blur(4px)`
- Container: Glass card, `radius-xl`, `shadow-lg`
- Max-widths: `sm: 400px`, `md: 560px`, `lg: 720px`
- Header: Title `h4` + close icon (X, top-right)
- Body: Scrollable if needed
- Footer: Action buttons, right-aligned
- Enter: Scale `0.95→1` + fade, `300ms ease-spring`
- Exit: Fade + scale `1→0.95`, `200ms ease-in`
- Focus trap: First focusable element focused on open
- Close: ESC key, overlay click, close button

---

### Loading Spinner (Ring)
**Specs**:
- Size variants: `sm: 16px`, `md: 24px`, `lg: 40px`, `xl: 64px`
- SVG: Two arcs, 180deg each
- Color: `gradient-nebula-1` or single `color-primary-500`
- Animation: Rotate 360deg, `1s linear infinite`
- Secondary variant: Bouncing dots (3 dots, stagger `160ms`)

---

### Progress Bar
**Specs**:
- Height: `8px` (default), `12px` (large)
- Track: `color-surface-200`, `radius-full`
- Fill: `gradient-cta`, `radius-full`
- Animated: Width transition `500ms ease-out` on change
- Striped (optional): Animated diagonal stripes for indeterminate

---

### Skeleton Loader
**Specs**:
- Shimmer: `linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)`
- Animation: `background-position` oscillates, `1.5s linear infinite`
- Border-radius: `radius-md`
- Structure: Mimic text lines and image boxes layout

---

## Data Display

### Progress Ring (SVG)
**Specs**:
```svg
<svg viewBox="0 0 120 120">
  <circle r="52" stroke="var(--surface-200)" stroke-width="10"/>
  <circle r="52" stroke="url(#gradient)" stroke-width="10"
          stroke-dasharray="326.7" stroke-dashoffset="calc(326.7 * (1 - var(--percent) / 100))"
          stroke-linecap="round" transform="rotate(-90 60 60)"/>
</svg>
```
- Center label: Number + unit, `h2`
- Gradient: `gradient-nebula-1`
- Animation: `stroke-dashoffset` from full to target, `1200ms ease-out`

---

### Bar Chart (Recharts / Custom)
**Specs**:
- Bars: `radius-md` top, no bottom radius
- Colors: Category-based from primary spectrum
- Hover: `brightness(1.1)`, tooltip appears
- Grid: Horizontal lines only, `color-surface-200`
- Axis labels: `caption`, muted
- Animation: Bars grow from bottom, stagger `60ms`

---

### Radar Chart (Spider)
**Specs**:
- Axes: Subjects (Polity, History, etc.), `body-sm` labels
- Grid: Concentric polygons, subtle
- Data area: `rgba(59,130,246,0.15)` fill, `color-primary-500` stroke
- Hover: Axis label highlights, value tooltip
- Animation: Draw polygon clockwise, `800ms ease-out`

---

### Heatmap
**Specs**:
- Cell size: `12px-16px` depending on viewport
- Grid gap: `3px`
- Colors: Green scale for completion, gray for empty
- Today cell: Ring border highlight
- Hover: Tooltip with date and score/tasks

---

### Accuracy Badge
**Specs**:
- Shape: Pill, `radius-full`
- Colors:
  - `>= 80%`: `color-success-500` bg, white text
  - `60-79%`: `color-warning-500` bg, white text
  - `< 60%`: `color-error-500` bg, white text
- Size: `padding 4px 10px`, `overline` text
- Icon: Small check/cross inline

---

## AI Components

### AI Avatar
**Anatomy**:
```
┌────────────────────────────────────────────┐
│  ┌─────────────────┐                       │
│  │                 │                       │
│  │    Orb /        │   "Hermes"            │
│  │    Gem shape    │   Thinking...         │
│  │    glowing      │                       │
│  │                 │                       │
│  └─────────────────┘                       │
└────────────────────────────────────────────┘
```
**Specs**:
- Shape: Circle or rounded diamond
- Size: `40px` (inline), `80px` (hero)
- Fill: `gradient-nebula-3` (blue → cyan → purple)
- Glow: `shadow-glow-cyan` pulsing, `2s infinite`
- Inner: Subtle mesh gradient or particle animation
- Thinking state: Glow intensifies, gentle bob animation

---

### Typing Indicator
**Specs**:
- 3 dots, `4px` each, `radius-full`
- Color: `color-surface-400`
- Animation: Sequential opacity pulse (0.3→1→0.3), stagger 160ms
- Position: Below AI message
- Duration: Until response received

---

### Suggestion Chip
**Specs**:
- Glass pill: `radius-full`, `glass` class
- Text: `caption`, `color-primary-400`
- Icon: Left, topic-related `icon-sm`
- Hover: Border glow `color-primary-500`, `scale(1.03)`
- Tap: Auto-fills input or triggers action

---

### Confidence Badge
**Specs**:
- Background: `rgba` based on confidence %
  - `>= 80%`: `rgba(16,185,129,0.15)`
  - `50-80%`: `rgba(245,158,11,0.15)`
  - `< 50%`: `rgba(239,68,68,0.15)`
- Text: Matching solid color
- Icon: Brain or sparkle icon
- Tooltip: "Hermes is X% confident in this prediction"

---

### AI Coach Floating Button
**Specs**:
- Shape: Pill + icon (mobile) / Circle (desktop)
- Size: `56px` circle, `icon-lg`
- Position: Bottom-right, `24px` from edges
- Background: `gradient-nebula-3`
- Glow: `shadow-glow-cyan` with pulse
- Hover: Scale `1.1`, glow intensifies
- Drag: Touch-drag to reposition on mobile
- Badge: Notification count dot if unread suggestions

---

*Document: ux-component-library.md | Phase: Planning | BMAD Designer: Sally*
