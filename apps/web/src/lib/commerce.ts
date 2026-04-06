export const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatInr(value: number): string {
  return inrFormatter.format(Number.isFinite(value) ? value : 0);
}

export function calculateDiscountedPrice(price: number, discount?: number): number {
  if (!discount) {
    return price;
  }

  return Math.max(price - (price * discount) / 100, 0);
}

export function getTodayDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isManufactureDateInvalid(manufactureDate?: string, expiryDate?: string): boolean {
  if (!manufactureDate || !expiryDate) {
    return false;
  }

  return manufactureDate >= expiryDate;
}

export function isProductExpired(expiryDate?: string, now = new Date()): boolean {
  if (!expiryDate) {
    return false;
  }

  return expiryDate <= getTodayDateString(now);
}
