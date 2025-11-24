import jsPDF from 'jspdf';

const toReadableDate = (value?: string) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

const addParagraph = (doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 14) => {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

export function downloadLeasePdf(lease: any) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 60;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let cursorY = margin;

  const propertyName = lease.property?.name || lease.listing?.title || 'Property';
  const propertyAddress =
    lease.property?.address ||
    [lease.listing?.address1, lease.listing?.city, lease.listing?.state, lease.listing?.postalCode]
      .filter(Boolean)
      .join(', ');
  const tenantName = lease.tenant?.legalName || lease.tenant?.email || 'Tenant';

  doc.setFontSize(26);
  doc.text('Rental Suite Lease Agreement', margin, cursorY);
  cursorY += 28;
  doc.setFontSize(12);
  doc.setTextColor(110);
  doc.text('Owner & tenant control center • Rentals managed with blockchain-backed precision.', margin, cursorY);
  doc.setTextColor(0);
  cursorY += 30;

  const infoBoxHeight = 120;
  doc.setFillColor(246, 249, 255);
  doc.roundedRect(margin, cursorY, width, infoBoxHeight, 10, 10, 'F');
  doc.setFontSize(12);
  doc.text('Property details', margin + 16, cursorY + 24);
  doc.setFontSize(11);
  addParagraph(doc, `${propertyName}`, margin + 16, cursorY + 40, width / 2 - 20);
  if (propertyAddress) {
    addParagraph(doc, propertyAddress, margin + 16, cursorY + 56, width / 2 - 20);
  }
  doc.setFontSize(12);
  doc.text('Tenant details', margin + width / 2 + 8, cursorY + 24);
  doc.setFontSize(11);
  addParagraph(doc, tenantName, margin + width / 2 + 8, cursorY + 40, width / 2 - 20);
  if (lease.tenant?.email) {
    addParagraph(doc, lease.tenant.email, margin + width / 2 + 8, cursorY + 56, width / 2 - 20);
  }
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Lease ID: ${lease.id}`, margin + width - 140, cursorY + infoBoxHeight - 16);
  doc.setTextColor(0);
  cursorY += infoBoxHeight + 30;

  const detailCards = [
    { label: 'Monthly rent (ETH)', value: lease.monthlyRentEth },
    { label: 'Security deposit (ETH)', value: lease.securityDepositEth },
    { label: 'Start date', value: toReadableDate(lease.startISO) },
    { label: 'End date', value: toReadableDate(lease.endISO) }
  ];
  const cardWidth = (width - 20) / 2;
  detailCards.forEach((card, idx) => {
    const x = margin + (idx % 2) * (cardWidth + 20);
    const y = cursorY + Math.floor(idx / 2) * 80;
    doc.setDrawColor(230);
    doc.roundedRect(x, y, cardWidth, 64, 8, 8);
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text(card.label, x + 14, y + 24);
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(String(card.value ?? '—'), x + 14, y + 46);
  });
  cursorY += Math.ceil(detailCards.length / 2) * 80 + 20;

  doc.setFontSize(13);
  doc.text('Terms & conditions', margin, cursorY);
  doc.setFontSize(11);
  cursorY = addParagraph(
    doc,
    'By signing this agreement, the tenant acknowledges responsibility for paying rent in ETH, maintaining the property, and observing the community guidelines. The owner agrees to keep the home in safe, habitable condition and to hold the security deposit until the contract is terminated.',
    margin,
    cursorY + 16,
    width
  );

  doc.setFontSize(13);
  cursorY += 18;
  doc.text('Rules & regulations', margin, cursorY);
  doc.setFontSize(11);
  const rules = [
    'Rent must be paid before the due date each month; late payments may incur penalties outlined in the owner policy.',
    'Deposits are held in escrow and may be applied to unpaid balances or damages beyond normal wear and tear.',
    'Alterations or subletting require written consent from the owner.',
    'Maintenance issues must be reported via the Rentals Suite portal; emergencies should be escalated immediately.',
    'Termination requires written notice and fulfillment of all outstanding balances.'
  ];
  rules.forEach((rule, index) => {
    cursorY = addParagraph(doc, `${index + 1}. ${rule}`, margin, cursorY + 12, width);
  });

  cursorY += 26;
  doc.setFontSize(12);
  doc.text('Signatures', margin, cursorY);
  cursorY += 24;

  const lineLength = 200;
  doc.line(margin, cursorY, margin + lineLength, cursorY);
  doc.line(margin + lineLength + 80, cursorY, margin + lineLength * 2 + 80, cursorY);
  doc.setFontSize(10);
  const ownerSigned = lease.ownerSignedAt ? toReadableDate(lease.ownerSignedAt) : 'Pending';
  const tenantSigned = lease.tenantSignedAt ? toReadableDate(lease.tenantSignedAt) : 'Pending';
  doc.text(`Owner signature — ${ownerSigned}`, margin, cursorY + 14);
  doc.text(`Tenant signature — ${tenantSigned}`, margin + lineLength + 80, cursorY + 14);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    'Generated via Rental Suite • This summary complements the executed legal agreement.',
    margin,
    doc.internal.pageSize.getHeight() - 40
  );

  doc.save(`lease-${lease.id}.pdf`);
}

export function downloadReceiptPdf(receipt: any) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 60;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let cursorY = margin;

  doc.setFontSize(22);
  doc.text('Payment Receipt', margin, cursorY);
  cursorY += 28;
  doc.setFontSize(11);
  cursorY = addParagraph(doc, `Lease ID: ${receipt.leaseId}`, margin, cursorY, width);
  cursorY = addParagraph(doc, `Invoice: ${receipt.invoiceId}`, margin, cursorY + 10, width);
  cursorY = addParagraph(doc, `Paid ETH: ${receipt.paidEth}`, margin, cursorY + 10, width);
  cursorY = addParagraph(doc, `Paid at: ${toReadableDate(receipt.paidAtISO)}`, margin, cursorY + 10, width);
  cursorY = addParagraph(doc, `Transaction hash: ${receipt.txHash}`, margin, cursorY + 10, width);

  doc.save(`receipt-${receipt.id}.pdf`);
}
