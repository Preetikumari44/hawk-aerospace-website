import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { performance } from 'perf_hooks';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Performance Tests - Load & Stress Testing', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    adminToken = 'Bearer mock-admin-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Time Tests', () => {
    it('should respond to dashboard request within 500ms', async () => {
      const start = performance.now();

      await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', adminToken)
        .expect(200);

      const duration = performance.now() - start;
      console.log(`Dashboard response time: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(500);
    });

    it('should list bookings within 300ms', async () => {
      const start = performance.now();

      await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', adminToken)
        .query({ page: 1, limit: 50 })
        .expect(200);

      const duration = performance.now() - start;
      console.log(`List bookings response time: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(300);
    });

    it('should get price estimate within 200ms', async () => {
      const estimateDto = {
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        distanceKm: 5,
        chemicalRequired: true,
      };

      const start = performance.now();

      await request(app.getHttpServer())
        .post('/pricing/estimate')
        .set('Authorization', adminToken)
        .send(estimateDto)
        .expect(201);

      const duration = performance.now() - start;
      console.log(`Price estimate response time: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 10 concurrent dashboard requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/admin/dashboard')
            .set('Authorization', adminToken),
        );

      const start = performance.now();
      const responses = await Promise.all(requests);
      const duration = performance.now() - start;

      console.log(`10 concurrent dashboard requests completed in: ${duration.toFixed(2)}ms`);
      console.log(`Average per request: ${(duration / 10).toFixed(2)}ms`);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(duration).toBeLessThan(2000); // All 10 should complete within 2 seconds
    });

    it('should handle 20 concurrent booking list requests', async () => {
      const requests = Array(20)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/bookings')
            .set('Authorization', adminToken)
            .query({ page: 1, limit: 10 }),
        );

      const start = performance.now();
      const responses = await Promise.all(requests);
      const duration = performance.now() - start;

      console.log(`20 concurrent booking list requests completed in: ${duration.toFixed(2)}ms`);
      console.log(`Average per request: ${(duration / 20).toFixed(2)}ms`);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(duration).toBeLessThan(3000);
    });

    it('should handle 50 concurrent price estimation requests', async () => {
      const estimateDto = {
        cropType: 'wheat',
        areaValue: 10,
        areaUnit: 'hectares',
        droneTier: 'standard',
        distanceKm: 5,
        chemicalRequired: true,
      };

      const requests = Array(50)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/pricing/estimate')
            .set('Authorization', adminToken)
            .send(estimateDto),
        );

      const start = performance.now();
      const responses = await Promise.all(requests);
      const duration = performance.now() - start;

      console.log(`50 concurrent price estimates completed in: ${duration.toFixed(2)}ms`);
      console.log(`Average per request: ${(duration / 50).toFixed(2)}ms`);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Memory & Resource Tests', () => {
    it('should not leak memory with repeated requests', async () => {
      const iterations = 100;
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        await request(app.getHttpServer())
          .get('/admin/dashboard')
          .set('Authorization', adminToken)
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(`Memory increase after ${iterations} requests: ${memoryIncrease.toFixed(2)}MB`);

      // Allow reasonable memory increase (less than 50MB for 100 requests)
      expect(memoryIncrease).toBeLessThan(50);
    });
  });

  describe('Pagination Performance', () => {
    it('should handle large page numbers efficiently', async () => {
      const pageSizes = [10, 50, 100];

      for (const limit of pageSizes) {
        const start = performance.now();

        await request(app.getHttpServer())
          .get('/bookings')
          .set('Authorization', adminToken)
          .query({ page: 1, limit })
          .expect(200);

        const duration = performance.now() - start;
        console.log(`Fetching ${limit} items took: ${duration.toFixed(2)}ms`);

        // Response time should scale reasonably with page size
        expect(duration).toBeLessThan(limit * 5); // 5ms per item max
      }
    });
  });

  describe('Database Query Performance', () => {
    it('should filter bookings by status efficiently', async () => {
      const statuses = ['pending', 'confirmed', 'completed'];

      for (const status of statuses) {
        const start = performance.now();

        await request(app.getHttpServer())
          .get('/bookings')
          .set('Authorization', adminToken)
          .query({ page: 1, limit: 50, status })
          .expect(200);

        const duration = performance.now() - start;
        console.log(`Filter by status '${status}' took: ${duration.toFixed(2)}ms`);

        expect(duration).toBeLessThan(400);
      }
    });

    it('should handle complex revenue queries within acceptable time', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const start = performance.now();

      await request(app.getHttpServer())
        .get('/revenue/dashboard')
        .set('Authorization', adminToken)
        .query({ dateFrom, dateTo })
        .expect(200);

      const duration = performance.now() - start;
      console.log(`Revenue dashboard query (30 days) took: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Stress Test - Gradual Load Increase', () => {
    it('should handle increasing concurrent load gracefully', async () => {
      const loadLevels = [5, 10, 20, 30];
      const results: Array<{ load: number; avgTime: number; successRate: number }> = [];

      for (const load of loadLevels) {
        const requests = Array(load)
          .fill(null)
          .map(() =>
            request(app.getHttpServer())
              .get('/admin/dashboard')
              .set('Authorization', adminToken)
              .then((res) => ({ status: res.status, time: Date.now() }))
              .catch(() => ({ status: 500, time: Date.now() })),
          );

        const start = performance.now();
        const responses = await Promise.all(requests);
        const duration = performance.now() - start;

        const successCount = responses.filter((r) => r.status === 200).length;
        const successRate = (successCount / load) * 100;
        const avgTime = duration / load;

        results.push({ load, avgTime, successRate });

        console.log(
          `Load: ${load} concurrent | Avg time: ${avgTime.toFixed(2)}ms | Success: ${successRate.toFixed(1)}%`,
        );

        // Verify high success rate even under load
        expect(successRate).toBeGreaterThan(95);
      }

      // Verify that average time doesn't degrade too much with load
      const firstAvg = results[0].avgTime;
      const lastAvg = results[results.length - 1].avgTime;
      const degradation = (lastAvg - firstAvg) / firstAvg;

      console.log(`Performance degradation under load: ${(degradation * 100).toFixed(1)}%`);

      // Response time shouldn't degrade more than 300% under 6x load
      expect(degradation).toBeLessThan(3);
    });
  });
});
