import { IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class MarketplaceOrderFilterDto {
  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'delivered', 'cancelled', 'refunded'])
  status?: string;

  @IsOptional()
  @IsString()
  vendorUid?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class DeliveryAddressDto {
  @IsString()
  addressLine1!: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsString()
  pincode!: string;
}

export class CreateOrderDto {
  @IsString()
  productId!: string;

  @IsString()
  productName!: string;

  @IsNumber()
  price!: number;

  @IsString()
  vendorUid!: string;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: 'cod' | 'gateway';

  @IsOptional()
  @IsString()
  couponCode?: string;

  /** Gross price before any coupon discount. Server computes the final price. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  originalPrice?: number;
}

export class UpdateOrderStatusDto {
  @IsEnum(['pending', 'in_progress', 'delivered', 'cancelled', 'refunded'])
  status!: string;
}
