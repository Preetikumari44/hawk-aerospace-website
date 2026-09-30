// Temporary demo product catalog.
// Remove/replace this file once the real products API is available —
// all screens fall back to this list only when the backend returns no products.

const getExpectedDeliveryDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
};

const DEMO_PRODUCTS = [
  {
    productId: 'demo-fert-001',
    productName: 'BioGrow Pro Organic Fertilizer — All-Crop Formula',
    description: '100% natural, slow-release fertilizer for healthier yields and enriched soil',
    shortDescription: 'A elaborative Description of the product',
    category: 'Fertilizers',
    price: 2000,
    startingPrice: 2000,
    rating: '4.6 (2,654)',
    vendorId: 'AgriSupply Co.',
    deliveryDate: getExpectedDeliveryDate(),
  },
  {
    productId: 'demo-fert-002',
    productName: 'Organic Fertilizer',
    description: 'A elaborative Description of the product',
    shortDescription: 'A elaborative Description of the product',
    category: 'Fertilizers',
    price: 2000,
    startingPrice: 2000,
    rating: '4.6 (2,654)',
    vendorId: 'AgriSupply Co.',
    deliveryDate: getExpectedDeliveryDate(),
  },
  {
    productId: 'demo-equip-001',
    productName: 'Precision Field Sprayer Attachment',
    description: 'A elaborative Description of the product',
    shortDescription: 'A elaborative Description of the product',
    category: 'Farming Equipments',
    price: 2000,
    startingPrice: 2000,
    rating: '4.6 (2,654)',
    vendorId: 'AgriSupply Co.',
    deliveryDate: getExpectedDeliveryDate(),
  },
  {
    productId: 'demo-equip-002',
    productName: 'Organic Fertilizer',
    description: 'A elaborative Description of the product',
    shortDescription: 'A elaborative Description of the product',
    category: 'Farming Equipments',
    price: 2000,
    startingPrice: 2000,
    rating: '4.6 (2,654)',
    vendorId: 'AgriSupply Co.',
    deliveryDate: getExpectedDeliveryDate(),
  },
  {
    productId: 'demo-pest-001',
    productName: 'Organic Fertilizer',
    description: 'A elaborative Description of the product',
    shortDescription: 'A elaborative Description of the product',
    category: 'Pesticides',
    price: 2000,
    startingPrice: 2000,
    rating: '4.6 (2,654)',
    vendorId: 'AgriSupply Co.',
    deliveryDate: getExpectedDeliveryDate(),
  },
  {
    productId: 'demo-pest-002',
    productName: 'Organic Fertilizer',
    description: 'A elaborative Description of the product',
    shortDescription: 'A elaborative Description of the product',
    category: 'Pesticides',
    price: 2000,
    startingPrice: 2000,
    rating: '4.6 (2,654)',
    vendorId: 'AgriSupply Co.',
    deliveryDate: getExpectedDeliveryDate(),
  },
];

export default DEMO_PRODUCTS;
