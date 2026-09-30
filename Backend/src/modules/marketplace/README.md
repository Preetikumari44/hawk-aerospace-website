# Marketplace Module

## Overview
Manages the agricultural products marketplace where customers can buy/sell farm equipment, pesticides, fertilizers, and other agricultural products.

## Features
- Product listing management
- Buy/sell operations
- Inventory tracking
- Order management
- Seller ratings and reviews
- Product categories
- Search and filtering
- Payment integration

## API Endpoints
- `POST /marketplace/products` - List new product
- `GET /marketplace/products` - Browse products
- `GET /marketplace/products/:id` - Product details
- `POST /marketplace/orders` - Place order
- `GET /marketplace/orders` - Order history
- `PUT /marketplace/products/:id` - Update listing
- `POST /marketplace/reviews` - Add review

## Product Categories
- Pesticides & Chemicals
- Fertilizers
- Seeds
- Farm Equipment
- Drone Parts & Accessories
- Safety Gear
- Irrigation Systems

## Data Model
```typescript
interface IMarketplaceProduct {
  productId: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
  images: string[];
  specifications: Record<string, any>;
  rating: number;
  reviews: number;
  status: 'available' | 'sold_out' | 'inactive';
  createdAt: Date;
}
```

## Usage Example
```typescript
const product = await marketplaceService.createProduct({
  title: 'Premium Pesticide Spray',
  category: 'pesticides',
  price: 2500,
  quantity: 100,
  description: 'Organic pesticide for wheat crops'
});

const order = await marketplaceService.placeOrder({
  productId: product.productId,
  quantity: 10,
  deliveryAddress: address
});
```

## Related Modules
- [Customer Module](../customer/README.md)
- [Payment Module](../payment/README.md)

## Testing
```bash
npm test -- marketplace.service.spec.ts
```
