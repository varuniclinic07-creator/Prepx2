# PrepX Animation System

## Animation Philosophy
PrepX moves like an intelligent product — calm when you need focus, celebratory when you deserve it. Every animation has a job: guide attention, express state change, or celebrate progress. No decorative motion.

---

## Page Transitions

### Route Change (Next.js)
**Direction**: Horizontal slide or fade
**Rules**:
- Same-level navigation (tab → tab): No animation (instant)
- Drill-down (home → quiz): Slide left, `300ms ease-out`
- Drill-up (quiz → home): Slide right, `300ms ease-out`
- Modal open: Scale `0.95→1` + fade, `300ms spring`
- Modal close: Fade + scale `1→0.95`, `200ms`

**CSS Implementation**:
```css
.page-enter {
  opacity: 0;
  transform: translateX(20px);
}
.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: opacity 300ms ease-out, transform 300ms ease-out;
}
.page-exit {
  opacity: 1;
}
.page-exit-active {
  opacity: 0;
  transition: opacity 200ms ease-in;
}
```

### Initial Page Load
**Sequence**:
1. Skeleton shimmer (0-400ms)
2. Content fade-in staggered (400ms onwards, 60ms per element)
3. Hero elements: `slideUp + fade`, `600ms ease-out`

---

## Component Animation Patterns

### List Loading (Staggered Fade-In)
**Usage**: Feed, task list, quiz options
**Spec**:
```css
.list-item {
  opacity: 0;
  transform: translateY(16px);
  animation: staggerIn 300ms ease-out forwards;
}
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 60ms; }
.list-item:nth-child(3) { animation-delay: 120ms; }
/* max 6 visible, rest instant */

@keyframes staggerIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### Scroll-Triggered Animations
**Trigger**: Element enters viewport (IntersectionObserver, threshold 0.1)
**Effects**:
- Section headings: Fade in + slideUp (24px)
- Cards: Staggered fade-in (as above)
- Charts: Grow from bottom / draw from left
**Once-only**: True (no re-animation on scroll back)
**Mobile**: Reduce motion distance (24px → 12px)

---

### Pull-to-Refresh
**Usage**: Home feed, sources feed
**Spec**:
- Threshold: `80px` pull distance
- Visual: AI avatar orb rotating + "Pull to refresh" text
- Release: Content reloads, orb spins, then snaps back
- Duration: Snap-back `400ms spring`
- Haptic feedback if available (pull, refresh, release)

---

### Success State Animations

#### Score Celebration
**Trigger**: Quiz completes, score >= 70%
**Sequence**:
1. Score number counter: 0 → target over `1000ms ease-out`
2. Ring draw: SVG stroke-dashoffset animates to fill proportion
3. Confetti burst: `60-80` particles, gravity `1200`, spread `360deg`, duration `2s`
4. Streak update: Fire icon pulse `scale(1→1.4→1)`, `400ms spring`
5. Screen flash: Subtle white overlay fade `300ms`

#### Streak Milestone
**Trigger**: 7, 14, 30, 50, 100 days
**Sequence**:
1. Full-screen overlay with dark backdrop
2. Milestone number scales in with glow (`800ms spring`)
3. Confetti (color: `gradient-nebula-2`)
4. Mentor message types in (typewriter effect, 30ms/char)
5. CTA: "Keep going" pulses

---

### AI Typing / Thinking Animation
**States**:
1. **Idle**: Avatar orb gentle float (`translateY(±4px)`, `3s ease-in-out infinite`)
2. **Thinking**: Orb glow intensifies (`box-shadow` pulse, `1.5s`), internal particles swirl
3. **Typing**: Three dots pulse sequentially (see Typing Indicator component)
4. **Response Complete**: Message card slides in from left (`300ms ease-out`), avatar returns to idle

---

### Progress Ring Animation
**Spec** (SVG):
```css
.progress-ring-circle {
  transition: stroke-dashoffset 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```
- Triggered on mount and value change
- Easing: `spring` for bouncy feel
- Color: `gradient-nebula-1` defined in `<defs>`
- Center number counter runs in parallel

---

### Button Press Feedback
**Sequence**:
1. **Press down**: `scale(0.97)`, `shadow-glow` reduces, `100ms`
2. **Hold**: Remains pressed state
3. **Release**: `scale(1)`, shadow returns, `150ms spring`
4. **Success variant**: Additional green pulse `box-shadow` `300ms`

---

### Modal Enter / Exit
**Enter**:
1. Backdrop: `opacity 0 → 1`, `200ms`
2. Panel: `scale(0.95→1)`, `opacity(0→1)`, `translateY(10px→0)`, `300ms spring`
**Exit**:
1. Panel: `scale(1→0.95)`, `opacity(1→0)`, `200ms`
2. Backdrop: `opacity 1 → 0`, `200ms`
**Focus**: Auto-focus first input or close button

---

### Toast Slide-In
**Enter**: `translateX(100%) → 0`, `opacity 0 → 1`, `300ms ease-out`
**Exit**: `translateX(0 → 100%)`, `opacity 1 → 0`, `200ms ease-out`
**Swipe (mobile)**: Swipe right to dismiss, velocity-based with spring snap-back if below threshold

---

### Skeleton Shimmer
**Spec**:
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-100) 25%,
    var(--surface-200) 50%,
    var(--surface-100) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```
**Usage**: During data fetch before content renders

---

### Dark / Light Mode Transition
**Spec**:
```css
.theme-transition {
  transition: background-color 400ms ease,
              color 400ms ease,
              border-color 400ms ease,
              box-shadow 400ms ease;
}
```
- Applied to ALL themed elements via CSS custom properties
- Toggle: Instant value change, `400ms` crossfade feel
- Glass cards: Border and background shift smoothly
- Gradients: Color-shift rather than instant swap

---

### Number Counter Animation
**Usage**: Score reveals, rank reveals, streak counts
**Specs**:
- Count from 0 → target over `1000ms`
- Easing: `ease-out` (fast start, slow end)
- Suffix: Added after count completes (`%`, `days`, `AIR`)
- Format: Commas for thousands (12,450)
- `useCountUp()` hook or `react-countup` library

---

### Accordion Expand / Collapse
**Enter**: `height: 0 → auto`, `opacity 0 → 1`, `300ms ease-out`
**Exit**: `opacity 1 → 0`, `height: auto → 0`, `200ms ease-in`
**Chevron**: Rotates `0deg → 180deg`, synced with height

---

### Image / Card Hover
**Desktop hover**:
- `translateY(-2px)`, `shadow-md` → `shadow-lg`
- Border glow intensifies (glass border opacity +20%)
- Inner gradient overlay fades in
**Duration**: `200ms ease-out`
**Transform-origin**: Center bottom

---

### Infinite Scroll / Load More
**Trigger**: IntersectionObserver on sentinel
**Loading state**: Skeleton block fades in at bottom
**New items**: Staggered fade-in (as list loading)

---

### AI Coach Panel Open/Close
**Mobile (Bottom Sheet)**:
- Open: `translateY(100%) → 0`, `300ms spring`, backdrop blur `0 → 4px`
- Close: Swipe down or tap backdrop, `translateY(0 → 100%)`, `200ms`
**Desktop (Sidebar)**:
- Open: `translateX(100%) → 0`, `300ms ease-out`
- Close: `translateX(0 → 100%)`, `200ms ease-in`

---

## Accessibility

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
**Exceptions**:
- Toast: Still slides in (instant feels broken), but `100ms` max
- Skeleton: Static gray block instead of shimmer
- Progress ring: Instant fill instead of draw

---

## Animation Tokens Summary

| Token | Value | Usage |
|-------|-------|-------|
| `anim-instant` | 0ms | No animation |
| `anim-fast` | 150ms | Hover, toggles |
| `anim-normal` | 300ms | State changes, modals |
| `anim-slow` | 500ms | Page transitions, reveals |
| `anim-cinematic` | 800ms | Hero, rank reveal |
| `ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Generic transitions |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter |
| `ease-spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Bouncy |

---

*Document: ux-animations.md | Phase: Planning | BMAD Designer: Sally*
