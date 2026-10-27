import type { ReactNode } from 'react';

import SalesSection from '@/components/sales/section';

export default function SalesLayout({ children }: { children: ReactNode }) {
  return <SalesSection>{children}</SalesSection>;
}
