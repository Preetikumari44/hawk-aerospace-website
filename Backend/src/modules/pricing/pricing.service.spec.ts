import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const firebaseAdminService = {
    isEnabled: jest.fn().mockReturnValue(false),
    firestore: jest.fn(),
  };
  const service = new PricingService(firebaseAdminService as never);

  it('converts square meters to acres for crop pricing', () => {
    expect(service.convertAreaToAcres(4046.8564224, 'sq_m')).toBeCloseTo(1);
  });

  it('uses crop table, drone tier, chemical surcharge, and distance threshold', () => {
    const estimate = service.calculateEstimate({
      cropType: 'wheat',
      areaUnit: 'acre',
      areaValue: 2,
      droneTier: 'premium',
      estimatedFlightHours: 1,
      distanceKm: 12,
    });

    expect(estimate.estimatedAmount).toBe(1734.6);
    expect(estimate.lineItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Crop base service', amount: 1000 }),
        expect.objectContaining({ label: 'Chemical surcharge', amount: 50 }),
        expect.objectContaining({ label: 'premium drone tier', amount: 400 }),
        expect.objectContaining({ label: 'Travel charges', amount: 20 }),
        expect.objectContaining({ label: 'GST (18%)', amount: 264.6 }),
      ]),
    );
  });

  it('caps coupon discount at subtotal', () => {
    const estimate = service.calculateEstimate({
      cropType: 'mustard',
      areaUnit: 'acre',
      areaValue: 1,
      couponDiscountAmount: 5000,
    });

    expect(estimate.estimatedAmount).toBe(0);
  });

  it('prices NDVI crop monitoring per acre at ₹450 (GST excluded)', () => {
    const estimate = service.calculateServiceEstimate({
      serviceType: 'monitoring',
      key: 'crop_health_monitoring',
      unit: 'per_acre',
      quantity: 10,
      scheduledDate: '2026-06-10', // not in crop peak season
    });

    expect(estimate.baseUnitPrice).toBe(450);
    expect(estimate.baseAmount).toBe(4500);
    expect(estimate.factors).toHaveLength(0);
    expect(estimate.subtotal).toBe(4500);
    expect(estimate.taxAmount).toBe(810);
    expect(estimate.estimatedAmount).toBe(5310);
  });

  it('applies weekend + wedding-season factors to Event Photography', () => {
    const estimate = service.calculateServiceEstimate({
      serviceType: 'videography',
      key: 'event_photography',
      unit: 'min',
      quantity: 30,
      scheduledDate: '2026-01-10', // Saturday, wedding season (Jan)
    });

    expect(estimate.baseUnitPrice).toBe(5000);
    expect(estimate.baseAmount).toBe(5000);
    expect(estimate.factors.map((f) => f.code).sort()).toEqual([
      'wedding_season',
      'weekend',
    ]);
    // 5000 base + 15% weekend + 20% wedding season = 6750 (GST excluded) + 18% GST
    expect(estimate.subtotal).toBe(6750);
    expect(estimate.estimatedAmount).toBe(7965);
  });

  it('prices Event Photography by duration minutes (60 min package)', () => {
    const estimate = service.calculateServiceEstimate({
      serviceType: 'videography',
      key: 'event_photography',
      unit: 'min',
      quantity: 60,
      scheduledDate: '2026-06-10',
    });

    expect(estimate.unitLabel).toBe('min');
    expect(estimate.baseAmount).toBe(10000);
    expect(estimate.baseUnitPrice).toBe(10000);
    // extrapolates 90 min from the 30→60 segment (linear)
    const ninety = service.calculateServiceEstimate({
      serviceType: 'videography',
      key: 'event_photography',
      unit: 'min',
      quantity: 90,
      scheduledDate: '2026-06-10',
    });
    expect(ninety.baseAmount).toBe(15000);
  });

  it('prices Real Estate Photography/Videography by duration minutes', () => {
    const estimate = service.calculateServiceEstimate({
      serviceType: 'videography',
      key: 'real_estate_photography',
      unit: 'min',
      quantity: 60,
      scheduledDate: '2026-06-10',
    });

    expect(estimate.baseAmount).toBe(8500);
    expect(estimate.baseUnitPrice).toBe(8500);
  });

  it('applies peak-hour factor to Traffic Management Monitoring', () => {
    const estimate = service.calculateServiceEstimate({
      serviceType: 'surveillance',
      key: 'traffic_management_monitoring',
      unit: 'per_hour',
      quantity: 3,
      preferredTime: '17:30',
    });

    expect(estimate.baseUnitPrice).toBe(6500);
    expect(estimate.baseAmount).toBe(19500);
    expect(estimate.factors).toEqual([
      expect.objectContaining({ code: 'peak_hour', rate: 0.15 }),
    ]);
    expect(estimate.subtotal).toBe(22425);
    expect(estimate.estimatedAmount).toBe(26461.5);
  });

  it('maps platform booking service details to the catalog estimate', () => {
    const estimate = service.estimateBookingPriceForService({
      serviceType: 'videography',
      serviceDetails: { videographyType: 'Event Photography', unit: 'min', quantity: 60 },
      scheduledDate: '2026-06-10',
    });

    expect(estimate).not.toBeNull();
    expect(estimate!.serviceKey).toBe('event_photography');
    expect(estimate!.unit).toBe('min');
    expect(estimate!.baseUnitPrice).toBe(10000);
  });

  it('throws for a service not present in the pricing source', () => {
    expect(() =>
      service.calculateServiceEstimate({
        serviceType: 'videography',
        key: 'invented_service',
      }),
    ).toThrow("Not present in the pricing source");
  });
});
