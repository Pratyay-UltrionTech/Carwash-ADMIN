import type { AddonItem, BranchData, ServiceItem, VehicleServiceBlock } from './catalogShapeTypes';
import { findCatalogServiceById } from './branchStore';

function addonListForBranch(data: BranchData): AddonItem[] {
  if (data.branchAddons?.length) return data.branchAddons.filter((a) => a.active !== false);
  return Array.from(
    new Map(data.vehicleServices.flatMap((v) => v.addons ?? []).map((a) => [a.id, a])).values()
  ).filter((a) => a.active !== false);
}

export type CheckoutDiscountType = 'flat' | 'percent';

export type CheckoutDiscount = {
  type: CheckoutDiscountType;
  /** Flat: dollars. Percent: 0–100. */
  value: number;
};

export type CheckoutPricing = {
  servicePrice: number;
  addonsTotal: number;
  /** Service + add-ons in dollars (before discount). */
  subtotal: number;
  /** Discount applied to service + add-ons, in cents (never exceeds subtotal). */
  discountCents: number;
  /** Service + add-ons after discount, in cents (excludes tip). */
  chargedCents: number;
  tax: number;
  /** Charged + tip, in cents. */
  totalCents: number;
};

function discountCentsFromSubtotal(subtotalCents: number, discount?: CheckoutDiscount | null): number {
  const pkg = Math.max(0, Math.floor(subtotalCents));
  if (!discount || !Number.isFinite(discount.value) || discount.value <= 0 || pkg <= 0) return 0;
  if (discount.type === 'percent') {
    const pct = Math.min(100, Math.max(0, discount.value));
    return Math.min(pkg, Math.round((pkg * pct) / 100));
  }
  const flatCents = Math.round(discount.value * 100);
  return Math.min(pkg, Math.max(0, flatCents));
}

/** Catalog prices are GST-inclusive; total is service + add-ons − discount + tip (cents). */
export function branchCheckoutTotalCents(
  data: BranchData,
  serviceId: string | null | undefined,
  addonIds: string[],
  tipCents: number,
  discount?: CheckoutDiscount | null
): CheckoutPricing {
  const svc = serviceId ? findCatalogServiceById(data, serviceId) : undefined;
  const addons = addonListForBranch(data);
  const servicePrice = svc ? Number(svc.price) || 0 : 0;
  let addonsTotal = 0;
  for (const id of addonIds) {
    const a = addons.find((x) => x.id === id);
    if (a) addonsTotal += Number(a.price) || 0;
  }
  const sub = servicePrice + addonsTotal;
  const subtotalCents = Math.round(sub * 100);
  const discountCents = discountCentsFromSubtotal(subtotalCents, discount);
  const chargedCents = Math.max(0, subtotalCents - discountCents);
  const totalCents = chargedCents + Math.max(0, Math.floor(tipCents || 0));
  return {
    servicePrice,
    addonsTotal,
    subtotal: sub,
    discountCents,
    chargedCents,
    tax: 0,
    totalCents,
  };
}

export function mobileCheckoutTotalCents(
  catalog: VehicleServiceBlock[],
  mobileAddons: AddonItem[],
  serviceId: string | null | undefined,
  addonIds: string[],
  tipCents: number
): { servicePrice: number; addonsTotal: number; subtotal: number; tax: number; totalCents: number } {
  let svc: ServiceItem | undefined;
  for (const vb of catalog) {
    svc = vb.services.find((s) => s.id === serviceId);
    if (svc) break;
  }
  const globalAddons = mobileAddons.filter((a) => a.active !== false);
  const legacyAddons = catalog.flatMap((vb) => vb.addons ?? []).filter((a) => a.active !== false);
  const addonSource = globalAddons.length ? globalAddons : legacyAddons;
  const servicePrice = svc ? Number(svc.price) || 0 : 0;
  let addonsTotal = 0;
  for (const id of addonIds) {
    const a = addonSource.find((x) => x.id === id);
    if (a) addonsTotal += Number(a.price) || 0;
  }
  const sub = servicePrice + addonsTotal;
  const totalCents = Math.round(sub * 100) + Math.max(0, Math.floor(tipCents || 0));
  return { servicePrice, addonsTotal, subtotal: sub, tax: 0, totalCents };
}
