import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
} from 'react-native';

import COLORS from '../constants/colors';
import PromoCard from '../../pilotModule/components/PromoCard';
import ReferAndEarnCard from '../../components/ReferAndEarnCard';
import SupportCard from '../components/SupportCard';
import ScreenContainer from '../components/ScreenContainer';
import ClockIcon from '../assets/Icons_V02/Icons/ClockIcon.svg';
import SearchIcon from '../assets/Icons_V02/Icons/SearchIcon.svg';
import CheckIcon from '../assets/Icons_V02/Icons/CheckIcon.svg';
import CartIcon from '../../assets/Icons/SVG/Light/CartIcon.svg';
import {
  customerApi,
  getSession,
  mapsApi,
  normalizeFrontendRole,
  aggregatorApi,
  technicianApi,
  pilotApi,
} from '../../utils/api';
import { getCityDistrictLocation } from '../../utils/locationFormat';
import DEMO_PRODUCTS from '../constants/demoProducts';
import { useCart } from '../store/cartStore';
import { useLanguage } from '../../i18n';

const categoryFromProduct = (product) =>
  product.category || product.productCategory || product.type || 'Marketplace';

const MarketplaceScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const { items: cartItems, count: cartCount, addToCart, updateCartQuantity } = useCart();
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  const showToast = (message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const getProductId = (product) => product.productId || product.id;
  const getQtyInCart = (product) => {
    const id = getProductId(product);
    const found = cartItems.find((item) => (item.product.productId || item.product.id) === id);
    return found ? found.quantity : 0;
  };

  const handleAddFirst = (product) => {
    addToCart(product, 1);
    showToast(t('Added to cart'));
  };

  useEffect(() => {
    let disposed = false;

    const fetchMarketplaceData = async () => {
      try {
        const [productResponse, session] = await Promise.all([
          customerApi.getProducts().catch(() => []),
          getSession(),
        ]);

        const apiItems = Array.isArray(productResponse) ? productResponse : [];
        const items = apiItems.length ? apiItems : DEMO_PRODUCTS;
        if (!disposed) {
          setProducts(items);
          if (items.length && !selectedCategory) {
            setSelectedCategory(categoryFromProduct(items[0]));
          }
        }

        const sessionUser = session?.user || null;
        let currentUser = sessionUser;

        // Fetch user profile from backend based on role
        try {
          const role = normalizeFrontendRole(sessionUser?.primaryRole || sessionUser?.role);
          let profile = null;
          if (role === 'sales') {
            profile = await aggregatorApi.getProfile().catch(() => null);
          } else if (role === 'technician') {
            profile = await technicianApi.getProfile().catch(() => null);
          } else if (role === 'pilot') {
            profile = await pilotApi.getProfile().catch(() => null);
          } else {
            profile = await customerApi.getCurrentUser().catch(() => null);
          }
          if (profile) {
            currentUser = { ...sessionUser, ...profile };
          }
        } catch (e) {
          console.warn('Could not fetch role profile for marketplace address', e);
        }

        if (!disposed) {
          setUser(currentUser);
        }

        // Format user location string (town, city - e.g. Mumbra, Thane)
        const rawAddr =
          routeParams?.updatedAddress ||
          currentUser?.profileData?.address ||
          currentUser?.address ||
          currentUser?.profileData?.region ||
          currentUser?.profileData?.state ||
          '';

        const clean = getCityDistrictLocation(rawAddr);
        if (clean && !clean.includes('undefined')) {
          if (!disposed) setDeliveryAddress(clean);
        } else {
          // If no clean text address exists, check coordinates and reverse geocode
          const loc = currentUser?.profileData?.location || currentUser?.location;
          const lat = Number(loc?.lat ?? loc?.latitude);
          const lng = Number(loc?.lng ?? loc?.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            mapsApi
              .reverseGeocode(lat, lng)
              .then((result) => {
                if (disposed) return;
                const rawFormatted =
                  result?.data?.formattedAddress ||
                  result?.formattedAddress ||
                  result?.data?.address ||
                  result?.address ||
                  '';
                const addressComps =
                  result?.data?.addressComponents || result?.addressComponents || [];
                const parsed = getCityDistrictLocation(rawFormatted, addressComps) || rawFormatted;
                if (parsed) setDeliveryAddress(parsed);
              })
              .catch(() => { });
          }
        }
      } catch (error) {
        console.error('Failed to load marketplace data', error);
      }
    };

    fetchMarketplaceData();
    return () => {
      disposed = true;
    };
  }, [routeParams?.updatedAddress]);

  const categories = useMemo(
    () => Array.from(new Set(products.map(categoryFromProduct))).filter(Boolean),
    [products],
  );

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = !selectedCategory || categoryFromProduct(product) === selectedCategory;
      const haystack = `${product.productName || ''} ${product.description || ''}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, search, selectedCategory]);

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 10, paddingBottom: 85 }}>
        <View style={styles.header}>
          <View style={styles.locationSection}>
            <View style={styles.locationTextContainer}>
              <Text style={styles.deliveryLabel}>{t('Delivering to')}</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {deliveryAddress || user?.address || user?.profileData?.region || t('Delivery address unavailable')}
              </Text>
            </View>
          </View>

          <View style={styles.headerIcons}>
            <Pressable onPress={() => onNavigate('CartScreen')} style={styles.cartIconWrapper}>
              <CartIcon width={24} height={24} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.order} onPress={() => onNavigate('YourOrdersScreen')}>
              <ClockIcon width={24} height={24} />
              <Text style={styles.actionText}>{t('Order History')}</Text>
            </Pressable>
          </View>
        </View>

        {/*<Text style={styles.greeting}>{t('Welcome back, {{name}}', { name: user?.name || t('Customer') })}</Text>*/}
        <Text style={styles.heading}>{t('Marketplace Products')}</Text>

        <View style={styles.searchContainer}>
          <TextInput
            placeholder={t('Search products')}
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          <SearchIcon width={24} height={24} />
        </View>

        {/*<View style={styles.actionRow}>
          <Pressable style={styles.actionButton} onPress={() => onNavigate('YourOrdersScreen')}>
            <ClockIcon width={18} height={18} />
            <Text style={styles.actionText}>{t('Order History')}</Text>
          </Pressable>
        </View>*/}

        <Text style={styles.sectionTitle}>{t('Select Categories')}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12 }}>
          {categories.map((category) => (
            <Pressable
              key={category}
              style={selectedCategory === category ? styles.activeCategory : styles.inactiveCategory}
              onPress={() => setSelectedCategory(category)}
            >
              <View style={styles.categoryContent}>
                {selectedCategory === category && <CheckIcon width={16} height={16} style={styles.checkIcon} />}
                <Text style={selectedCategory === category ? styles.activeCategoryText : styles.inactiveCategoryText}>
                  {t(category)}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.productsContainer}>
          {visibleProducts.map((product) => (
            <Pressable
              key={product.productId || product.id}
              style={styles.productCard}
              onPress={() => onNavigate('ProductDetailsScreen', { product })}
            >
              <Image
                source={require('../assets/images/fertilizer.png')}
                style={styles.productImage}
                resizeMode="cover"
              />

              <View style={styles.productInfo}>
                <View>
                  <Text style={styles.productTitle}>{product.productName || t('Marketplace Product')}</Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description || product.shortDescription || t('Product details from marketplace API')}
                  </Text>
                </View>

                <View style={styles.bottomSection}>
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceLabel}>{t('Starting from')}</Text>
                    <Text style={styles.price}>{t('INR {{price}}', { price: product.price || 0 })}</Text>
                  </View>

                  {getQtyInCart(product) === 0 ? (
                    <Pressable
                      style={styles.cartButton}
                      onPress={() => handleAddFirst(product)}
                    >
                      <Text style={styles.cartButtonText}>{t('Add to Cart')}</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.counterButton}>
                      <Pressable
                        style={styles.counterBtn}
                        onPress={() => updateCartQuantity(getProductId(product), getQtyInCart(product) - 1)}
                      >
                        <Text style={styles.counterBtnText}>-</Text>
                      </Pressable>
                      <Text style={styles.counterQty}>{getQtyInCart(product)}</Text>
                      <Pressable
                        style={styles.counterBtn}
                        onPress={() => updateCartQuantity(getProductId(product), getQtyInCart(product) + 1)}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))}

          {!visibleProducts.length && (
            <View style={styles.emptyState}>
              <Text style={styles.productTitle}>{t('No products available')}</Text>
              <Text style={styles.productDescription}>{t('Marketplace data from the backend will appear here.')}</Text>
            </View>
          )}
        </View>

        <View style={styles.promoSection}>
          <Text style={styles.sectionTitle}>{t('Promotions & Offers')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
          >
            <ReferAndEarnCard layout="carousel" onPress={() => onNavigate('ReferAndEarnScreen')} />
            {[1, 2, 3].map((_, index) => (
              <PromoCard key={index} layout="carousel" />
            ))}
          </ScrollView>
        </View>
        <SupportCard onNavigate={onNavigate} />
      </ScrollView>
      {toast !== '' && (
        <View style={styles.toastOverlay} pointerEvents="none">
          <View style={styles.toastBubble}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </View>
      )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  locationTextContainer: {
    marginLeft: 6,
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  cartIconWrapper: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  order: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  greeting: {
    marginTop: 24,
    marginHorizontal: 20,
    fontSize: 14,
    color: '#6B7280',
  },
  heading: {
    marginHorizontal: 20,
    fontSize: 20,
    fontWeight: '700',
    color: '#2F3542',
    marginTop: 2,
  },
  searchContainer: {
    marginVertical: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 12,
  },
  sectionTitle: {
    //marginTop: 28,
    marginHorizontal: 20,
    //marginBottom: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#2F3542',
  },
  inactiveCategory: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
  },
  activeCategory: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: 6,
  },
  inactiveCategoryText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  productsContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  promoSection: {
    paddingTop: 8,
    gap: 12,
    marginBottom: 22,
  },
  productCard: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  productImage: {
    width: 130,
    height: 120,
    borderRadius: 16,
  },
  productInfo: {
    flex: 1,
    marginLeft: 14,
    height: 120,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  productDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceBlock: {
    flexDirection: 'column',
  },
  priceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 2,
  },
  cartButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cartButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  counterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 18,
  },
  counterQty: {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
    color: '#374151',
  },
  toastOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: 'center',
    zIndex: 10,
  },
  toastBubble: {
    backgroundColor: '#111827',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    padding: 16,
  },
});

export default MarketplaceScreen;