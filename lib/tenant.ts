export function getTenantFromHost(host: string | null): { isDefault: boolean; slug: string | null; name?: string | null } {
  if (!host) return { isDefault: true, slug: null };
  const parts = host.split('.');
  if (parts.length <= 2) return { isDefault: true, slug: null };
  const sub = parts[0];
  if (sub === 'www' || sub === 'api') return { isDefault: true, slug: null };
  return { isDefault: false, slug: sub };
}
