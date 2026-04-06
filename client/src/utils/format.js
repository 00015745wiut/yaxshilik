/** "1 234 567 UZS" */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('uz-UZ').replace(/,/g, ' ') + ' UZS';
}

/** Space-separated thousands, no suffix */
export function formatNumber(n) {
  return (Number(n) || 0).toLocaleString('uz-UZ').replace(/,/g, ' ');
}

/** "January 15, 2026" */
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** "January 15, 2026 at 02:30 PM" */
export function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** "2 hours ago", "3 days ago", etc. */
export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m} minute${m !== 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hour${h !== 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d} day${d !== 1 ? 's' : ''} ago`;
  const mo = Math.floor(d / 30);
  return `${mo} month${mo !== 1 ? 's' : ''} ago`;
}
