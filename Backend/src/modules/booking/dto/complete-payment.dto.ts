import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, ValidateNested, IsObject } from 'class-validator';

/** Checkout result returned by Razorpay after a successful payment. */
export class RazorpayPaymentDetailsDto {
  @IsString()
  razorpayOrderId!: string;

  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  razorpaySignature!: string;
}

export class BillingAddressDto {
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

export class CompletePaymentDto {
  /** 'cash' = record cash intent (completes only after the pilot confirms receipt). */
  @IsOptional()
  @IsIn(['cash', 'gateway'])
  method?: 'cash' | 'gateway';

  /** Optional coupon applied at payment time. Discount is deducted from the payable amount. */
  @IsOptional()
  @IsString()
  couponCode?: string;

  /**
   * Required when method === 'gateway'. The signature is verified server-side
   * against the Razorpay order created for this booking before it is marked paid.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => RazorpayPaymentDetailsDto)
  payment?: RazorpayPaymentDetailsDto;

  /** Billing address for service bookings (required for online payments). */
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;
}
