const SUPERUSER_EMAILS = new Set<string>(["zvictory2001@gmail.com"]);

export function isSuperuser(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPERUSER_EMAILS.has(email.toLowerCase());
}
