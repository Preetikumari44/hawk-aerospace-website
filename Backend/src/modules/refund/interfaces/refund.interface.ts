export interface RefundListItem {
  id: string;
  bookingId: string;
  customerUid: string;
  originalAmount: number;
  refundAmount: number;
  refundPercentage: number;
  status: string;
  paymentMethod?: string | null;
  cancellationReason: string;
  refundReason: string;
  requestedAt: string;
  requestedBy: string;
  approvedBy?: string | null;
  processedAt?: string | null;
  completedAt?: string | null;
}
