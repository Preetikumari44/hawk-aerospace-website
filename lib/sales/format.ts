export function formatINR(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}
