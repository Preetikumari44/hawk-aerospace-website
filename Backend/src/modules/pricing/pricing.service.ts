import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestorePricingLockDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import {
  ACRES_PER_HECTARE,
  ACRES_PER_SQKM,
  ACRES_PER_SQMI,
  DEFAULT_CROP_RATES,
  DISTANCE_RATE_PER_KM,
  DRONE_TIER_RATE_PER_HOUR,
  FREE_DISTANCE_KM,
  MIN_FINAL_PRICE,
  SQ_M_PER_ACRE,
  AREA_TIER_DISCOUNTS,
  PEAK_HOUR_SURCHARGE,
  PEAK_HOURS,
  HARVEST_SEASON_SURCHARGE,
  HARVEST_MONTHS,
  GST_RATE,
  CROP_MULTIPLIERS,
  CANCELLATION_POLICIES,
  type AreaUnit,
  type CropRate,
  type DroneTier,
  type CancellationPolicy,
} from './data/crop-rates';
import { EstimatePriceDto } from './dto/estimate-price.dto';
import { LockPriceDto } from './dto/lock-price.dto';
import { UpdateCropRateDto } from './dto/update-crop-rate.dto';
import { CalculateRefundDto } from './dto/calculate-refund.dto';
import {
  SERVICE_CATALOG,
  SERVICE_FACTORS,
  SERVICE_UNIT_LABELS,
  FACTOR_CROP_PEAK_MONTHS,
  FACTOR_HOLIDAYS,
  FACTOR_PEAK_HOUR_RANGES,
  FACTOR_WEDDING_SEASON_MONTHS,
  FACTOR_WEEKEND_DAYS,
  findServiceEntry,
  findServiceEntryByLabel,
  getServiceUnitOption,
  priceForDuration,
  type FactorDefinition,
  type ServiceCatalogEntry,
  type ServiceFactorCode,
  type ServiceUnit,
} from './data/service-catalog';
import type { BookingServiceDetails, DroneServiceType } from '../../database/firestore/contracts';

export interface PriceLineItem {
  label: string;
  amount: number;
}

export interface PriceEstimate {
  cropType: string;
  areaInAcres: number;
  droneTier: DroneTier;
  cropRate: CropRate;
  lineItems: PriceLineItem[];
  subtotal: number;
  areaTierDiscount: number;
  couponDiscount: number;
  taxAmount: number;
  estimatedAmount: number;
}

/** Estimate result for catalog-based (Excel price list) services. All base prices are GST-excluded. */
export interface ServicePriceEstimate {
  serviceType: 'videography' | 'spraying' | 'monitoring' | 'mapping' | 'surveillance';
  serviceKey: string;
  serviceLabel: string;
  unit: ServiceUnit;
  unitLabel: string;
  quantity: number;
  baseUnitPrice: number; // GST-excluded per-unit base price
  unitPrice: number; // GST-excluded per-unit price after factors
  factors: Array<FactorDefinition & { amount: number }>;
  lineItems: PriceLineItem[];
  baseAmount: number;
  subtotal: number;
  taxAmount: number;
  estimatedAmount: number;
}

export interface RefundCalculation {
  bookingId: string;
  totalAmount: number;
  hoursBeforeService: number;
  applicablePolicy: CancellationPolicy;
  refundAmount: number;
  penaltyAmount: number;
  travelCostRecovery: number;
  netRefund: number;
}

export interface RefundCalculation {
  bookingId: string;
  totalAmount: number;
  hoursBeforeService: number;
  applicablePolicy: CancellationPolicy;
  refundAmount: number;
  penaltyAmount: number;
  travelCostRecovery: number;
  netRefund: number;
}

export interface LockedPrice extends PriceEstimate {
  finalAmount: number;
  minimumApplied: boolean;
  pricingId: string;
}

export interface CropRateOverrideDocument extends CropRate {
  id: string;
  fleetManagerUid?: string | null;
  active: boolean;
  updatedBy: string;
  updatedAt: string;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async getCropRates(fleetManagerUid?: string): Promise<CropRate[]> {
    if (!this.firebaseAdminService.isEnabled()) {
      return DEFAULT_CROP_RATES;
    }

    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.pricingConfigs)
      .where('active', '==', true)
      .get();
    const overrides = snapshot.docs
      .map((doc) => doc.data() as CropRateOverrideDocument)
      .filter((rate) => !rate.fleetManagerUid || rate.fleetManagerUid === fleetManagerUid);

    return this.mergeCropRates(DEFAULT_CROP_RATES, overrides);
  }

  async estimatePrice(dto: EstimatePriceDto): Promise<PriceEstimate> {
    const cropRates = await this.getCropRates(dto.fleetManagerUid);
    return this.calculateEstimate(dto, cropRates);
  }

  async updateCropRate(
    dto: UpdateCropRateDto,
    user: CurrentUser,
  ): Promise<CropRateOverrideDocument> {
    const now = new Date().toISOString();
    const id = dto.fleetManagerUid
      ? `${this.normalizeCropKey(dto.cropType)}:${dto.fleetManagerUid}`
      : this.normalizeCropKey(dto.cropType);
    const document: CropRateOverrideDocument = {
      id,
      cropType: this.normalizeCropKey(dto.cropType),
      baseRatePerAcre: dto.baseRatePerAcre,
      chemicalSurcharge: dto.chemicalSurcharge,
      fleetManagerUid: dto.fleetManagerUid ?? null,
      active: dto.active ?? true,
      updatedBy: user.uid,
      updatedAt: now,
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.pricingConfigs)
      .doc(id)
      .set(document, { merge: true });

    return document;
  }

  async lockPrice(dto: LockPriceDto, pilotUid: string): Promise<LockedPrice> {
    const estimate = await this.estimatePrice({
      cropType: dto.cropType,
      areaValue: dto.actualAreaValue,
      areaUnit: dto.actualAreaUnit,
      droneTier: dto.droneTier,
      estimatedFlightHours: dto.actualFlightHours,
      distanceKm: dto.distanceKm,
      couponDiscountAmount: dto.couponDiscountAmount,
      chemicalRequired: true,
    });

    const beforeMinimum = estimate.estimatedAmount + (dto.additionalCharges ?? 0);
    const finalAmount = Math.max(MIN_FINAL_PRICE, beforeMinimum);
    const pricingId = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.pricingLocks)
      .doc().id;
    const document: FirestorePricingLockDocument = {
      pricingId,
      pilotUid: pilotUid,
      bookingId: dto.bookingId,
      lockedAmount: finalAmount,
      paymentMethod: dto.paymentMethod,
      paymentStatus: 'pending',
      invoiceUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.pricingLocks)
      .doc(pricingId)
      .set(document);

    return {
      ...estimate,
      finalAmount,
      pricingId,
      minimumApplied: finalAmount !== beforeMinimum,
      lineItems: [
        ...estimate.lineItems,
        {
          label: 'Additional charges',
          amount: dto.additionalCharges ?? 0,
        },
      ],
    };
  }

  calculateEstimate(dto: EstimatePriceDto, cropRates = DEFAULT_CROP_RATES): PriceEstimate {
    const cropType = this.normalizeCropKey(dto.cropType);
    const cropRate = this.findCropRate(cropType, cropRates);
    const areaInAcres = this.convertAreaToAcres(dto.areaValue, dto.areaUnit);
    const droneTier = dto.droneTier ?? 'standard';
    const flightHours = dto.estimatedFlightHours ?? Math.max(1, areaInAcres);
    const distanceKm = dto.distanceKm ?? 0;
    const distanceBillableKm = Math.max(0, distanceKm - FREE_DISTANCE_KM);
    const chemicalSurcharge = dto.chemicalRequired === false ? 0 : cropRate.chemicalSurcharge;
    
    // 1. Base price by service (existing)
    let cropAmount = cropRate.baseRatePerAcre * areaInAcres;
    
    // 2. Crop-specific multiplier (NEW)
    const cropMultiplier = CROP_MULTIPLIERS[cropType] || 1.0;
    cropAmount = cropAmount * cropMultiplier;
    
    // 3. Drone tier cost
    const droneAmount = DRONE_TIER_RATE_PER_HOUR[droneTier] * flightHours;
    
    // 4. Travel charges (distance calculation - NEW)
    const distanceAmount = distanceBillableKm * DISTANCE_RATE_PER_KM;
    
    const lineItems: PriceLineItem[] = [
      { label: 'Crop base service', amount: cropAmount },
      { label: 'Chemical surcharge', amount: chemicalSurcharge },
      { label: `${droneTier} drone tier`, amount: droneAmount },
      { label: 'Travel charges', amount: distanceAmount },
    ];
    
    // 5. Time-of-day surcharge (NEW)
    let timeOfDaySurcharge = 0;
    if (dto.preferredTime) {
      const hour = parseInt(dto.preferredTime.split(':')[0], 10);
      const isPeakHour = PEAK_HOURS.some(peak => hour >= peak.start && hour < peak.end);
      if (isPeakHour) {
        const baseAmount = cropAmount + chemicalSurcharge + droneAmount + distanceAmount;
        timeOfDaySurcharge = baseAmount * PEAK_HOUR_SURCHARGE;
        lineItems.push({ label: 'Peak hour surcharge (15%)', amount: timeOfDaySurcharge });
      }
    }
    
    // 6. Seasonal surcharge (NEW)
    let seasonalSurcharge = 0;
    if (dto.preferredDate) {
      const date = new Date(dto.preferredDate);
      const month = date.getMonth();
      if (HARVEST_MONTHS.includes(month)) {
        const baseAmount = cropAmount + chemicalSurcharge + droneAmount + distanceAmount;
        seasonalSurcharge = baseAmount * HARVEST_SEASON_SURCHARGE;
        lineItems.push({ label: 'Harvest season surcharge (10%)', amount: seasonalSurcharge });
      }
    }
    
    const subtotal = this.roundCurrency(lineItems.reduce((total, item) => total + item.amount, 0));
    
    // 3. Area-based tier pricing (NEW)
    const areaTierDiscount = this.calculateAreaTierDiscount(areaInAcres, subtotal);
    if (areaTierDiscount > 0) {
      lineItems.push({ label: 'Area tier discount', amount: -areaTierDiscount });
    }
    
    // 7. Coupon discount (existing, but now properly applied)
    const couponDiscount = Math.min(subtotal - areaTierDiscount, dto.couponDiscountAmount ?? 0);
    if (couponDiscount > 0) {
      lineItems.push({ label: 'Coupon discount', amount: -couponDiscount });
    }
    
    const amountBeforeTax = subtotal - areaTierDiscount - couponDiscount;
    
    // 8. Tax (GST) calculation (NEW)
    const taxAmount = this.roundCurrency(amountBeforeTax * GST_RATE);
    lineItems.push({ label: `GST (${GST_RATE * 100}%)`, amount: taxAmount });

    return {
      cropType,
      areaInAcres: this.roundMeasurement(areaInAcres),
      droneTier,
      cropRate,
      lineItems: lineItems.map((item) => ({
        ...item,
        amount: this.roundCurrency(item.amount),
      })),
      subtotal,
      areaTierDiscount: this.roundCurrency(areaTierDiscount),
      couponDiscount: this.roundCurrency(couponDiscount),
      taxAmount,
      estimatedAmount: this.roundCurrency(amountBeforeTax + taxAmount),
    };
  }

  /**
   * Estimate the price for a catalog-based drone service (videography, agriculture
   * NDVI/precision spraying, mapping, surveillance). Returns `null` when the
   * supplied service does not exist in the authoritative pricing source (in which
   * case the legacy crop-rate engine should be used).
   */
  estimateBookingPriceForService(input: {
    serviceType: DroneServiceType;
    serviceDetails?: BookingServiceDetails;
    areaValue?: number;
    scheduledDate?: string;
    preferredTime?: string;
  }): ServicePriceEstimate | null {
    const { serviceType, serviceDetails, areaValue, scheduledDate, preferredTime } = input;
    const details = serviceDetails ?? {};

    let key: string | undefined;

    switch (serviceType) {
      case 'videography': {
        const byLabel = findServiceEntryByLabel(details.videographyType ?? details.eventType);
        if (byLabel?.serviceType === 'videography') {
          key = byLabel.key;
        }
        break;
      }
      case 'monitoring':
        if (details.monitoringSubType === 'crop_health_monitoring') {
          key = 'crop_health_monitoring';
        }
        break;
      case 'spraying':
        if (details.sprayingSubType === 'precision_spraying') {
          key = 'precision_spraying';
        }
        break;
      case 'mapping': {
        const byLabel = findServiceEntryByLabel(details.mappingType);
        if (byLabel?.serviceType === 'mapping') {
          key = byLabel.key;
        }
        break;
      }
      case 'surveillance': {
        const byLabel = findServiceEntryByLabel(details.surveillanceType);
        if (byLabel?.serviceType === 'surveillance') {
          key = byLabel.key;
        }
        break;
      }
      default:
        return null;
    }

    if (!key) {
      return null;
    }

    const entry = findServiceEntry(serviceType, key)!;
    const unitOption = getServiceUnitOption(entry, details.unit);
    const isDuration =
      Array.isArray(unitOption.durationPricing) && unitOption.durationPricing.length > 0;
    const quantity =
      details.quantity ??
      (unitOption.unit === 'per_acre'
        ? Number(areaValue ?? 1)
        : isDuration
          ? (entry.defaultQuantity ?? 30)
          : 1);

    return this.calculateServiceEstimate({
      serviceType: entry.serviceType,
      key: entry.key,
      unit: unitOption.unit,
      quantity,
      scheduledDate,
      preferredTime,
    });
  }

  /**
   * Pure calculation for a catalog service: base price × quantity, plus applicable
   * dynamic factors (weekend / holiday / wedding-season / crop-peak-season / peak-hour).
   * Base and unit prices are GST-excluded; GST is reported separately in lineItems.
   */
  calculateServiceEstimate(options: {
    serviceType: ServiceCatalogEntry['serviceType'];
    key?: string;
    unit?: string;
    quantity?: number;
    scheduledDate?: string;
    preferredTime?: string;
  }): ServicePriceEstimate {
    const resolvedKey =
      options.key ?? SERVICE_CATALOG.find((entry) => entry.serviceType === options.serviceType)?.key ?? '';
    const entry = findServiceEntry(options.serviceType, resolvedKey);
    if (!entry) {
      throw new BadRequestException(
        `Unknown service "${options.serviceType}:${options.key}". Not present in the pricing source.`,
      );
    }

    const unitOption = getServiceUnitOption(entry, options.unit);
    const isDuration =
      Array.isArray(unitOption.durationPricing) && unitOption.durationPricing.length > 0;
    const defaultQuantity = entry.defaultQuantity ?? (isDuration ? 30 : 1);
    const quantity = Math.max(
      options.quantity && options.quantity > 0 ? options.quantity : defaultQuantity,
      isDuration ? 1 : 0.01,
    );
    const baseAmount = isDuration
      ? this.roundCurrency(priceForDuration(unitOption.durationPricing!, quantity))
      : this.roundCurrency((unitOption.basePrice ?? 0) * quantity);

    const factors = this.resolveServiceFactors(entry.factors, {
      scheduledDate: options.scheduledDate,
      preferredTime: options.preferredTime,
    });

    const surchargeAmount = this.roundCurrency(
      factors.reduce((total, factor) => total + baseAmount * factor.rate, 0),
    );
    const subtotal = this.roundCurrency(baseAmount + surchargeAmount);
    const taxAmount = this.roundCurrency(subtotal * GST_RATE);
    const estimatedAmount = this.roundCurrency(subtotal + taxAmount);

    const factorMultiplier = factors.reduce((total, factor) => total + factor.rate, 0);
    const unitBase = isDuration ? baseAmount : (unitOption.basePrice ?? 0);
    const unitPrice = this.roundCurrency(unitBase * (1 + factorMultiplier));

    const lineItems: PriceLineItem[] = [
      { label: entry.label, amount: baseAmount },
      ...factors.map((factor) => ({
        label: factor.label,
        amount: this.roundCurrency(baseAmount * factor.rate),
      })),
      { label: `GST (${Math.round(GST_RATE * 100)}%)`, amount: taxAmount },
    ];

    return {
      serviceType: entry.serviceType,
      serviceKey: entry.key,
      serviceLabel: entry.label,
      unit: unitOption.unit,
      unitLabel: isDuration ? SERVICE_UNIT_LABELS.min : SERVICE_UNIT_LABELS[unitOption.unit],
      quantity: this.roundQuantity(quantity),
      baseUnitPrice: this.roundCurrency(unitBase),
      unitPrice,
      factors: factors.map((factor) => ({
        ...factor,
        amount: this.roundCurrency(baseAmount * factor.rate),
      })),
      lineItems: lineItems.map((item) => ({
        ...item,
        amount: this.roundCurrency(item.amount),
      })),
      baseAmount,
      subtotal,
      taxAmount,
      estimatedAmount,
    };
  }

  private resolveServiceFactors(
    factorCodes: ServiceFactorCode[],
    input: { scheduledDate?: string; preferredTime?: string },
  ): Array<FactorDefinition & { amount: number }> {
    const date = input.scheduledDate ? new Date(input.scheduledDate) : null;
    const validDate = date && !Number.isNaN(date.getTime()) ? date : null;

    const hour =
      input.preferredTime && /^\d{1,2}(:\d{2})?$/.test(input.preferredTime)
        ? parseInt(input.preferredTime.split(':')[0], 10)
        : validDate
          ? validDate.getHours()
          : NaN;

    const applied: Array<FactorDefinition & { amount: number }> = [];
    const addIf = (condition: boolean, code: ServiceFactorCode): void => {
      if (!condition || !factorCodes.includes(code)) return;
      const def = SERVICE_FACTORS[code];
      if (!applied.some((f) => f.code === code)) {
        applied.push({ ...def, amount: 0 });
      }
    };

    addIf(validDate !== null && FACTOR_WEEKEND_DAYS.includes(validDate.getDay()), 'weekend');
    addIf(
      validDate !== null &&
        FACTOR_HOLIDAYS.some(
          (holiday) => holiday.month === validDate.getMonth() && holiday.day === validDate.getDate(),
        ),
      'holiday',
    );
    addIf(
      validDate !== null && FACTOR_WEDDING_SEASON_MONTHS.includes(validDate.getMonth()),
      'wedding_season',
    );
    addIf(validDate !== null && FACTOR_CROP_PEAK_MONTHS.includes(validDate.getMonth()), 'crop_peak_season');
    addIf(
      !Number.isNaN(hour) && FACTOR_PEAK_HOUR_RANGES.some((peak) => hour >= peak.start && hour < peak.end),
      'peak_hour',
    );

    return applied;
  }

  // Area-based tier pricing calculation (NEW)
  private calculateAreaTierDiscount(areaInAcres: number, subtotal: number): number {
    const applicableTier = AREA_TIER_DISCOUNTS.find(tier => areaInAcres <= tier.maxAcres);
    if (!applicableTier || applicableTier.discount === 0) {
      return 0;
    }
    return subtotal * applicableTier.discount;
  }

  // Cancellation refund calculation (NEW)
  calculateRefund(dto: CalculateRefundDto): RefundCalculation {
    const scheduledDate = new Date(dto.scheduledDateTime);
    const cancellationDate = new Date(dto.cancellationDateTime);
    const hoursBeforeService = (scheduledDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60);

    // Find applicable policy
    let applicablePolicy = CANCELLATION_POLICIES[CANCELLATION_POLICIES.length - 1]; // Default: < 6 hours
    for (const policy of CANCELLATION_POLICIES) {
      if (hoursBeforeService >= policy.hoursBeforeService) {
        applicablePolicy = policy;
        break;
      }
    }

    // If pilot already dispatched, no refund
    if (dto.pilotDispatched) {
      const travelCost = dto.travelCostIncurred || 0;
      this.logger.warn(`Cancellation after pilot dispatch for booking ${dto.bookingId}, charging travel cost`);
      return {
        bookingId: dto.bookingId,
        totalAmount: dto.totalAmount,
        hoursBeforeService: this.roundMeasurement(hoursBeforeService),
        applicablePolicy: { hoursBeforeService: 0, refundPercentage: 0, penaltyPercentage: 1.0 },
        refundAmount: 0,
        penaltyAmount: dto.totalAmount,
        travelCostRecovery: travelCost,
        netRefund: -travelCost, // Customer owes travel cost
      };
    }

    const refundAmount = this.roundCurrency(dto.totalAmount * applicablePolicy.refundPercentage);
    const penaltyAmount = this.roundCurrency(dto.totalAmount * applicablePolicy.penaltyPercentage);
    const travelCostRecovery = dto.travelCostIncurred || 0;
    const netRefund = this.roundCurrency(refundAmount - travelCostRecovery);

    this.logger.log(
      `Cancellation for booking ${dto.bookingId}: ${hoursBeforeService.toFixed(1)} hours before service, ` +
      `${applicablePolicy.refundPercentage * 100}% refund policy applies, net refund: ₹${netRefund}`
    );

    return {
      bookingId: dto.bookingId,
      totalAmount: dto.totalAmount,
      hoursBeforeService: this.roundMeasurement(hoursBeforeService),
      applicablePolicy,
      refundAmount,
      penaltyAmount,
      travelCostRecovery,
      netRefund,
    };
  }

  convertAreaToAcres(areaValue: number, areaUnit: AreaUnit): number {
    if (areaUnit === 'acre') {
      return areaValue;
    }

    if (areaUnit === 'hectare') {
      return areaValue * ACRES_PER_HECTARE;
    }

    if (areaUnit === 'sqkm') {
      return areaValue * ACRES_PER_SQKM;
    }

    if (areaUnit === 'sqmi') {
      return areaValue * ACRES_PER_SQMI;
    }

    return areaValue / SQ_M_PER_ACRE;
  }

  private findCropRate(cropType: string, cropRates: CropRate[]): CropRate {
    return (
      cropRates.find((rate) => this.normalizeCropKey(rate.cropType) === cropType) ??
      cropRates.find((rate) => this.normalizeCropKey(rate.cropType) === 'other') ??
      DEFAULT_CROP_RATES[DEFAULT_CROP_RATES.length - 1]
    );
  }

  private mergeCropRates(baseRates: CropRate[], overrides: CropRateOverrideDocument[]): CropRate[] {
    const merged = new Map(baseRates.map((rate) => [this.normalizeCropKey(rate.cropType), rate]));

    for (const override of overrides) {
      merged.set(this.normalizeCropKey(override.cropType), {
        cropType: this.normalizeCropKey(override.cropType),
        baseRatePerAcre: override.baseRatePerAcre,
        chemicalSurcharge: override.chemicalSurcharge,
      });
    }

    return [...merged.values()];
  }

  private normalizeCropKey(cropType: string): string {
    return cropType.trim().toLowerCase().replace(/\s+/g, '_');
  }

  private roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  private roundMeasurement(value: number): number {
    return Math.round(value * 10000) / 10000;
  }

  private roundQuantity(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
