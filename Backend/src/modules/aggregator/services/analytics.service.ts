import { Injectable, Logger } from '@nestjs/common';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { ROOT_COLLECTIONS } from '../../../common/constants/collection-paths.constant';
import { CacheService } from '../../../common/cache/cache.service';
import type { CurrentUser } from '../../../common/interfaces/current-user.interface';

export interface CustomerLifetimeValue {
  customerId: string;
  customerName: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  firstBookingDate: string;
  lastBookingDate: string;
  daysSinceLastBooking: number;
  predictedNextBooking?: string;
  lifetimeValue: number;
  churnRisk: 'low' | 'medium' | 'high';
  churnScore: number;
}

export interface PredictiveAnalytics {
  aggregatorId: string;
  period: string;
  predictedBookings: number;
  predictedRevenue: number;
  growthRate: number;
  seasonalTrends: Array<{ month: string; predictedBookings: number }>;
  topServices: Array<{ service: string; predictedDemand: number }>;
  confidence: number;
}

export interface ChurnAnalysis {
  totalCustomers: number;
  activeCustomers: number;
  atRiskCustomers: number;
  churnedCustomers: number;
  churnRate: number;
  retentionRate: number;
  customers: Array<{
    customerId: string;
    customerName: string;
    churnRisk: 'low' | 'medium' | 'high';
    churnScore: number;
    daysSinceLastBooking: number;
    recommendedAction: string;
  }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Calculate Customer Lifetime Value (CLV)
   */
  async calculateCustomerLifetimeValue(
    aggregatorId: string,
    customerId?: string,
  ): Promise<CustomerLifetimeValue[]> {
    const cacheKey = `analytics:clv:${aggregatorId}:${customerId || 'all'}`;
    const cached = await this.cacheService.get<CustomerLifetimeValue[]>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Calculating CLV for aggregator: ${aggregatorId}`);

    const db = this.firebaseAdminService.firestore();

    // Get all customers managed by this aggregator
    let customersQuery = db
      .collection(ROOT_COLLECTIONS.users)
      .where('profileData.managedByAggregatorId', '==', aggregatorId);

    if (customerId) {
      customersQuery = customersQuery.where('uid', '==', customerId) as any;
    }

    const customersSnapshot = await customersQuery.get();
    const customerLTVs: CustomerLifetimeValue[] = [];

    for (const customerDoc of customersSnapshot.docs) {
      const customer = customerDoc.data();
      const customerId = customer.uid;

      // Get all bookings for this customer
      const bookingsSnapshot = await db
        .collection(ROOT_COLLECTIONS.delegatedBookings)
        .where('aggregatorId', '==', aggregatorId)
        .where('customerName', '==', customerId)
        .get();

      const bookings = bookingsSnapshot.docs.map((doc) => doc.data());

      if (bookings.length === 0) continue;

      const completedBookings = bookings.filter((b) => b.status === 'completed');
      const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');

      // Calculate revenue
      let totalRevenue = 0;
      for (const booking of completedBookings) {
        const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(booking.bookingId).get();
        if (bookingDoc.exists) {
          const bookingData = bookingDoc.data();
          totalRevenue += bookingData?.finalPrice ?? bookingData?.priceEstimation ?? 0;
        }
      }

      // Sort bookings by date
      const sortedBookings = bookings.sort((a, b) => 
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );

      const firstBookingDate = sortedBookings[0]?.createdAt || new Date().toISOString();
      const lastBookingDate = sortedBookings[sortedBookings.length - 1]?.createdAt || new Date().toISOString();

      const daysSinceLastBooking = Math.floor(
        (Date.now() - new Date(lastBookingDate).getTime()) / (1000 * 60 * 60 * 24),
      );

      // Calculate churn risk
      const { churnRisk, churnScore } = this.calculateChurnRisk(
        daysSinceLastBooking,
        completedBookings.length,
        cancelledBookings.length,
      );

      // Predict next booking
      const predictedNextBooking = this.predictNextBooking(sortedBookings);

      // Calculate CLV (simple model: average booking value * predicted future bookings)
      const averageBookingValue = completedBookings.length > 0 
        ? totalRevenue / completedBookings.length 
        : 0;
      const predictedFutureBookings = this.predictFutureBookings(sortedBookings);
      const lifetimeValue = totalRevenue + (averageBookingValue * predictedFutureBookings);

      customerLTVs.push({
        customerId,
        customerName: customer.name || 'Unknown',
        totalBookings: bookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: cancelledBookings.length,
        totalRevenue,
        averageBookingValue,
        firstBookingDate,
        lastBookingDate,
        daysSinceLastBooking,
        predictedNextBooking,
        lifetimeValue,
        churnRisk,
        churnScore,
      });
    }

    // Sort by lifetime value descending
    customerLTVs.sort((a, b) => b.lifetimeValue - a.lifetimeValue);

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, customerLTVs, 60 * 60 * 1000);

    return customerLTVs;
  }

  /**
   * Perform Churn Analysis
   */
  async analyzeChurn(aggregatorId: string): Promise<ChurnAnalysis> {
    const cacheKey = `analytics:churn:${aggregatorId}`;
    const cached = await this.cacheService.get<ChurnAnalysis>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Analyzing churn for aggregator: ${aggregatorId}`);

    const customerLTVs = await this.calculateCustomerLifetimeValue(aggregatorId);

    const totalCustomers = customerLTVs.length;
    const activeCustomers = customerLTVs.filter((c) => c.daysSinceLastBooking <= 90).length;
    const atRiskCustomers = customerLTVs.filter((c) => c.churnRisk === 'medium' || c.churnRisk === 'high').length;
    const churnedCustomers = customerLTVs.filter((c) => c.daysSinceLastBooking > 180).length;

    const churnRate = totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;
    const retentionRate = 100 - churnRate;

    const customersWithRecommendations = customerLTVs
      .filter((c) => c.churnRisk !== 'low')
      .map((c) => ({
        customerId: c.customerId,
        customerName: c.customerName,
        churnRisk: c.churnRisk,
        churnScore: c.churnScore,
        daysSinceLastBooking: c.daysSinceLastBooking,
        recommendedAction: this.getRecommendedAction(c),
      }))
      .slice(0, 20); // Top 20 at-risk customers

    const analysis: ChurnAnalysis = {
      totalCustomers,
      activeCustomers,
      atRiskCustomers,
      churnedCustomers,
      churnRate: Math.round(churnRate * 100) / 100,
      retentionRate: Math.round(retentionRate * 100) / 100,
      customers: customersWithRecommendations,
    };

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, analysis, 60 * 60 * 1000);

    return analysis;
  }

  /**
   * Generate Predictive Analytics
   */
  async generatePredictiveAnalytics(
    aggregatorId: string,
    period: 'next_month' | 'next_quarter' | 'next_year' = 'next_month',
  ): Promise<PredictiveAnalytics> {
    const cacheKey = `analytics:predictive:${aggregatorId}:${period}`;
    const cached = await this.cacheService.get<PredictiveAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Generating predictive analytics for aggregator: ${aggregatorId}`);

    const db = this.firebaseAdminService.firestore();

    // Get historical bookings (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const bookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorId', '==', aggregatorId)
      .where('createdAt', '>=', oneYearAgo.toISOString())
      .get();

    const bookings = bookingsSnapshot.docs.map((doc) => doc.data());

    // Calculate historical trends
    const monthlyBookings = this.groupByMonth(bookings);
    const growthRate = this.calculateGrowthRate(monthlyBookings);

    // Predict future bookings using linear regression
    const predictedBookings = this.predictFutureBookingsCount(monthlyBookings, period);
    
    // Calculate average booking value
    let totalRevenue = 0;
    let completedCount = 0;
    for (const booking of bookings.filter((b) => b.status === 'completed')) {
      const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(booking.bookingId).get();
      if (bookingDoc.exists) {
        const bookingData = bookingDoc.data();
        totalRevenue += bookingData?.finalPrice ?? bookingData?.priceEstimation ?? 0;
        completedCount++;
      }
    }
    const avgBookingValue = completedCount > 0 ? totalRevenue / completedCount : 0;

    // Predict revenue
    const predictedRevenue = predictedBookings * avgBookingValue;

    // Seasonal trends
    const seasonalTrends = this.calculateSeasonalTrends(monthlyBookings, period);

    // Service demand prediction
    const serviceBreakdown = this.groupByService(bookings);
    const topServices = Object.entries(serviceBreakdown)
      .map(([service, count]) => ({
        service,
        predictedDemand: Math.round(count * (1 + growthRate / 100)),
      }))
      .sort((a, b) => b.predictedDemand - a.predictedDemand)
      .slice(0, 5);

    // Confidence score (based on data quality and consistency)
    const confidence = this.calculatePredictionConfidence(bookings.length, growthRate);

    const analytics: PredictiveAnalytics = {
      aggregatorId,
      period,
      predictedBookings: Math.round(predictedBookings),
      predictedRevenue: Math.round(predictedRevenue),
      growthRate: Math.round(growthRate * 100) / 100,
      seasonalTrends,
      topServices,
      confidence,
    };

    // Cache for 6 hours
    await this.cacheService.set(cacheKey, analytics, 6 * 60 * 60 * 1000);

    return analytics;
  }

  // Helper methods

  private calculateChurnRisk(
    daysSinceLastBooking: number,
    completedBookings: number,
    cancelledBookings: number,
  ): { churnRisk: 'low' | 'medium' | 'high'; churnScore: number } {
    let score = 0;

    // Days since last booking (0-50 points)
    if (daysSinceLastBooking > 180) score += 50;
    else if (daysSinceLastBooking > 90) score += 30;
    else if (daysSinceLastBooking > 60) score += 15;

    // Booking frequency (0-30 points)
    if (completedBookings < 2) score += 30;
    else if (completedBookings < 5) score += 15;

    // Cancellation rate (0-20 points)
    const totalBookings = completedBookings + cancelledBookings;
    if (totalBookings > 0) {
      const cancellationRate = cancelledBookings / totalBookings;
      if (cancellationRate > 0.5) score += 20;
      else if (cancellationRate > 0.3) score += 10;
    }

    // Determine risk level
    let churnRisk: 'low' | 'medium' | 'high';
    if (score >= 70) churnRisk = 'high';
    else if (score >= 40) churnRisk = 'medium';
    else churnRisk = 'low';

    return { churnRisk, churnScore: score };
  }

  private predictNextBooking(bookings: any[]): string | undefined {
    if (bookings.length < 2) return undefined;

    // Calculate average days between bookings
    let totalDays = 0;
    for (let i = 1; i < bookings.length; i++) {
      const prevDate = new Date(bookings[i - 1].createdAt || 0);
      const currDate = new Date(bookings[i].createdAt || 0);
      totalDays += (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    }

    const avgDaysBetweenBookings = totalDays / (bookings.length - 1);
    const lastBookingDate = new Date(bookings[bookings.length - 1].createdAt || Date.now());
    const predictedDate = new Date(lastBookingDate.getTime() + avgDaysBetweenBookings * 24 * 60 * 60 * 1000);

    return predictedDate.toISOString();
  }

  private predictFutureBookings(bookings: any[]): number {
    if (bookings.length === 0) return 0;

    // Simple model: assume customer will book at same frequency for next year
    const monthsSinceFirst = 
      (Date.now() - new Date(bookings[0].createdAt || 0).getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsSinceFirst < 1) return 12; // Assume 12 more bookings for new customers

    const bookingsPerMonth = bookings.length / monthsSinceFirst;
    return Math.round(bookingsPerMonth * 12);
  }

  private getRecommendedAction(customer: CustomerLifetimeValue): string {
    if (customer.churnRisk === 'high') {
      if (customer.daysSinceLastBooking > 180) {
        return 'Re-engagement campaign with special offer';
      }
      return 'Immediate personal outreach with discount';
    }

    if (customer.churnRisk === 'medium') {
      if (customer.daysSinceLastBooking > 90) {
        return 'Send reminder with seasonal promotion';
      }
      return 'Loyalty program enrollment';
    }

    return 'Continue regular communication';
  }

  private groupByMonth(bookings: any[]): Record<string, number> {
    const monthly: Record<string, number> = {};

    for (const booking of bookings) {
      if (!booking.createdAt) continue;
      const month = booking.createdAt.substring(0, 7); // YYYY-MM
      monthly[month] = (monthly[month] || 0) + 1;
    }

    return monthly;
  }

  private calculateGrowthRate(monthlyBookings: Record<string, number>): number {
    const months = Object.keys(monthlyBookings).sort();
    if (months.length < 2) return 0;

    const firstMonth = monthlyBookings[months[0]];
    const lastMonth = monthlyBookings[months[months.length - 1]];

    if (firstMonth === 0) return 0;

    return ((lastMonth - firstMonth) / firstMonth) * 100;
  }

  private predictFutureBookingsCount(
    monthlyBookings: Record<string, number>,
    period: string,
  ): number {
    const values = Object.values(monthlyBookings);
    if (values.length === 0) return 0;

    // Simple average
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    // Apply growth factor
    const growthRate = this.calculateGrowthRate(monthlyBookings);
    const growthFactor = 1 + growthRate / 100;

    let multiplier = 1;
    if (period === 'next_month') multiplier = 1;
    else if (period === 'next_quarter') multiplier = 3;
    else if (period === 'next_year') multiplier = 12;

    return avg * growthFactor * multiplier;
  }

  private calculateSeasonalTrends(
    monthlyBookings: Record<string, number>,
    period: string,
  ): Array<{ month: string; predictedBookings: number }> {
    const months = Object.keys(monthlyBookings).sort();
    const avg = Object.values(monthlyBookings).reduce((a, b) => a + b, 0) / months.length;

    // Calculate seasonal multipliers
    const seasonalMultipliers: Record<string, number> = {};
    for (const month of months) {
      const monthNum = parseInt(month.split('-')[1]);
      const multiplier = monthlyBookings[month] / avg;
      seasonalMultipliers[monthNum.toString()] = multiplier;
    }

    // Generate predictions
    const predictions: Array<{ month: string; predictedBookings: number }> = [];
    const now = new Date();
    const endMonth = period === 'next_month' ? 1 : period === 'next_quarter' ? 3 : 12;

    for (let i = 1; i <= endMonth; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = futureDate.toISOString().substring(0, 7);
      const monthNum = futureDate.getMonth() + 1;
      
      const multiplier = seasonalMultipliers[monthNum.toString()] || 1;
      predictions.push({
        month: monthStr,
        predictedBookings: Math.round(avg * multiplier),
      });
    }

    return predictions;
  }

  private groupByService(bookings: any[]): Record<string, number> {
    const byService: Record<string, number> = {};

    for (const booking of bookings) {
      const service = booking.serviceType || 'unknown';
      byService[service] = (byService[service] || 0) + 1;
    }

    return byService;
  }

  private calculatePredictionConfidence(bookingsCount: number, growthRate: number): number {
    let confidence = 50;

    // More data = higher confidence
    if (bookingsCount > 100) confidence += 30;
    else if (bookingsCount > 50) confidence += 20;
    else if (bookingsCount > 20) confidence += 10;

    // Stable growth = higher confidence
    if (Math.abs(growthRate) < 20) confidence += 20;
    else if (Math.abs(growthRate) < 50) confidence += 10;

    return Math.min(confidence, 95); // Cap at 95%
  }
}
