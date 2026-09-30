# Reward Module

## Overview
Manages loyalty rewards, referral programs, and incentive systems for customers and pilots.

## Features
- Loyalty points system
- Referral rewards
- Milestone bonuses
- Points redemption
- Tier-based benefits
- Reward history
- Campaign management

## API Endpoints
- `GET /rewards/balance` - Get points balance
- `POST /rewards/redeem` - Redeem points
- `GET /rewards/history` - Reward history
- `POST /rewards/refer` - Send referral
- `GET /rewards/tiers` - View tier benefits

## Points System
- 1 point = ₹1 spent
- Booking completion: 50 bonus points
- Referral: 500 points (each)
- Birthday bonus: 200 points
- Tier upgrades with accumulated points

## Customer Tiers
- **Regular**: 0-1000 points
- **Silver**: 1001-5000 points (5% discount)
- **Gold**: 5001-15000 points (10% discount)
- **Platinum**: 15000+ points (15% discount + priority support)

## Usage Example
```typescript
await rewardService.addPoints(userId, {
  points: 100,
  reason: 'booking_completed',
  bookingId: 'book123'
});

await rewardService.redeemPoints(userId, {
  points: 500,
  bookingId: 'book456'
});
```

## Related Modules
- [Customer Module](../customer/README.md)
- [Booking Module](../booking/README.md)

## Testing
```bash
npm test -- reward.service.spec.ts
```
