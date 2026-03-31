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
