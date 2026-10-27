// MOCK DATA ONLY — used by services/mock/*. Never import from UI code.
import type { Address, Category, Order,Product, Promotion } from '../../types';
export const categories: Category[] = [
  { id: 'fertilizers', name: 'Fertilizers' }, { id: 'equipment', name: 'Farming Equipments' }, { id: 'pesticides', name: 'Pesticides' },
];
const p = (id: string, name: string, category: string, price: number, description: string): Product => ({
  id, name, category, price, description, stock: 99, seller: 'Hawk Aerospace', availability: 'in_stock', specifications: {} });
export const products: Product[] = [
  p('p1', 'BioGrow Pro Organic Fertilizer — All-Crop Formula', 'fertilizers', 2000, '100% natural, slow-release fertilizer for healthier yields and better crop growth.'),
  p('p2', 'NPK Fertilizer 19-19-19', 'fertilizers', 1450, 'Balanced water-soluble nutrition for all crops.'),
  p('p3', 'Organic Fertilizer', 'fertilizers', 2000, 'Natural soil-enriching fertilizer for every season.'),
  p('p4', 'Manual Knapsack Sprayer 16L', 'equipment', 2400, 'Durable 16-litre sprayer with adjustable nozzle.'),
  p('p5', 'Precision Seed Drill (6 row)', 'equipment', 18500, 'Six-row seed drill for uniform sowing.'),
  p('p6', 'Broad Spectrum Pesticide 1L', 'pesticides', 640, 'Effective protection against common crop pests.'),
  p('p7', 'Fungicide Pro Systemic 500ml', 'pesticides', 520, 'Systemic fungicide for blight and mildew control.'),
];
export const promotions: Promotion[] = [
  { id: 'o1', tag: 'AGRI OFFER', title: '10% OFF', subtitle: 'Your First Spray Mission', cta: 'Redeem Now', tone: 'green' },
  { id: 'o2', tag: 'FLEET BONUS', title: '₹500 Credit', subtitle: 'On completing 5 missions this month', cta: 'View Details', tone: 'amber' },
];
export const addresses: Address[] = [
  { id: 'a1', label: 'Home', line: 'CKB Layout, Chandra Layout, Bengaluru 560040' },
  { id: 'a2', label: 'Work', line: 'Hawk Aerospace Hub, Whitefield, Bengaluru 560066' },
];
export const seedOrders = (): Order[] => [{
  id: 'HA-1001', status: 'Out for Delivery', createdAt: new Date(Date.now() - 2 * 864e5).toISOString(), eta: new Date(Date.now() + 864e5).toISOString(), paymentMethod: 'UPI',
  address: addresses[0], items: [{ productId: 'p2', name: products[1].name, qty: 1, unitPrice: 1450 }], totals: { subtotal: 1450, delivery: 100, discount: 0, total: 1550 },
}];
