# PrepX Design System

## Overview
The PrepX Design System powers a premium, futuristic, AI-native learning interface. Built on glassmorphism + neon gradients, it balances aspirational energy with calm focus — the interface itself becomes the aspirant's mentor.

---

## Color Palette

### Primary Spectrum
| Token | Hex | Role |
|-------|-----|------|
| `color-primary-50` | `#EEF4FF` | Background tint |
| `color-primary-100` | `#D9E4FF` | Hover tint |
| `color-primary-200` | `#B6CDFF` | Subtle border |
| `color-primary-300` | `#84A9FF` | Secondary accent |
| `color-primary-400` | `#5280FF` | Active state |
| `color-primary-500` | `#2B59F0` | **Primary brand** |
| `color-primary-600` | `#1E40AF` | Dark variant |
| `color-primary-700` | `#1E3A8A` | Deep background |
| `color-primary-800` | `#172554` | Dark surface |
| `color-primary-900` | `#0F172A` | Darkest layer |

### Secondary — Purple (AI / Intelligence)
| Token | Hex | Role |
|-------|-----|------|
| `color-secondary-300` | `#C4B5FD` | Hover glow |
| `color-secondary-400` | `#A78BFA` | AI avatar ring |
| `color-secondary-500` | `#8B5CF6` | **Secondary brand** |
| `color-secondary-600` | `#6D28D9` | Deep purple |
| `color-secondary-700` | `#5B21B6` | Dark accent |

### Neon Nebula Gradients (Signature Effects)
| Token | CSS | Role |
|-------|-----|------|
| `gradient-nebula-1` | `linear-gradient(135deg, #3B82F6, #8B5CF6, #06B6D4)` | Hero text, logo bg |
| `gradient-nebula-2` | `linear-gradient(135deg, #8B5CF6, #EC4899, #06B6D4)` | Confetti, celebrate |
| `gradient-nebula-3` | `linear-gradient(135deg, #06B6D4, #3B82F6, #8B5CF6)` | AI panel, coach |
| `gradient-cta` | `linear-gradient(90deg, #3B82F6, #8B5CF6)` | Button fills |
| `gradient-border` | `linear-gradient(90deg, #3B82F6, #06B6D4, #EC4899)` | Neon card borders |
| `glow-primary` | `rgba(59,130,246,0.4)` | Primary glow shadow |
| `glow-secondary` | `rgba(139,92,246,0.4)` | Purple glow |
| `glow-cyan` | `rgba(6,182,212,0.3)` | Cyan glow |

### Accent — Cyan & Magenta
| Token | Hex | Role |
|-------|-----|------|
| `color-cyan-400` | `#22D3EE` | Links, active tabs |
| `color-cyan-500` | `#06B6D4` | Progress ring |
| `color-cyan-600` | `#0891B2` | Dark cyan |
| `color-magenta-400` | `#F472B6` | Highlights, alerts |
| `color-magenta-500` | `#EC4899` | Feminine accent |
| `color-magenta-600` | `#DB2777` | Strong pink |

### Semantic
| Token | Hex | Role |
|-------|-----|------|
| `color-success-500` | `#10B981` | Correct, complete, streak |
| `color-success-400` | `#34D399` | Success light |
| `color-warning-500` | `#F59E0B` | Warning, streak low |
| `color-warning-400` | `#FBBF24` | Warning light |
| `color-error-500` | `#EF4444` | Incorrect, error |
| `color-error-400` | `#F87171` | Error light |
| `color-info-500` | `#3B82F6` | Info, AI badge |
| `color-info-400` | `#60A5FA` | Info light |

### Neutral (Dark Theme)
| Token | Hex | Role |
|-------|-----|------|
| `color-surface-0` | `#0F172A` | Darkest canvas |
| `color-surface-50` | `#131C31` | Elevated surface |
| `color-surface-100` | `#1E293B` | Card background |
| `color-surface-200` | `#334155` | Border/divider |
| `color-surface-300` | `#475569` | Muted text |
| `color-surface-400` | `#94A3B8` | Secondary text |
| `color-surface-500` | `#CBD5E1` | Primary text |
| `color-surface-600` | `#E2E8F0` | Emphasis text |
| `color-surface-700` | `#FFFFFFFF` | Pure white text |

### Neutral (Light Theme Inverted)
| Token | Hex | Role |
|-------|-----|------|
| `color-surface-light-0` | `#FFFFFF` | Canvas |
| `color-surface-light-50` | `#F8FAFC` | Subtle surface |
| `color-surface-light-100` | `#F1F5F9` | Card background |
| `color-surface-light-200` | `#E2E8F0` | Muted text |
| `color-surface-light-300` | `#CBD5E1` | Secondary text |
| `color-surface-light-400` | `#94A3B8` | Primary text |
| `color-surface-light-500` | `#475569` | Emphasis text |
| `color-surface-light-600` | `#1E293B` | Darkest text |

---

## Glassmorphism Spec

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.glass-light {
  background: rgba(0, 0, 0, 0.03);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.glass-accent {
  border: 1px solid transparent;
  background: linear-gradient(var(--surface-100), var(--surface-100)) padding-box,
              linear-gradient(135deg, #3B82F6, #8B5CF6, #06B6D4) border-box;
}
```

---

## Typography

### Font Families
| Context | Font | Fallback |
|---------|------|----------|
| English UI | `Plus Jakarta Sans` | `Inter, system-ui, sans-serif` |
| Hindi UI | `Noto Sans Devanagari` | `Noto Sans, sans-serif` |
| Mono (code, logs) | `JetBrains Mono` | `Fira Code, monospace` |
| Display (hero, logo) | `Plus Jakarta Sans` | `Inter Black, sans-serif` |

### Type Scale
| Token | Size | Weight | Line-Height | Letter-Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `display-1` | 48px (3rem) | 800 | 1.1 | -0.02em | Hero h1 |
| `display-2` | 40px (2.5rem) | 700 | 1.15 | -0.02em | Section hero |
| `h1` | 36px (2.25rem) | 700 | 1.2 | -0.015em | Page title |
| `h2` | 30px (1.875rem) | 600 | 1.25 | -0.01em | Section title |
| `h3` | 24px (1.5rem) | 600 | 1.3 | -0.01em | Card title |
| `h4` | 20px (1.25rem) | 500 | 1.35 | 0 | Subsection |
| `h5` | 18px (1.125rem) | 500 | 1.4 | 0 | Label |
| `body-lg` | 18px (1.125rem) | 400 | 1.6 | 0 | Lead paragraph |
| `body` | 16px (1rem) | 400 | 1.6 | 0 | Body text |
| `body-sm` | 14px (0.875rem) | 400 | 1.5 | 0 | Secondary body |
| `caption` | 12px (0.75rem) | 500 | 1.4 | 0.01em | Metadata |
| `overline` | 11px (0.6875rem) | 600 | 1.3 | 0.06em | Labels, tags |
| `button` | 15px (0.9375rem) | 600 | 1 | 0.02em | Buttons |

**Hindi Adaptations**:
- Line-height: +0.1em for all Devanagari text (`1.7` for body, `1.4` for headings)
- Avoid tight tracking — Devanagari conjuncts need breathing room
- Minimum size: 16px for Hindi body (14px risks readability on budget phones)

---

## Spacing System

Base unit: `4px`

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | Zero |
| `space-1` | 4px | Icon gaps, inline spacing |
| `space-2` | 8px | Tight component padding |
| `space-3` | 12px | Small gutters |
| `space-4` | 16px | Default padding, card inner |
| `space-5` | 20px | Medium component gap |
| `space-6` | 24px | Section padding, modal inner |
| `space-8` | 32px | Large section padding |
| `space-10` | 40px | Page horizontal padding |
| `space-12` | 48px | Hero padding |
| `space-16` | 64px | Major section gaps |
| `space-20` | 80px | Landing section spacing |

**Layout Grid**:
| Viewport | Columns | Gutter | Margin | Max-Width |
|----------|---------|--------|--------|-----------|
| Mobile | 4 cols | 16px | 16px | 100% |
| Tablet | 8 cols | 24px | 24px | 100% |
| Desktop | 12 cols | 24px | 32px | 1280px |

---

## Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `radius-none` | 0px | Sharp dividers |
| `radius-sm` | 4px | Small tags, badges |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 12px | Cards, panels |
| `radius-xl` | 16px | Modals, sheets |
| `radius-2xl` | 20px | Hero cards, onboarding |
| `radius-full` | 9999px | Pills, avatars, progress rings |

---

## Shadow System

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `shadow-sm` | `0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Cards |
| `shadow-md` | `0 8px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | Floating |
| `shadow-lg` | `0 16px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)` | Modals |
| `shadow-glow-primary` | `0 0 20px rgba(59,130,246,0.3)` | Primary glow |
| `shadow-glow-secondary` | `0 0 20px rgba(139,92,246,0.3)` | Purple glow |
| `shadow-glow-cyan` | `0 0 16px rgba(6,182,212,0.25)` | Cyan glow |
| `shadow-glow-magenta` | `0 0 16px rgba(236,72,153,0.25)` | Pink glow |
| `shadow-inner-glow` | `inset 0 1px 0 rgba(255,255,255,0.08)` | Top shine on glass |

---

## Blur / Glass Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `blur-sm` | `4px` | Subtle background |
| `blur-md` | `12px` | Card glass |
| `blur-lg` | `20px` | Modal overlay |
| `blur-xl` | `32px` | Hero background |
| `blur-max` | `64px` | Ambient blobs |
| `glass-opacity` | `5%` white on dark | Card bg |
| `glass-border` | `10%` white on dark | Card border |
| `glass-saturate` | `180%` | Color pop behind blur |

---

## Animation Tokens

### Durations
| Token | Value | Usage |
|-------|-------|-------|
| `duration-instant` | 0ms | No animation |
| `duration-fast` | 150ms | Hover feedback, color change |
| `duration-normal` | 300ms | State transitions, slides |
| `duration-slow` | 500ms | Page transitions, reveals |
| `duration-cinematic` | 800ms | Hero animations, rank reveal |
| `duration-loader` | 1200ms | Continuous loaders |

### Easing Curves
| Token | Value | Usage |
|-------|-------|-------|
| `ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Most transitions |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations |
| `ease-spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Bouncy, playful |
| `ease-smooth` | `cubic-bezier(0.45, 0.05, 0.55, 0.95)` | Ambient motion |

### Motion Patterns
| Pattern | Spec |
|---------|------|
| Fade In | `opacity: 0 → 1`, duration-normal, ease-out |
| Slide Up | `translateY(24px) → 0`, opacity 0 → 1, duration-normal, ease-out |
| Scale In | `scale(0.95) → 1`, opacity 0 → 1, duration-fast, ease-spring |
| Stagger | Delay = index × 60ms, max 6 items visible |
| Pulse Glow | `box-shadow` intensity oscillates 0.3 → 1.0, 2s ease-in-out infinite |
| Shimmer | `background-position: -200% → 200%`, 1.5s linear infinite |
| Ring Draw | `stroke-dashoffset: full → 0`, duration-cinematic, ease-out |
| Number Count | Count from 0 → target over 1s, ease-out |
| Bounce | `scale(1.15) → 1.0` with spring easing on success |

---

## Iconography

### Style
- Stroke-based, outlined icons
- Stroke width: `1.5px`
- Corner radius: `2px` (slightly rounded)
- No filled icons except functional states (active nav, selected toggles)

### Sizes
| Token | Value | Usage |
|-------|-------|-------|
| `icon-xs` | 12px | Inline text icons |
| `icon-sm` | 16px | Buttons, badges |
| `icon-md` | 20px | Navigation, inputs |
| `icon-lg` | 24px | Feature cards, standalone |
| `icon-xl` | 32px | Empty states |
| `icon-hero` | 48px | Landing features |

### Icon Library
- **Primary**: `lucide-react` (consistent stroke weight)
- **Brand/Logo**: Custom SVG (PrepX symbol)
- **Flags**: Custom EN/HI toggle icons
- **Animated**: Custom SVG for loader, typing indicator, progress rings

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `z-base` | 0 | Default |
| `z-above` | 10 | Elevated cards |
| `z-header` | 100 | Sticky nav |
| `z-modal` | 500 | Modals, dialogs |
| `z-toast` | 1000 | Toast stack |
| `z-overlay` | 2000 | Backdrop blur |
| `z-dropdown` | 3000 | Select menus |
| `z-floating` | 4000 | AI Coach button |
| `z-max` | 9999 | Debugging |

---

## Theme Configuration

### CSS Variables (System)
```css
:root[data-theme="dark"] {
  --surface-0: #0F172A;
  --surface-50: #131C31;
  --surface-100: #1E293B;
  --surface-200: #334155;
  --surface-300: #475569;
  --surface-400: #94A3B8;
  --surface-500: #CBD5E1;
  --surface-600: #E2E8F0;
  --text-primary: #E2E8F0;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.10);
}

:root[data-theme="light"] {
  --surface-0: #FFFFFF;
  --surface-50: #F8FAFC;
  --surface-100: #F1F5F9;
  --surface-200: #E2E8F0;
  --surface-300: #CBD5E1;
  --surface-400: #94A3B8;
  --surface-500: #475569;
  --surface-600: #1E293B;
  --text-primary: #1E293B;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --glass-bg: rgba(0, 0, 0, 0.03);
  --glass-border: rgba(0, 0, 0, 0.06);
}
```

### Transition
```css
.theme-transition {
  transition: background-color 0.3s ease, color 0.3s ease,
              border-color 0.3s ease, box-shadow 0.3s ease;
}
```
All themed elements use `.theme-transition` for smooth crossfade between light/dark.

---

*Document: ux-design-system.md | Phase: Planning | BMAD Designer: Sally*
