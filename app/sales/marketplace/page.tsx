import type { Metadata } from 'next';

import MarketplaceView from '@/components/sales/MarketplaceView';

export const metadata: Metadata = { title: 'Marketplace — Hawk Aerospace Sales Aggregator' };

export default function SalesMarketplacePage() {
  return <MarketplaceView />;
}
