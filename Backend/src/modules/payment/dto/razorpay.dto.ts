import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateRazorpayOrderDto {
  /** Pay for a service booking. Mutually exclusive with orderIds. */
  @IsOptional()
  @IsString()
  bookingId?: string;

  /** Pay for already-created (pending) marketplace orders. Mutually exclusive with bookingId. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderIds?: string[];

  /** Optional coupon applied before computing the payable amount. */
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class VerifyRazorpayPaymentDto {
  @IsString()
  razorpayOrderId!: string;

  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  razorpaySignature!: string;
}

export class VerifyMarketplacePaymentDto extends VerifyRazorpayPaymentDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderIds!: string[];
}

export class AbandonMarketplaceOrdersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderIds!: string[];
}
