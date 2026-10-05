// Split a ranked list into pages while keeping each page diverse: at most
// `perPartner` entries with the same trade partner per page. Entries skipped
// for diversity are not lost; they lead the following pages in rank order.

export interface Paged<T> {
  item: T;
  /** 1-based page number. */
  page: number;
}

export function paginateByPartner<T>(
  ranked: T[],
  partnerOf: (item: T) => string,
  pageSize: number,
  perPartner: number,
  maxPages: number
): { entries: Paged<T>[]; pageCount: number } {
  const entries: Paged<T>[] = [];
  let remaining = ranked;
  let page = 0;
  while (remaining.length && page < maxPages) {
    page++;
    const counts = new Map<string, number>();
    const deferred: T[] = [];
    let taken = 0;
    for (const item of remaining) {
      const id = partnerOf(item);
      const n = counts.get(id) ?? 0;
      if (taken >= pageSize || n >= perPartner) {
        deferred.push(item);
        continue;
      }
      counts.set(id, n + 1);
      entries.push({ item, page });
      taken++;
    }
    if (taken === 0) break;
    remaining = deferred;
  }
  return { entries, pageCount: page === 0 ? 0 : entries.length ? entries[entries.length - 1].page : 0 };
}
