/**
 * Escapes characters that break PostgREST `ilike` patterns or `.or()` filter lists.
 * Commas separate OR operands in PostgREST; % and _ are LIKE wildcards.
 */
export function sanitizeForPostgrestIlikeOr(term: string): string {
  return term
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, " ");
}
