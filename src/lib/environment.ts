export function appOrigin(env: Record<string, string | undefined> = process.env): string | undefined {
  const value = env.APP_URL || (env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : undefined);
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    return url.origin;
  } catch { return undefined; }
}
