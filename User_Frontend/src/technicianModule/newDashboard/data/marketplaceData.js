// Marketplace + Popular Products reference data.
// Exact text preserved from the supplied Technician reference material.

export const popularProducts = [
  {
    id: 'biogrow-pro',
    name: 'BioGrow Pro Organic Fertilizer — All-Crop Formula',
    description:
      '100% natural, slow-release fertilizer for healthier yields and ...',
    startingFrom: 2000,
    currency: 'INR',
  },
  {
    id: 'organic-fertilizer',
    name: 'Organic Fertilizer',
    description: 'A elaborative Description of the product',
    startingFrom: 2000,
    currency: 'INR',
  },
];

export const marketplaceCategories = [
  { id: 'fertilizers', label: 'Fertilizers' },
  { id: 'farming-equipments', label: 'Farming Equipments' },
  { id: 'pesticides', label: 'Pesticides' },
];

export const defaultCategory = 'fertilizers';

export const promotion = {
  badge: 'AGRI OFFER',
  discountLabel: '10% OFF',
  title: 'Your First Spray Mission',
  cta: 'Redeem Now',
};

export const supportCard = {
  title: '24x7 Expert Support',
  text: 'Get help from our agricultural drone specialists anytime',
  cta: 'Support',
};

export const deliveryAddress = 'Delivery address unavailable';

export default {
  popularProducts,
  marketplaceCategories,
  defaultCategory,
  promotion,
  supportCard,
  deliveryAddress,
};
