export function formatPrice(amount) {
  if (typeof amount !== 'number') {
    // Return a default formatted value if the input is not a number
    return '₦0.00';
  }

  // Use Intl.NumberFormat for robust, locale-aware number formatting.
  // This will add commas as thousand separators.
  return `₦${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}