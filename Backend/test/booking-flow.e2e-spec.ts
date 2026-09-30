import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Booking Flow - Integration Tests (E2E)', () => {
  let app: INestApplication;
  let customerToken: string;
  let pilotToken: string;
  let vendorToken: string;
  let adminToken: string;
  let bookingId: string;
  let paymentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Setup test authentication tokens (mock or real)
    // In real scenario, you'd authenticate through the API
    customerToken = 'Bearer mock-customer-token';
    pilotToken = 'Bearer mock-pilot-token';
    vendorToken = 'Bearer mock-vendor-token';
    adminToken = 'Bearer mock-admin-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Booking Lifecycle', () => {
    it('1. Customer creates a booking', async () => {
      const createBookingDto = {
        address: '123 Farm Road, Ludhiana, Punjab',
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        serviceType: 'spraying',
        location: { lat: 30.9010, lng: 75.8573 },
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        distanceKm: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', customerToken)
        .send(createBookingDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
      expect(response.body.cropType).toBe('wheat');
      expect(response.body).toHaveProperty('priceEstimation');

      bookingId = response.body.id;
    });

    it('2. Customer retrieves their bookings', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', customerToken)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('3. Vendor assigns pilot and drone to booking', async () => {
      const assignDto = {
        pilotId: 'pilot123',
        droneId: 'drone456',
      };

      const response = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/assign`)
        .set('Authorization', vendorToken)
        .send(assignDto)
        .expect(200);

      expect(response.body.status).toBe('confirmed');
      expect(response.body.assignedPilot).toBe('pilot123');
      expect(response.body.assignedDrone).toBe('drone456');
    });

    it('4. Pilot locks price for the mission', async () => {
      const priceLockDto = {
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        serviceType: 'spraying',
        paymentMethod: 'cash',
        distanceKm: 5,
      };

      const response = await request(app.getHttpServer())
        .post(`/pilots/missions/${bookingId}/lock-price`)
        .set('Authorization', pilotToken)
        .send(priceLockDto)
        .expect(201);

      expect(response.body).toHaveProperty('booking');
      expect(response.body).toHaveProperty('pricing');
      expect(response.body.booking).toHaveProperty('finalPrice');
    });

    it('5. Pilot initiates payment', async () => {
      const paymentDto = {
        bookingId: bookingId,
        method: 'upi',
      };

      const response = await request(app.getHttpServer())
        .post('/payments/initiate')
        .set('Authorization', pilotToken)
        .send(paymentDto)
        .expect(201);

      expect(response.body).toHaveProperty('payment');
      expect(response.body.payment.status).toBe('pending');
      expect(response.body.payment.method).toBe('upi');
      expect(response.body).toHaveProperty('qrPayload');

      paymentId = response.body.payment.id;
    });

    it('6. Pilot confirms payment', async () => {
      const confirmDto = {
        referenceId: 'UPI123456789',
      };

      const response = await request(app.getHttpServer())
        .patch(`/payments/${paymentId}/confirm`)
        .set('Authorization', pilotToken)
        .send(confirmDto)
        .expect(200);

      expect(response.body.status).toBe('paid');
      expect(response.body.referenceId).toBe('UPI123456789');
      expect(response.body).toHaveProperty('invoiceId');
    });

    it('7. Pilot updates booking status to in_progress', async () => {
      const statusDto = {
        status: 'in_progress',
        remarks: 'Mission started',
      };

      const response = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/status`)
        .set('Authorization', pilotToken)
        .send(statusDto)
        .expect(200);

      expect(response.body.status).toBe('in_progress');
    });

    it('8. Pilot completes the mission', async () => {
      const statusDto = {
        status: 'completed',
        remarks: 'Mission completed successfully',
      };

      const response = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/status`)
        .set('Authorization', pilotToken)
        .send(statusDto)
        .expect(200);

      expect(response.body.status).toBe('completed');
    });

    it('9. Generate invoice for payment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payments/${paymentId}/invoice`)
        .expect(200);

      expect(response.body).toHaveProperty('invoiceId');
      expect(response.body.invoiceId).toContain('HAWK-');
      expect(response.body.paymentStatus).toBe('paid');
    });

    it('10. Admin views dashboard with booking statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('bookings');
      expect(response.body).toHaveProperty('revenue');
      expect(response.body.bookings).toHaveProperty('total');
      expect(response.body.bookings.total).toBeGreaterThan(0);
    });
  });

  describe('Booking Cancellation Flow', () => {
    let cancellableBookingId: string;

    it('1. Customer creates a new booking', async () => {
      const createBookingDto = {
        address: '456 Test Farm, Punjab',
        cropType: 'rice',
        areaValue: 5,
        areaUnit: 'hectares',
        droneTier: 'basic',
        serviceType: 'monitoring',
        location: { lat: 30.7333, lng: 76.7794 },
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        distanceKm: 3,
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', customerToken)
        .send(createBookingDto)
        .expect(201);

      cancellableBookingId = response.body.id;
    });

    it('2. Customer cancels the booking', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/bookings/${cancellableBookingId}/cancel`)
        .set('Authorization', customerToken)
        .expect(200);

      expect(response.body.status).toBe('cancelled');
    });

    it('3. Cancelled booking should not be assignable', async () => {
      const assignDto = {
        pilotId: 'pilot123',
        droneId: 'drone456',
      };

      await request(app.getHttpServer())
        .patch(`/bookings/${cancellableBookingId}/assign`)
        .set('Authorization', vendorToken)
        .send(assignDto)
        .expect(400);
    });
  });

  describe('Price Estimation', () => {
    it('should estimate price for wheat spraying', async () => {
      const estimateDto = {
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        distanceKm: 5,
        chemicalRequired: true,
      };

      const response = await request(app.getHttpServer())
        .post('/pricing/estimate')
        .set('Authorization', customerToken)
        .send(estimateDto)
        .expect(201);

      expect(response.body).toHaveProperty('estimatedAmount');
      expect(response.body).toHaveProperty('baseRate');
      expect(response.body).toHaveProperty('lineItems');
      expect(response.body.estimatedAmount).toBeGreaterThan(0);
    });

    it('should return different prices for different drone tiers', async () => {
      const basicDto = {
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'basic',
        distanceKm: 5,
        chemicalRequired: true,
      };

      const premiumDto = { ...basicDto, droneTier: 'premium' };

      const basicResponse = await request(app.getHttpServer())
        .post('/pricing/estimate')
        .set('Authorization', customerToken)
        .send(basicDto)
        .expect(201);

      const premiumResponse = await request(app.getHttpServer())
        .post('/pricing/estimate')
        .set('Authorization', customerToken)
        .send(premiumDto)
        .expect(201);

      expect(premiumResponse.body.estimatedAmount).toBeGreaterThan(
        basicResponse.body.estimatedAmount,
      );
    });
  });

  describe('Validation Tests', () => {
    it('should reject booking with past scheduled date', async () => {
      const invalidDto = {
        address: '123 Farm Road',
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        serviceType: 'spraying',
        location: { lat: 30.7333, lng: 76.7794 },
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        distanceKm: 5,
      };

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', customerToken)
        .send(invalidDto)
        .expect(400);
    });

    it('should reject booking with missing required fields', async () => {
      const incompleteDto = {
        address: '123 Farm Road',
        cropType: 'wheat',
      };

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', customerToken)
        .send(incompleteDto)
        .expect(400);
    });

    it('should reject invalid payment method', async () => {
      const invalidPaymentDto = {
        bookingId: bookingId,
        method: 'invalid-method',
      };

      await request(app.getHttpServer())
        .post('/payments/initiate')
        .set('Authorization', pilotToken)
        .send(invalidPaymentDto)
        .expect(400);
    });
  });
});
