export function getTenantFromHost(host?: string | null): { slug: string | null; isDefault: boolean } {
  if (!host) return { slug: null, isDefault: true };
  const parts = host.split('.');
  // Support: drishti.prepx.ai → drishti, OR slug via custom domain stub
  if (parts.length >= 3) {
    const slug = parts[0];
    if (slug && slug !== 'www' && slug !== 'api') return { slug, isDefault: false };
  }
  return { slug: null, isDefault: true };
}
