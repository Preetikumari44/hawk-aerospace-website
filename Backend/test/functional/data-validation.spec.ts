import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Functional Tests - Data Validation', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    authToken = 'Bearer mock-customer-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Booking Validation', () => {
    it('should reject booking with missing required fields', async () => {
      const incompleteDto = {
        address: '123 Farm Road',
        // Missing: cropType, areaValue, etc.
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', authToken)
        .send(incompleteDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should reject booking with invalid crop type', async () => {
      const invalidDto = {
        address: '123 Farm Road',
        cropType: 'invalid-crop',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        serviceType: 'spraying',
        location: { lat: 30.7333, lng: 76.7794 },
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        distanceKm: 5,
      };

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', authToken)
        .send(invalidDto)
        .expect(400);
    });

    it('should reject booking with invalid area value', async () => {
      const invalidDto = {
        address: '123 Farm Road',
        cropType: 'wheat',
        areaValue: -10, // Negative value
        areaUnit: 'hectares',
        droneTier: 'standard',
        serviceType: 'spraying',
        location: { lat: 30.7333, lng: 76.7794 },
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        distanceKm: 5,
      };

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', authToken)
        .send(invalidDto)
        .expect(400);
    });

    it('should reject booking with invalid location coordinates', async () => {
      const invalidDto = {
        address: '123 Farm Road',
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        serviceType: 'spraying',
        location: { lat: 100, lng: 200 }, // Invalid coordinates
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        distanceKm: 5,
      };

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', authToken)
        .send(invalidDto)
        .expect(400);
    });

    it('should reject booking with invalid date format', async () => {
      const invalidDto = {
        address: '123 Farm Road',
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        serviceType: 'spraying',
        location: { lat: 30.7333, lng: 76.7794 },
        scheduledDate: 'not-a-date',
        distanceKm: 5,
      };

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', authToken)
        .send(invalidDto)
        .expect(400);
    });

    it('should reject booking with unknown fields', async () => {
      const dtoWithExtra = {
        address: '123 Farm Road',
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        serviceType: 'spraying',
        location: { lat: 30.7333, lng: 76.7794 },
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        distanceKm: 5,
        unknownField: 'should be rejected', // Extra field
      };

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', authToken)
        .send(dtoWithExtra)
        .expect(400);
    });
  });

  describe('Payment Validation', () => {
    it('should reject payment with invalid method', async () => {
      const invalidDto = {
        bookingId: 'booking123',
        method: 'bitcoin', // Invalid method
      };

      await request(app.getHttpServer())
        .post('/payments/initiate')
        .set('Authorization', 'Bearer mock-pilot-token')
        .send(invalidDto)
        .expect(400);
    });

    it('should validate payment method enum values', async () => {
      const validMethods = ['cash', 'upi', 'wallet'];

      for (const method of validMethods) {
        const dto = {
          bookingId: 'booking123',
          method,
        };

        await request(app.getHttpServer())
          .post('/payments/initiate')
          .set('Authorization', 'Bearer mock-pilot-token')
          .send(dto)
          .expect(201);
      }
    });
  });

  describe('User Validation', () => {
    it('should reject user creation with invalid email', async () => {
      const invalidDto = {
        name: 'Test User',
        email: 'invalid-email',
        phone: '+919876543210',
        role: 'pilot',
      };

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-admin-token')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject user creation with invalid phone number', async () => {
      const invalidDto = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '123', // Too short
        role: 'pilot',
      };

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-admin-token')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject user creation with invalid role', async () => {
      const invalidDto = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+919876543210',
        role: 'super-admin', // Invalid role
      };

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', 'Bearer mock-admin-token')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('Drone Validation', () => {
    it('should reject drone creation with missing specs', async () => {
      const invalidDto = {
        model: 'DJI Agras',
        serialNo: 'AGRAS-001',
        type: 'spraying',
        // Missing specs
      };

      await request(app.getHttpServer())
        .post('/fleet/drones')
        .set('Authorization', 'Bearer mock-vendor-token')
        .send(invalidDto)
        .expect(400);
    });

    it('should validate drone type enum', async () => {
      const invalidDto = {
        model: 'DJI Agras',
        serialNo: 'AGRAS-001',
        type: 'invalid-type',
        specs: { payload: 40, flightTime: 25 },
      };

      await request(app.getHttpServer())
        .post('/fleet/drones')
        .set('Authorization', 'Bearer mock-vendor-token')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('Incident Validation', () => {
    it('should validate incident type', async () => {
      const invalidDto = {
        type: 'unknown-type',
        severity: 'high',
        description: 'Test incident',
        location: { lat: 30.7333, lng: 76.7794 },
      };

      await request(app.getHttpServer())
        .post('/incidents')
        .set('Authorization', 'Bearer mock-pilot-token')
        .send(invalidDto)
        .expect(400);
    });

    it('should validate incident severity', async () => {
      const invalidDto = {
        type: 'drone_malfunction',
        severity: 'extreme', // Invalid severity
        description: 'Test incident',
        location: { lat: 30.7333, lng: 76.7794 },
      };

      await request(app.getHttpServer())
        .post('/incidents')
        .set('Authorization', 'Bearer mock-pilot-token')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('Pagination Validation', () => {
    it('should validate page number is positive', async () => {
      await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', authToken)
        .query({ page: -1, limit: 10 })
        .expect(400);
    });

    it('should validate limit is within bounds', async () => {
      await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', authToken)
        .query({ page: 1, limit: 1000 }) // Too large
        .expect(400);
    });

    it('should accept valid pagination parameters', async () => {
      await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', authToken)
        .query({ page: 1, limit: 50 })
        .expect(200);
    });
  });

  describe('Date Range Validation', () => {
    it('should reject invalid date range (from > to)', async () => {
      const dateFrom = new Date(Date.now()).toISOString();
      const dateTo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

      await request(app.getHttpServer())
        .get('/revenue/dashboard')
        .set('Authorization', 'Bearer mock-admin-token')
        .query({ dateFrom, dateTo })
        .expect(400);
    });

    it('should accept valid date range', async () => {
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date(Date.now()).toISOString();

      await request(app.getHttpServer())
        .get('/revenue/dashboard')
        .set('Authorization', 'Bearer mock-admin-token')
        .query({ dateFrom, dateTo })
        .expect(200);
    });
  });

  describe('String Sanitization', () => {
    it('should sanitize XSS attempts in input', async () => {
      const maliciousDto = {
        address: '<script>alert("XSS")</script>',
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        serviceType: 'spraying',
        location: { lat: 30.7333, lng: 76.7794 },
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        distanceKm: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', authToken)
        .send(maliciousDto)
        .expect(201);

      // Verify script tags are sanitized
      expect(response.body.address).not.toContain('<script>');
    });

    it('should trim whitespace from strings', async () => {
      const dtoWithWhitespace = {
        address: '  123 Farm Road  ',
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        serviceType: 'spraying',
        location: { lat: 30.7333, lng: 76.7794 },
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        distanceKm: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', authToken)
        .send(dtoWithWhitespace)
        .expect(201);

      expect(response.body.address).toBe('123 Farm Road');
    });
  });

  describe('Type Coercion', () => {
    it('should coerce string numbers to numbers', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', authToken)
        .query({ page: '1', limit: '10' }) // Strings instead of numbers
        .expect(200);

      expect(response.body.meta.page).toBe(1); // Coerced to number
      expect(response.body.meta.limit).toBe(10); // Coerced to number
    });
  });
});
