import type { Metadata } from 'next';

import CommissionView from '@/components/sales/CommissionView';

export const metadata: Metadata = { title: 'Commission — Hawk Aerospace Sales Aggregator' };

export default function SalesCommissionPage() {
  return <CommissionView />;
}
