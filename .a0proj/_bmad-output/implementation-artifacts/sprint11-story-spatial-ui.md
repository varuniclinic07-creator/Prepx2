---
story: S11F4
sprint: 11
name: Spatial UI
priority: P2
parent: sprint11-plan.md
---

# Story S11F4: Spatial UI (Vision Pro / iPad Spatial)

## Scope
Experimental spatial layout for tablets and future spatial computing. Content floats in 3D space with side-by-side notes.

## In Scope
- [x] `/app/spatial/page.tsx` — experimental desktop/iPad layout
- [x] Three.js / React Three Fiber scene with floating topic cards
- [x] Side-by-side notes panel in 3D space
- [x] AI coach avatar placeholder (3D sphere or image)
- [x] Fallback to standard 2D layout for phones

## Out of Scope
- True Vision Pro hand tracking (no hardware available)
- WebXR immersive mode (no headset)
- Full avatar 3D model (placeholder only)

## Tasks
- [x] **S11F4.1** Install `@react-three/fiber` and `three`:
  - `npm install @react-three/fiber three @types/three`
- [x] **S11F4.2** Create `app/spatial/page.tsx`:
  - Canvas with `<Canvas>` from `@react-three/fiber`
  - Topic content cards floating in Z-space (using `<mesh>` planes with texture)
  - Notes panel on right side (HTML overlay via `@react-three/drei` Html component)
  - Navigation: flip between cards with arrow keys or swipe
- [x] **S11F4.3** Floating topic viewer:
  - When user clicks topic → 3D card expands in center
  - Text content rendered on a floating plane with glassmorphic shader (custom shader for transparency + blur simulation)
  - EN/HI toggle in 3D space
- [x] **S11F4.4** AI coach avatar:
  - Simple 3D sphere or `Drei` Image component with AI coach icon
  - Positioned in top-right corner of 3D scene
  - Placeholder for future GLB avatar model
- [x] **S11F4.5** Fallback logic:
  - `useEffect` checks `navigator.userAgent` for mobile → redirects to standard `/topic/[id]`
  - Desktop/tablet → show spatial layout
- [x] **S11F4.6** Add `/spatial` nav link (desktop only, hidden on mobile)

## Acceptance Criteria
- [x] Desktop user sees 3D spatial layout at `/spatial`
- [x] Mobile user redirected to standard topic viewer
- [x] Topic cards float in 3D space, navigable
- [x] Notes panel visible alongside content
- [x] tsc clean (install @types/three if needed)
