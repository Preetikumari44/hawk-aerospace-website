import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Functional Tests - Authorization & Access Control', () => {
  let app: INestApplication;

  // Mock tokens for different roles
  const tokens = {
    customer: 'Bearer mock-customer-token',
    pilot: 'Bearer mock-pilot-token',
    vendor: 'Bearer mock-vendor-token',
    aggregator: 'Bearer mock-aggregator-token',
    technician: 'Bearer mock-technician-token',
    admin: 'Bearer mock-admin-token',
    subadmin: 'Bearer mock-subadmin-token',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Role-Based Access Control (RBAC)', () => {
    describe('Customer Permissions', () => {
      it('should allow customer to create booking', async () => {
        const bookingDto = {
          address: '123 Farm Road',
          cropType: 'wheat',
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
          .set('Authorization', tokens.customer)
          .send(bookingDto)
          .expect(201);
      });

      it('should allow customer to view own bookings', async () => {
        await request(app.getHttpServer())
          .get('/bookings')
          .set('Authorization', tokens.customer)
          .expect(200);
      });

      it('should deny customer access to admin dashboard', async () => {
        await request(app.getHttpServer())
          .get('/admin/dashboard')
          .set('Authorization', tokens.customer)
          .expect(403);
      });

      it('should deny customer access to fleet management', async () => {
        await request(app.getHttpServer())
          .get('/fleet/drones')
          .set('Authorization', tokens.customer)
          .expect(403);
      });

      it('should deny customer from initiating payment', async () => {
        await request(app.getHttpServer())
          .post('/payments/initiate')
          .set('Authorization', tokens.customer)
          .send({ bookingId: 'test', method: 'cash' })
          .expect(403);
      });
    });

    describe('Pilot Permissions', () => {
      it('should allow pilot to initiate payment', async () => {
        await request(app.getHttpServer())
          .post('/payments/initiate')
          .set('Authorization', tokens.pilot)
          .send({ bookingId: 'booking123', method: 'upi' })
          .expect(201);
      });

      it('should allow pilot to view assigned bookings', async () => {
        await request(app.getHttpServer())
          .get('/bookings')
          .set('Authorization', tokens.pilot)
          .expect(200);
      });

      it('should deny pilot from creating bookings', async () => {
        const bookingDto = {
          address: '123 Farm Road',
          cropType: 'wheat',
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
          .set('Authorization', tokens.pilot)
          .send(bookingDto)
          .expect(403);
      });

      it('should deny pilot access to vendor management', async () => {
        await request(app.getHttpServer())
          .get('/vendors/dashboard')
          .set('Authorization', tokens.pilot)
          .expect(403);
      });
    });

    describe('Vendor Permissions', () => {
      it('should allow vendor to create drones', async () => {
        const droneDto = {
          model: 'DJI Agras T40',
          serialNo: 'AGRAS-001',
          type: 'spraying',
          specs: { payload: 40, flightTime: 25 },
        };

        await request(app.getHttpServer())
          .post('/fleet/drones')
          .set('Authorization', tokens.vendor)
          .send(droneDto)
          .expect(201);
      });

      it('should allow vendor to assign bookings', async () => {
        await request(app.getHttpServer())
          .patch('/bookings/test-booking/assign')
          .set('Authorization', tokens.vendor)
          .send({ pilotId: 'pilot123', droneId: 'drone456' })
          .expect(200);
      });

      it('should allow vendor to view revenue dashboard', async () => {
        await request(app.getHttpServer())
          .get('/vendors/dashboard')
          .set('Authorization', tokens.vendor)
          .expect(200);
      });

      it('should deny vendor from creating users', async () => {
        await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', tokens.vendor)
          .send({ name: 'Test User', role: 'pilot' })
          .expect(403);
      });
    });

    describe('Admin Permissions', () => {
      it('should allow admin to access dashboard', async () => {
        await request(app.getHttpServer())
          .get('/admin/dashboard')
          .set('Authorization', tokens.admin)
          .expect(200);
      });

      it('should allow admin to create users', async () => {
        const userDto = {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+919876543210',
          role: 'pilot',
        };

        await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', tokens.admin)
          .send(userDto)
          .expect(201);
      });

      it('should allow admin to view all bookings', async () => {
        await request(app.getHttpServer())
          .get('/bookings')
          .set('Authorization', tokens.admin)
          .expect(200);
      });

      it('should allow admin to broadcast notifications', async () => {
        const notificationDto = {
          title: 'System Maintenance',
          message: 'Scheduled for tomorrow',
          role: 'pilot',
        };

        await request(app.getHttpServer())
          .post('/notifications/broadcast')
          .set('Authorization', tokens.admin)
          .send(notificationDto)
          .expect(201);
      });

      it('should allow admin to manage incidents', async () => {
        await request(app.getHttpServer())
          .get('/incidents')
          .set('Authorization', tokens.admin)
          .expect(200);
      });
    });

    describe('Aggregator Permissions', () => {
      it('should allow aggregator to create delegated bookings', async () => {
        const bookingDto = {
          address: '123 Farm Road',
          cropType: 'wheat',
          areaValue: 10,
          areaUnit: 'hectares',
          droneTier: 'standard',
          serviceType: 'spraying',
          location: { lat: 30.7333, lng: 76.7794 },
          scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          distanceKm: 5,
          customerUid: 'customer123',
        };

        await request(app.getHttpServer())
          .post('/aggregators/bookings')
          .set('Authorization', tokens.aggregator)
          .send(bookingDto)
          .expect(201);
      });

      it('should allow aggregator to view commission', async () => {
        await request(app.getHttpServer())
          .get('/aggregators/commission')
          .set('Authorization', tokens.aggregator)
          .expect(200);
      });

      it('should deny aggregator from managing fleet', async () => {
        await request(app.getHttpServer())
          .get('/fleet/drones')
          .set('Authorization', tokens.aggregator)
          .expect(403);
      });
    });
  });

  describe('Data Isolation Tests', () => {
    it('customer should only see own bookings', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', tokens.customer)
        .expect(200);

      // All bookings should belong to this customer
      response.body.items.forEach((booking: any) => {
        expect(booking.customerUid).toBe('mock-customer-uid');
      });
    });

    it('pilot should only see assigned bookings', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', tokens.pilot)
        .expect(200);

      // All bookings should be assigned to this pilot
      response.body.items.forEach((booking: any) => {
        expect(booking.assignedPilot).toBe('mock-pilot-uid');
      });
    });

    it('vendor should only see own fleet bookings', async () => {
      const response = await request(app.getHttpServer())
        .get('/vendors/bookings')
        .set('Authorization', tokens.vendor)
        .expect(200);

      // All bookings should belong to this vendor
      response.body.items.forEach((booking: any) => {
        expect(booking.vendorId).toBe('mock-vendor-uid');
      });
    });
  });

  describe('Unauthorized Access Tests', () => {
    it('should reject requests without authentication token', async () => {
      await request(app.getHttpServer()).get('/bookings').expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests with expired token', async () => {
      await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);
    });
  });

  describe('Cross-Role Access Prevention', () => {
    it('should prevent customer from accessing vendor endpoints', async () => {
      await request(app.getHttpServer())
        .get('/vendors/dashboard')
        .set('Authorization', tokens.customer)
        .expect(403);
    });

    it('should prevent pilot from accessing admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', tokens.pilot)
        .expect(403);
    });

    it('should prevent technician from accessing booking creation', async () => {
      const bookingDto = {
        address: '123 Farm Road',
        cropType: 'wheat',
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
        .set('Authorization', tokens.technician)
        .send(bookingDto)
        .expect(403);
    });
  });
});
