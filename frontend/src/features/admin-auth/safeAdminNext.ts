/** Only admin paths are accepted as `next`, so the page cannot redirect elsewhere. */
export function safeAdminNext(next: string | null): string {
  if (!next || !next.startsWith('/admin') || next.startsWith('/admin/sign-in')) return '/admin'
  return next
}
