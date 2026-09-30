# Pricing Module

## Overview
Dynamic pricing engine for drone delivery services based on crop type, farm size, distance, service type, and market conditions.

## Features
- Crop-based rate management
- Distance-based pricing
- Dynamic surge pricing
- Seasonal pricing adjustments
- Bulk booking discounts
- Promotional pricing
- Real-time price estimation

## Key Components
- `PricingService`: Core pricing logic
- `PricingController`: API endpoints

## API Endpoints
- `POST /pricing/estimate` - Get price estimate
- `GET /pricing/rates` - Get current rates
- `PUT /pricing/rates/:cropType` - Update crop rates (admin)
- `GET /pricing/history/:bookingId` - Price breakdown

## Pricing Formula
```typescript
basePrice = farmSize × cropRatePerAcre
serviceCharge = basePrice × serviceMultiplier
distanceCharge = distance × ratePerKm
surgeMultiplier = calculateSurge(demand, supply)
discount = calculateDiscount(customer, volume)

finalPrice = (basePrice + serviceCharge + distanceCharge) 
             × surgeMultiplier 
             - discount
```

## Data Model
```typescript
interface ICropRate {
  cropType: string;
  ratePerAcre: number;
  servicePricing: {
    spraying: number;
    surveillance: number;
    mapping: number;
  };
  seasonalAdjustment?: number;
  minimumCharge: number;
}
```

## Usage Example
```typescript
const estimate = await pricingService.estimatePrice({
  cropType: 'wheat',
  farmSize: 10,
  serviceType: 'spraying',
  distance: 15,
  scheduledDate: new Date('2024-07-15')
});
```

## Related Modules
- [Booking Module](../booking/README.md)

## Testing
```bash
npm test -- pricing.service.spec.ts
```
