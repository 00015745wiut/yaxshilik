import { formatCurrency } from '../utils/format';

function formatReceiptDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Opens a new window containing a print-ready receipt and triggers window.print().
 * No DOM side-effects on the main page.
 */
export function printReceipt(donation, donorName) {
  const date     = formatReceiptDate(donation.created_at);
  const amount   = formatCurrency(donation.amount);
  const message  = donation.message || 'N/A';
  const caseTitle = donation.case_title || '—';
  const ref       = donation.transaction_ref;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Donation Receipt — Yaxshilik.uz</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 48px; max-width: 600px; margin: auto; }
    .header { text-align: center; margin-bottom: 28px; }
    .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p  { font-size: 13px; color: #555; margin-top: 4px; }
    hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    td { padding: 9px 0; vertical-align: top; font-size: 14px; }
    td:first-child { color: #555; width: 180px; font-weight: 600; }
    td:last-child  { color: #111; }
    .amount td:last-child { font-size: 20px; font-weight: 700; color: #1d4ed8; }
    .mono { font-family: 'Courier New', monospace; font-size: 13px; }
    .footer { text-align: center; margin-top: 32px; font-size: 13px; color: #777; }
    @media print {
      body { padding: 24px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Yaxshilik.uz</h1>
    <p>Donation Receipt</p>
  </div>
  <hr />
  <table>
    <tr>
      <td>Transaction Ref</td>
      <td class="mono">${ref}</td>
    </tr>
    <tr>
      <td>Date</td>
      <td>${date}</td>
    </tr>
    <tr>
      <td>Donor</td>
      <td>${donorName}</td>
    </tr>
    <tr>
      <td>Case</td>
      <td>${caseTitle}</td>
    </tr>
    <tr class="amount">
      <td>Amount</td>
      <td>${amount}</td>
    </tr>
    <tr>
      <td>Message</td>
      <td><em>${message}</em></td>
    </tr>
  </table>
  <hr />
  <div class="footer">Thank you for your generosity! — Yaxshilik.uz</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=700,height=600');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
