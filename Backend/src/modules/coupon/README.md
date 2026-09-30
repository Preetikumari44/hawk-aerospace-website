# Coupon Module

## Overview
Manages promotional coupons, discount codes, and special offers for the HAWK platform.

## Features
- Coupon creation and management
- Discount validation
- Usage tracking
- Expiry management
- Conditional discounts
- User-specific coupons
- Bulk coupon generation

## API Endpoints
- `POST /coupons/validate` - Validate coupon code
- `POST /coupons/apply` - Apply coupon to booking
- `GET /coupons/available` - Get available coupons
- `POST /admin/coupons` - Create coupon (admin)
- `GET /admin/coupons/stats` - Coupon usage statistics

## Coupon Types
- **Percentage**: X% off
- **Fixed Amount**: ₹X off
- **Free Service**: Complimentary add-on
- **First Booking**: New user discount
- **Referral**: Referral discount

## Data Model
```typescript
interface ICoupon {
  couponId: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_service';
  value: number;
  minBookingAmount?: number;
  maxDiscount?: number;
  validFrom: Date;
  validTo: Date;
  usageLimit: number;
  usedCount: number;
  applicableFor?: string[]; // user IDs
  status: 'active' | 'expired' | 'inactive';
}
```

## Usage Example
```typescript
const discount = await couponService.validate('FIRST50', {
  bookingAmount: 5000,
  userId: 'user123'
});

await couponService.apply('FIRST50', bookingId);
```

## Validation Rules
- Coupon must be active
- Within valid date range
- Usage limit not exceeded
- Meets minimum booking amount
- User eligible for coupon

## Related Modules
- [Booking Module](../booking/README.md)
- [Payment Module](../payment/README.md)

## Testing
```bash
npm test -- coupon.service.spec.ts
```
