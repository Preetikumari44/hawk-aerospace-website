import { Injectable } from '@nestjs/common';

import type {
  FirestoreInvoiceDocument,
  FirestorePaymentDocument,
} from '../../../database/firestore/contracts';

@Injectable()
export class InvoiceService {
  generateInvoice(payment: FirestorePaymentDocument): FirestoreInvoiceDocument {
    const now = new Date().toISOString();
    return {
      id: `inv_${payment.id}`,
      invoiceId: `HAWK-${payment.id}`,
      bookingId: payment.bookingId,
      customerUid: payment.customerUid,
      amount: payment.amount,
      discount: 0,
      finalAmount: payment.amount,
      paymentMode: payment.method,
      paymentStatus: payment.status,
      downloadUrl: null,
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }
}
