# PrepX Logo & Brand Identity

## Brand Essence
> **"The intersection of aspiration and intelligence."**

PrepX is not just test prep. It is an AI-native learning operating system that transforms the journey from overwhelmed aspirant to confident civil servant. The brand must feel premium, intelligent, and deeply human.

---

## Logo Concept

### Core Idea: The BMAD Diamond
The PrepX symbol is a stylized diamond / "X" formed by four interconnected nodes — one for each BMAD pillar:
- **Top**: BLUEPRINT (goal, clarity, direction)
- **Right**: METHOD (structure, process, discipline)
- **Bottom**: ACTION (execution, energy, movement)
- **Left**: DASHBOARD (insight, reflection, progress)

The four nodes connect to form a central diamond — the aspirant's journey converging at their personal center.

### Symbol Evolution
**Literal**: A diamond/X with 4 nodes
**Abstracted**: A futuristic gem or compass-like mark
**Feel**: Tech-forward but trustworthy; not cold, but warm-intelligent

### Symbol Versions

#### Full Symbol (Primary)
```
          ● (Blueprint)
         / \
        /   \
 (Method)●     ●(Action)
        \   /
         \ /
          ● (Dashboard)
          |
         [X shape formed]
```
- Node shape: Rounded octagons or circles
- Connections: Tapered lines with data-flow particles
- Center: Subtle "X" formed by crossing lines
- Glow: Soft neon aura in gradient

#### Icon Only (App Icon, 32×32)
- Simplified to 4 dots + X lines
- Must be readable at 32×32 and 16×16 (favicon)
- Solid fill with gradient for app icon; monochrome for system tray

#### Monochrome
- Single stroke version for print, watermark, single-color contexts
- Line weight: `2px` for full, `1.5px` for icon

---

## Color Usage in Logo

### Gradient Specification (Full Color)
```css
.logo-gradient {
  background: linear-gradient(
    135deg,
    #3B82F6 0%,    /* Blue (Blueprint) */
    #8B5CF6 35%,   /* Purple (Method) */
    #EC4899 65%,   /* Magenta (Action) */
    #06B6D4 100%   /* Cyan (Dashboard) */
  );
}
```

### Dark Mode Logo
- Symbol: Full gradient on dark `color-surface-0`
- Wordmark: `color-surface-600` (off-white) or gradient text

### Light Mode Logo
- Symbol: Full gradient on white
- Wordmark: `color-surface-light-600` (near-black)

### Monochrome
- Dark context: White logo, `opacity 90%`
- Light context: Black logo, `opacity 90%`

---

## Wordmark

### Typography
- **Font**: `Plus Jakarta Sans` (same as UI)
- **Weight**: 800 (ExtraBold)
- **Tracking**: `-0.02em` (tight, confident)
- **Case**: Sentence case ("PrepX" — not "PREPX" or "prepx")

### Construction
- Prep: Regular weight emphasis
- X: Bold weight, slightly larger, forms the visual anchor
- The "X" aligns with the symbol's diamond center
- Kerning: Tighter between "Pre" and "pX" for logographic feel

### Minimum Size
- Full logo: `120px` width minimum
- Wordmark only: `80px` width minimum
- Icon only: `24px` minimum (32px recommended for touch)

---

## Logo Variants

| Variant | Usage | Color |
|---------|-------|-------|
| Full (symbol + wordmark) | Website header, marketing, presentation | Gradient symbol + dark/light text |
| Horizontal | Navbar, app bar | Same as full |
| Symbol only | App icon, favicon, avatar | Gradient or monochrome |
| Wordmark only | Footer, watermark, subtle branding | Solid color |
| White | Dark backgrounds | White monochrome |
| Black | Light backgrounds / print | Black monochrome |
| Reversed | Over photos / videos | White with subtle drop shadow |

---

## Construction Grid & Safe Zones

### Grid
- Base unit: 8px
- Symbol: Fits in `40×40` unit square
- Clear space: Minimum `8px` (1 unit) on all sides
- Never distort, rotate, or add effects (drop shadow ok only for reversed variant)

### Safe Zone
- Minimum empty space around logo = height of the "X" ascender
- Do not place text, icons, or busy backgrounds within safe zone

---

## App Icon

### iOS / Android (1024×1024)
- Background: `color-surface-0` dark or `color-surface-light-0`
- Symbol centered, `60%` of canvas
- Rounded corners: Apple-style `22.5%` radius or Android adaptive
- Adaptive icon: Foreground = symbol, Background = solid color layer

### Adaptive Icon (Android)
- Foreground: PrepX symbol, gradient
- Background: Solid `#0F172A` (dark) or `#FFFFFF` (light)
- Supports parallax and scale effects

---

## Brand Voice

### Personality Attributes
| Trait | Expression |
|-------|------------|
| **Motivational** | "You are 12% ahead of plan. Keep this momentum." |
| **Intelligent** | "Your Polity accuracy improved 8% this week." |
| **Empathetic** | "UPSC preparation is a marathon. We are with you." |
| **Direct** | "Focus on Geography today. It is your biggest gap." |
| **Aspirational** | "Every 1% improvement moves you 100 ranks." |

### Tone Patterns
- **Never**: Generic, robotic, pushy, fear-mongering
- **Always**: Specific, contextual, encouraging, data-backed
- **Mentor, not master**: Suggests, nudges, celebrates — never scolds

---

## Messaging Examples

### Taglines
| Context | Copy |
|---------|------|
| Hero | "Clear UPSC with your AI Mentor" |
| Sub-hero | "Personalized study plans. Real-time feedback. AI-powered mock interviews." |
| Short | "Your AI IAS Mentor" |
| Social | "50,000+ aspirants. One AI. Your rank." |
| App store | "AI-native learning OS for UPSC CSE. Personalized. Bilingual. Powerful." |

### CTAs
| Context | Copy |
|---------|------|
| Landing primary | "Start Free — No Credit Card" |
| Landing secondary | "See how it works" |
| Onboarding | "Build my plan" |
| Quiz | "Start Quiz" / "Next Question" |
| Payment | "Upgrade to Lieutenant" |
| Streak | "Keep the streak alive!" |
| Nudge | "Your Polity revision is overdue. 10 min?" |

### Error Messages
| Scenario | Copy |
|----------|------|
| Network error | "Connection lost. Your progress is saved. We will retry." |
| Quiz submit failed | "Oops. Could not submit. Tap to retry." |
| AI unavailable | "Hermes is taking a breath. Please try in a moment." |
| Payment failed | "Payment did not go through. Check your details or try again." |
| Login error | "Something went wrong. Try again or contact support." |

### Onboarding Copy
| Screen | Copy |
|--------|------|
| Welcome | "Welcome to PrepX. We are going to build your personalized UPSC journey together." |
| Goal | "What is your dream posting?" |
| Level | "How confident are you in these subjects? Be honest — this helps us help you." |
| Schedule | "When do you study best? We will work with your rhythm." |
| Roadmap | "Perfect. Here is your path to UPSC CSE." |

### AI Coach Messages
| Context | Copy |
|---------|------|
| Daily greeting | "Good morning, Aarav. Ready to conquer Polity today?" |
| Weak area | "Your Geography accuracy is 45%. I have picked today's revision to help." |
| Milestone | "7-day streak! You are building something powerful." |
| Pre-exam | "You have prepared 400+ hours. Trust the process. Trust yourself." |
| Post-quiz | "80% accuracy. Your best score yet. Because you revised this topic yesterday." |

---

## Voice Principles for Hindi

When translating brand voice to Hindi:
- Use respectful but not overly formal (`आप`, not `तुम`)
- Keep motivational tone aspirational, not patronizing
- Avoid literal translation of idioms — use UPSC aspirant culture references
- Example: "Keep the streak alive!" → "स्ट्रीक जारी रखें! आप बहुत आगे हैं।"
- Example: "You are on track" → "आप सही रास्ते पर हैं।"

---

*Document: ux-logo-branding.md | Phase: Planning | BMAD Designer: Sally*
