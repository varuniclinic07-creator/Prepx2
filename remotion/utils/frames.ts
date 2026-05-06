// Sprint 9-C — Frame/time helpers. Compositions are frame-driven; semantic
// timing comes from timeline.json which is in seconds. These two functions
// are the only conversion path between the two systems.

export function secondsToFrames(sec: number, fps: number): number {
  return Math.round(sec * fps);
}

export function framesToSeconds(frame: number, fps: number): number {
  return frame / fps;
}

// Pick the active scene at a given absolute time (seconds), or undefined.
export function activeSceneAt<T extends { start: number; end: number }>(
  scenes: T[],
  t: number
): T | undefined {
  // Prefer last scene whose [start,end) covers t. Use end-exclusive so the
  // boundary frame doesn't briefly show two scenes.
  for (let i = scenes.length - 1; i >= 0; i--) {
    const s = scenes[i];
    if (t >= s.start && t < s.end) return s;
  }
  // After the last scene's end → return last scene (clamp).
  return scenes[scenes.length - 1];
}
