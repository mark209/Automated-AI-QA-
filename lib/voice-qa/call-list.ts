export const CALLS_PAGE_SIZE = 5;

export function getPageInfo(total: number, requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(Math.max(0, total) / CALLS_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(requestedPage) || 1), pageCount);
  const from = (page - 1) * CALLS_PAGE_SIZE;
  return { page, pageCount, from, to: Math.min(from + CALLS_PAGE_SIZE, Math.max(0, total)), hasPrevious: page > 1, hasNext: page < pageCount };
}

export function canDeleteRecording(role: string | null | undefined) {
  return role === "ADMIN" || role === "QA_SUPERVISOR";
}
