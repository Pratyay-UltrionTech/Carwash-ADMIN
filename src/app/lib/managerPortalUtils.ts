export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function currentHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Login page used when a manager needs a customer to create an account. */
export function getUserPortalLoginUrl(): string {
  const configured = String(import.meta.env.VITE_USER_PORTAL_LOGIN_URL ?? '').trim();
  return configured || (
    import.meta.env.DEV
      ? 'http://localhost:5173/#/login'
      : 'https://ambitious-tree-07069870f.7.azurestaticapps.net/#/login'
  );
}

/**
 * Branch + mobile manager booking tables: allow Edit only for jobs that are still
 * on today or a future calendar day and not finished (not completed / cancelled).
 */
/** Work has started — managers cannot reschedule or change washer/driver. */
export function isBookingScheduleAndStaffLocked(status: string): boolean {
  return status === 'in_progress' || status === 'checked_in';
}

export function canManagerPortalEditBookingJob(job: { slotDate: string; status: string }, todayIso: string): boolean {
  if (job.slotDate < todayIso) return false;
  return job.status !== 'completed' && job.status !== 'cancelled';
}

/** Map catalog service id → whether that service counts toward loyalty eligibility. */
export function loyaltyEligibleByServiceIdFromBlocks(
  blocks: { services?: { id: string; eligibleForLoyaltyPoints?: boolean }[] }[],
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const block of blocks) {
    for (const svc of block.services ?? []) {
      if (svc.id) map.set(svc.id, svc.eligibleForLoyaltyPoints === true);
    }
  }
  return map;
}

/**
 * A booking counts toward free-wash eligibility when it belongs to a registered
 * customer, is not cancelled, and the primary service is loyalty-eligible.
 */
export function bookingCountsTowardEligibility(
  job: { serviceId?: string | null; customerId?: string | null; status: string },
  loyaltyEligibleByServiceId: ReadonlyMap<string, boolean>,
): boolean {
  if (!job.customerId) return false;
  if (job.status === 'cancelled' || job.status === 'rejected' || job.status === 'failed') return false;
  const sid = job.serviceId;
  if (!sid) return false;
  return loyaltyEligibleByServiceId.get(sid) === true;
}

export function bookingScheduleOrStaffChanged(
  prev: {
    slotDate: string;
    startTime: string;
    endTime: string;
    bayNumber?: number | null;
    assignedWasherId?: string | null;
    assignedStaffId?: string | null;
  },
  next: {
    slotDate: string;
    startTime: string;
    endTime: string;
    bayNumber?: number | null;
    assignedWasherId?: string | null;
    assignedStaffId?: string | null;
  }
): boolean {
  return (
    prev.slotDate !== next.slotDate ||
    prev.startTime !== next.startTime ||
    prev.endTime !== next.endTime ||
    (prev.bayNumber ?? null) !== (next.bayNumber ?? null) ||
    (prev.assignedWasherId ?? null) !== (next.assignedWasherId ?? null) ||
    (prev.assignedStaffId ?? null) !== (next.assignedStaffId ?? null)
  );
}

export function dayOfWeekFromISODate(dateStr: string): number {
  const parts = dateStr.split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date().getDay();
  const [y, mo, da] = parts;
  return new Date(y!, mo! - 1, da!).getDay();
}

/** Local calendar day as `yyyy-MM-dd` from a Date (time ignored). */
export function localDateToIsoString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Every local calendar day from start through end inclusive as `yyyy-MM-dd`.
 * If start is after end, bounds are swapped.
 */
export function eachIsoDateInInclusiveRange(startISO: string, endISO: string): string[] {
  const lo = startISO <= endISO ? startISO : endISO;
  const hi = startISO <= endISO ? endISO : startISO;
  const pa = lo.split('-').map((x) => parseInt(x, 10));
  const pb = hi.split('-').map((x) => parseInt(x, 10));
  if (pa.length !== 3 || pb.length !== 3 || pa.some((n) => Number.isNaN(n)) || pb.some((n) => Number.isNaN(n))) {
    return [];
  }
  const start = new Date(pa[0]!, pa[1]! - 1, pa[2]!);
  const end = new Date(pb[0]!, pb[1]! - 1, pb[2]!);
  if (start > end) return [];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(localDateToIsoString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
