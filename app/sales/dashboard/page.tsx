import type { Metadata } from 'next';

import SalesDashboard from '@/components/sales/SalesDashboard';

export const metadata: Metadata = { title: 'Dashboard — Hawk Aerospace Sales Aggregator' };

export default function SalesDashboardPage() {
  return <SalesDashboard />;
}
