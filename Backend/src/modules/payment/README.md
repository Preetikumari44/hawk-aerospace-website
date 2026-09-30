# Payment Module

## Overview
Comprehensive payment processing system supporting multiple payment gateways, invoicing, refunds, and financial reconciliation.

## Features
- Multiple payment gateways (Razorpay, Stripe, PayPal)
- Invoice generation and management
- Refund processing
- Payment history and analytics
- Secure payment handling
- Webhook integration
- Split payments for aggregators/pilots

## Key Components
- `PaymentService`: Core payment operations
- `InvoiceService`: Invoice generation and management
- `PaymentController`: REST API endpoints

## API Endpoints
- `POST /payments/initiate` - Initiate payment
- `POST /payments/verify` - Verify payment
- `POST /payments/refund` - Process refund
- `GET /payments/history` - Payment history
- `GET /payments/invoice/:id` - Get invoice
- `POST /payments/webhook` - Payment gateway webhooks

## Payment Flow
```
initiate → gateway redirect → callback → verify → confirm booking
```

## Data Model
```typescript
interface IPayment {
  paymentId: string;
  bookingId: string;
  customerId: string;
  amount: number;
  currency: string;
  gateway: 'razorpay' | 'stripe' | 'paypal';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  invoiceId?: string;
  metadata: any;
  createdAt: Date;
}
```

## Usage Example
```typescript
// Initiate payment
const payment = await paymentService.initiatePayment({
  bookingId: 'book123',
  amount: 5000,
  currency: 'INR',
  gateway: 'razorpay'
});

// Verify payment
await paymentService.verifyPayment(payment.paymentId, {
  transactionId: 'txn_xyz',
  signature: 'signature_hash'
});

// Process refund
await paymentService.refund(payment.paymentId, {
  amount: 5000,
  reason: 'Booking cancelled'
});
```

## Security
- PCI DSS compliance
- Encrypted payment data
- Secure webhook verification
- Payment gateway tokenization

## Related Modules
- [Booking Module](../booking/README.md)
- [Customer Module](../customer/README.md)
- [Pilot Module](../pilot/README.md)

## Testing
```bash
npm test -- payment.service.spec.ts
```
