export function getLogoUrl(domain: string | null): string | null {
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}
