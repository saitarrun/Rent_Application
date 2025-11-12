import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
export function downloadLeasePdf(lease) {
    const doc = new jsPDF();
    doc.text(`Lease ${lease.id}`, 14, 20);
    doc.text(`Property: ${lease.property?.name || 'N/A'}`, 14, 30);
    doc.text(`Tenant: ${lease.tenant?.email || 'Tenant'}`, 14, 40);
    autoTable(doc, {
        head: [['Label', 'Value']],
        body: [
            ['Monthly rent (ETH)', lease.monthlyRentEth],
            ['Security deposit (ETH)', lease.securityDepositEth],
            ['Start', lease.startISO],
            ['End', lease.endISO]
        ]
    });
    doc.save(`lease-${lease.id}.pdf`);
}
export function downloadReceiptPdf(receipt) {
    const doc = new jsPDF();
    doc.text('Payment Receipt', 14, 20);
    autoTable(doc, {
        head: [['Field', 'Value']],
        body: [
            ['Lease', receipt.leaseId],
            ['Invoice', receipt.invoiceId],
            ['Paid ETH', receipt.paidEth],
            ['Paid at', receipt.paidAtISO],
            ['Tx hash', receipt.txHash]
        ]
    });
    doc.save(`receipt-${receipt.id}.pdf`);
}
