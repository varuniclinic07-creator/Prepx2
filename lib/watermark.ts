export function applyWatermark(htmlContent: string, tier: 'free' | 'premium' | 'premium_plus'): string {
  if (tier === 'premium_plus') return htmlContent;
  const watermark = tier === 'free'
    ? '<div style="position:fixed;bottom:10px;right:10px;opacity:0.3;font-size:12px;pointer-events:none;z-index:9999;">PREPX WATERMARK — FREE TIER</div>'
    : '<div style="position:fixed;bottom:10px;right:10px;opacity:0.2;font-size:10px;pointer-events:none;z-index:9999;">PREPX</div>';
  return htmlContent + watermark;
}
