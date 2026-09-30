import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
} from 'react-native';
import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import SupportCard from '../components/SupportCard';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { customerApi, aggregatorApi, couponApi, paymentApi } from '../../utils/api';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';
import { getExpectedDeliveryDate } from '../../utils/locationFormat';
import { findServiceEntry } from '../../utils/servicePricing';
import { useCart } from '../store/cartStore';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const SLOT_HOUR_MAP = {
  Morning: 8,
  Evening: 14,
  Night: 19,
};

const SPRAYING_SUBTYPE_MAP = {
  'Fertilizer Spraying': 'fertilizer_spraying',
  'Pesticides Spraying': 'pesticide_spraying',
  'Insecticides Spraying': 'insecticide_spraying',
  'Herbicides Spraying': 'herbicide_spraying',
  'Fungicides Spraying': 'fungicide_spraying',
  'Growth Regulator Spraying': 'growth_regulator_spraying',
  'Micronutrient Spraying': 'micronutrient_spraying',
  'Organic Spraying': 'organic_spraying',
};

const normalizeSprayingSubType = (selectedSubService) => {
  if (!selectedSubService) {
    return 'fertilizer_spraying';
  }

  return (
    SPRAYING_SUBTYPE_MAP[selectedSubService] ||
    String(selectedSubService)
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') ||
    'fertilizer_spraying'
  );
};

const buildScheduledDate = (routeParams) => {
  const selectedDate = routeParams?.scheduledDate;
  const selectedSlot = routeParams?.selectedSlots?.[0] || 'Morning';
  const hour = SLOT_HOUR_MAP[selectedSlot] ?? SLOT_HOUR_MAP.Morning;

  if (typeof selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
    const date = new Date(`${selectedDate}T${String(hour).padStart(2, '0')}:00:00`);

    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) {
      return date.toISOString();
    }

    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(hour, 0, 0, 0);
    return fallback.toISOString();
  }

  if (selectedDate) {
    const parsed = new Date(selectedDate);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
      return parsed.toISOString();
    }
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(hour, 0, 0, 0);
  return fallback.toISOString();
};

const buildBookingPayload = (routeParams) => {
  const serviceType = routeParams?.serviceType || 'spraying';
  const serviceDetails = {};
  const normalizedScheduledDate = buildScheduledDate(routeParams);
  const specialInstructions = routeParams?.instructions?.trim();

  if (specialInstructions) {
    serviceDetails.specialInstructions = specialInstructions;
  }

  if (serviceType === 'spraying') {
    serviceDetails.sprayingSubType = normalizeSprayingSubType(routeParams?.subService);
    if (serviceDetails.sprayingSubType === 'precision_spraying') {
      serviceDetails.unit = 'per_acre';
      serviceDetails.quantity = Number(routeParams?.areaValue || 1);
    }
  }

  if (serviceType === 'monitoring') {
    serviceDetails.monitoringSubType = routeParams?.monitoringSubType || 'crop_health_monitoring';
    serviceDetails.unit = routeParams?.unit || 'per_acre';
    serviceDetails.quantity = Number(routeParams?.quantity ?? routeParams?.areaValue ?? 1);
  }

  if (serviceType === 'mapping') {
    const mappingEntry = findServiceEntry('mapping', routeParams?.mappingType);
    serviceDetails.mappingType =
      mappingEntry?.label || routeParams?.mappingType || 'Basic Aerial Mapping';
    serviceDetails.unit = 'per_acre';
    serviceDetails.quantity = Number(routeParams?.areaValue ?? 1);
  }

  if (serviceType === 'surveillance') {
    const surveillanceEntry = findServiceEntry(
      'surveillance',
      routeParams?.surveillanceKey || routeParams?.subService,
    );
    if (surveillanceEntry) {
      serviceDetails.surveillanceType = surveillanceEntry.label;
      serviceDetails.unit = surveillanceEntry.defaultUnit || 'per_visit';
      serviceDetails.quantity = Number(routeParams?.surveillanceQuantity || 1);
    }
  }

  if (serviceType === 'videography') {
    const videoEntry = findServiceEntry('videography', routeParams?.eventType || routeParams?.subService);
    if (videoEntry) {
      const eventLabel = videoEntry.label;
      serviceDetails.videographyType = eventLabel;
      serviceDetails.eventType = eventLabel;
      serviceDetails.unit = videoEntry.defaultUnit || 'min';
      serviceDetails.quantity = Number(
        routeParams?.videographyQuantity || (videoEntry.defaultUnit === 'min' ? 30 : 1),
      );
    }
  }

  const payload = {
    address: routeParams?.address || 'Selected booking location',
    detailedAddress: routeParams?.detailedAddress || undefined,
    areaValue: Number(routeParams?.areaValue || 1),
    areaUnit: routeParams?.areaUnit || 'acre',
    cropType: String(routeParams?.cropType || 'other').trim() || 'other',
    serviceType,
    serviceDetails: Object.keys(serviceDetails).length ? serviceDetails : undefined,
    location: routeParams?.location || { lat: 28.4595, lng: 77.0266 },
    scheduledDate: normalizedScheduledDate,
  };

  if (serviceType === 'delivery') {
    return {
      ...payload,
      dropoffLocation: routeParams?.dropoffLocation || routeParams?.location || { lat: 28.4595, lng: 77.0266 },
      serviceDetails: {
        ...serviceDetails,
        contents: routeParams?.contents || routeParams?.subService || 'Agricultural goods',
        weightKg: Number(routeParams?.weightKg || 1),
      },
    };
  }

  return payload;
};

const AddressFields = ({ address, onChange, disabled, t }) => (
  <View style={styles.addressSection}>
    <Text style={styles.addressHeading}>{t('Address Line 1')} *</Text>
    <TextInput
      style={styles.addressInput}
      placeholder={t('House / Flat / Building / Street')}
      placeholderTextColor="#9CA3AF"
      value={address.addressLine1}
      onChangeText={(v) => onChange({ ...address, addressLine1: v })}
      editable={!disabled}
    />

    <Text style={styles.addressHeading}>{t('Address Line 2')}</Text>
    <TextInput
      style={styles.addressInput}
      placeholder={t('Area / Landmark (Optional)')}
      placeholderTextColor="#9CA3AF"
      value={address.addressLine2}
      onChangeText={(v) => onChange({ ...address, addressLine2: v })}
      editable={!disabled}
    />

    <View style={styles.addressRow}>
      <View style={styles.addressCol}>
        <Text style={styles.addressHeading}>{t('City')} *</Text>
        <TextInput
          style={styles.addressInput}
          placeholder={t('City')}
          placeholderTextColor="#9CA3AF"
          value={address.city}
          onChangeText={(v) => onChange({ ...address, city: v })}
          editable={!disabled}
        />
      </View>
      <View style={styles.addressCol}>
        <Text style={styles.addressHeading}>{t('State')} *</Text>
        <TextInput
          style={styles.addressInput}
          placeholder={t('State')}
          placeholderTextColor="#9CA3AF"
          value={address.state}
          onChangeText={(v) => onChange({ ...address, state: v })}
          editable={!disabled}
        />
      </View>
    </View>

    <Text style={styles.addressHeading}>{t('Pincode')} *</Text>
    <TextInput
      style={styles.addressInput}
      placeholder={t('Pincode')}
      placeholderTextColor="#9CA3AF"
      value={address.pincode}
      onChangeText={(v) => onChange({ ...address, pincode: v })}
      keyboardType="number-pad"
      maxLength={10}
      editable={!disabled}
    />
  </View>
);

const OPTIONS = {
  marketplace: [
    { id: 'cod', label: 'Pay via Cash', desc: 'Pay in cash on delivery', icon: '💵' },
    { id: 'gateway', label: 'Pay Online', desc: 'Netbanking, Cards, UPI', icon: '💳' },
  ],
  service: [
    { id: 'cash', label: 'Pay via Cash', desc: 'Pay in cash at the time of service', icon: '💵' },
    { id: 'gateway', label: 'Payment Gateway', desc: 'Netbanking, Cards, UPI', icon: '💳' },
  ],
};

// Mirrors the server-side discount formula so the UI preview always matches the charged amount.
const computeItemDiscount = (subtotal, coupon) => {
  if (!coupon) return 0;
  if (coupon.discountType === 'percentage') {
    let discount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }
    return Math.max(0, Math.min(discount, subtotal));
  }
  return Math.max(0, Math.min(coupon.discountValue, subtotal));
};

const itemSubtotal = (product, quantity) =>
  Number(product?.price || product?.startingPrice || 0) * (quantity || 1);

const PaymentSelectionScreen = ({ onNavigate, routeParams }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const mode = routeParams?.mode || 'marketplace';
  const serviceType = routeParams?.serviceType;
  const isSpraying = mode === 'service' && serviceType === 'spraying';
  // When paying an already-created pending order from Order Details, only the
  // online option is offered and the stored order total is charged as-is.
  const existingOrder = routeParams?.existingOrder || null;
  const options = existingOrder
    ? OPTIONS.marketplace
    : OPTIONS[mode === 'service' ? 'service' : 'marketplace'];
  const [selected, setSelected] = useState(existingOrder ? 'gateway' : null);
  // New service-booking flow: the user lands here BEFORE the booking is created.
  // Payment method is captured and finalized only after the booking is created in
  // WeatherForecastCheckScreen.
  const isServiceFlow =
    mode === 'service' && !routeParams?.bookingId && !existingOrder;
  const nextServiceScreen = 'FlyingRestrictionCheckScreen';
  const [processing, setProcessing] = useState(false);
  const { clearCart } = useCart();

  // Billing/Delivery address state
  const [billingAddress, setBillingAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [deliveryAddress, setDeliveryAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const isAddressValid = (addr) =>
    addr.addressLine1.trim() &&
    addr.city.trim() &&
    addr.state.trim() &&
    addr.pincode.trim();

  // Pre-fill from booking/order details if available
  useEffect(() => {
    if (mode === 'service') {
      const details =
        routeParams?.billingAddress ||
        routeParams?.detailedAddress ||
        routeParams?.booking?.detailedAddress ||
        null;
      if (details) {
        setBillingAddress({
          addressLine1: details.addressLine1 || '',
          addressLine2: details.addressLine2 || '',
          city: details.city || '',
          state: details.state || '',
          pincode: details.pincode || '',
        });
      }
    }
    if (mode !== 'service' && routeParams?.deliveryAddress) {
      setDeliveryAddress(routeParams.deliveryAddress);
    }
  }, []);

  const grossTotal = existingOrder
    ? Number(existingOrder.price || 0)
    : Number(routeParams?.total || 0);

  // ── Coupon state ──
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  // Fetch coupons visible to this user's role (only after checkout → PaymentSelectionScreen).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await couponApi.available();
        if (!cancelled) setAvailableCoupons(Array.isArray(res) ? res : []);
      } catch (e) {
        // Non-blocking — coupon entry still works via manual code.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const computedDiscount =
    !appliedCoupon || existingOrder
      ? 0
      : routeParams?.source === 'cart'
        ? (routeParams.items || []).reduce(
            (sum, item) => sum + computeItemDiscount(itemSubtotal(item.product, item.quantity), appliedCoupon),
            0,
          )
        : computeItemDiscount(grossTotal, appliedCoupon);
  const discountedTotal = Math.max(0, Math.round(grossTotal - computedDiscount));

  const applyCouponCode = async (code) => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await couponApi.validate(cleanCode, grossTotal);
      const data = res ?? {};
      setAppliedCoupon({
        code: cleanCode,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxDiscountAmount: data.coupon?.maxDiscountAmount,
        discount: data.discount,
        finalAmount: data.finalAmount,
      });
      setCouponInput(cleanCode);
    } catch (error) {
      setAppliedCoupon(null);
      const message = error?.message || t('Invalid coupon code');
      setCouponError(message);
      Alert.alert(t('Invalid Coupon'), message);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleCopyCoupon = (code) => {
    Clipboard.setString(code);
    setCouponInput(code);
    applyCouponCode(code);
    Alert.alert(t('Coupon Copied'), t('Coupon code copied and applied.'));
  };

  const buildOrderPayload = (product, quantity, subtotal, paymentMethod) => {
    const cleanAddress = {
      addressLine1: (deliveryAddress?.addressLine1 || '').trim(),
      addressLine2: (deliveryAddress?.addressLine2 || '').trim(),
      city: (deliveryAddress?.city || '').trim(),
      state: (deliveryAddress?.state || '').trim(),
      pincode: (deliveryAddress?.pincode || '').trim(),
    };

    const locationString = cleanAddress.addressLine1
      ? `${cleanAddress.addressLine1}${cleanAddress.addressLine2 ? ', ' + cleanAddress.addressLine2 : ''}, ${cleanAddress.city}, ${cleanAddress.state} - ${cleanAddress.pincode}`
      : '';

    const payload = {
      productId: product?.productId || product?.id || 'unknown',
      productName: product?.productName || product?.title || 'Marketplace Product',
      price: appliedCoupon
        ? Math.max(0, Math.round(subtotal - computeItemDiscount(subtotal, appliedCoupon)))
        : subtotal,
      vendorUid: product?.vendorUid || product?.vendorId || 'marketplace',
      deliveryLocation: locationString,
      deliveryAddress: cleanAddress,
      deliveryDate: product?.deliveryDate || getExpectedDeliveryDate(),
      paymentMethod: paymentMethod === 'gateway' ? 'gateway' : 'cod',
    };
    if (appliedCoupon?.code) {
      payload.couponCode = appliedCoupon.code;
      payload.originalPrice = subtotal;
    }
    return payload;
  };

  const navigateToResult = (orderData) => {
    if (isServiceFlow) {
      // New booking flow: Payment happens after booking creation; pass method forward.
      onNavigate(nextServiceScreen, {
        ...routeParams,
        paymentMethod: selected === 'gateway' ? 'online' : 'cash',
        couponCode: appliedCoupon?.code || routeParams?.couponCode,
      });
    } else if (mode === 'service' && routeParams?.bookingId) {
      // Existing booking payment completed - go to confirmation screen
      onNavigate('BookingConfirmationScreen', {
        ...routeParams,
        paymentMode: selected,
      });
    } else if (!existingOrder && routeParams?.source === 'cart') {
      clearCart();
      onNavigate('YourOrdersScreen');
    } else {
      onNavigate('OrderDetailsScreen', {
        orderId: orderData?.orderId || existingOrder?.orderId,
        order: orderData || null,
      });
    }
  };

  const handleCODCheckout = async () => {
    // New service-booking flow: capture cash intent, finalize after creation.
    if (isServiceFlow) {
      setProcessing(true);
      try {
        navigateToResult();
      } finally {
        setProcessing(false);
      }
      return;
    }
    // Skip billing address validation for spraying service type
    if (mode === 'service' && !isSpraying && !isAddressValid(billingAddress)) {
      Alert.alert(t('Missing Information'), t('Please fill in the billing address (Address Line 1, City, State, Pincode)'));
      return;
    }
    if (mode !== 'service' && !isAddressValid(deliveryAddress)) {
      Alert.alert(t('Missing Information'), t('Please fill in the delivery address (Address Line 1, City, State, Pincode)'));
      return;
    }
    setProcessing(true);
    try {
      if (mode === 'service') {
        if (routeParams?.bookingId) {
          await customerApi.completePayment(routeParams.bookingId, {
            method: 'cash',
            couponCode: appliedCoupon?.code,
            billingAddress,
          });
        }
        navigateToResult();
        return;
      }

      if (routeParams?.source === 'cart') {
        const items = routeParams?.items || [];
        if (!items.length) {
          navigateToResult();
          return;
        }
        for (const item of items) {
          const product = item.product;
          const subtotal = itemSubtotal(product, item.quantity);
          await customerApi.createOrder(
            buildOrderPayload(product, item.quantity, subtotal, selected),
          );
        }
      } else {
        const product = routeParams?.product;
        const quantity = routeParams?.quantity || 1;
        const subtotal = itemSubtotal(product, quantity);
        const order = await customerApi.createOrder(
          buildOrderPayload(product, quantity, subtotal, selected),
        );
        navigateToResult(order);
        return;
      }
      navigateToResult();
    } catch (error) {
      console.error('Order creation failed', error);
      const message = error?.message || t('Unable to create order. Please try again.');
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert(t('Order Failed'), message);
      }
    } finally {
      setProcessing(false);
    }
  };

  const showPaymentAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const startGatewayPayment = async () => {
    // Skip billing address validation for spraying service type
    if (mode === 'service' && !isSpraying && !isAddressValid(billingAddress)) {
      Alert.alert(t('Missing Information'), t('Please fill in the billing address (Address Line 1, City, State, Pincode)'));
      return;
    }
    if (mode !== 'service' && !isAddressValid(deliveryAddress)) {
      Alert.alert(t('Missing Information'), t('Please fill in the delivery address (Address Line 1, City, State, Pincode)'));
      return;
    }
    setProcessing(true);

    // If this is a new service booking flow (booking not created in DB yet),
    // create the booking first, then proceed to Razorpay checkout.
    if (isServiceFlow) {
      try {
        const isAggregatorFlow = !!routeParams?.customerUid || !!routeParams?.isAggregator;
        const payload = buildBookingPayload(routeParams);
        const createResponse = isAggregatorFlow
          ? await aggregatorApi.createBooking({ ...payload, customerUid: routeParams.customerUid })
          : await customerApi.createBooking(payload);

        const createdBooking = createResponse?.booking ?? createResponse;
        if (!createdBooking?.id) {
          throw new Error('Booking was created but no booking ID was returned.');
        }

        // Step 2: Create Razorpay Order for this booking
        const rzpOrder = await paymentApi.createRazorpayOrder({
          bookingId: createdBooking.id,
          couponCode: appliedCoupon?.code,
        });

        // Step 3: Open Razorpay Checkout modal
        const result = await openRazorpayCheckout({
          key: rzpOrder.keyId,
          orderId: rzpOrder.orderId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency || 'INR',
          description: 'Service booking payment',
        });

        // Step 4: Verify Payment server-side
        const paymentPayload = {
          method: 'gateway',
          couponCode: appliedCoupon?.code,
          billingAddress,
          payment: {
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
            razorpaySignature: result.razorpay_signature,
          },
        };

        if (isAggregatorFlow) {
          await aggregatorApi.completePayment(createdBooking.id, paymentPayload);
        } else {
          await customerApi.completePayment(createdBooking.id, paymentPayload);
        }

        // Step 5: Payment succeeded! Now proceed to flight restriction & weather check
        onNavigate('FlyingRestrictionCheckScreen', {
          ...routeParams,
          booking: createdBooking,
          bookingId: createdBooking.id,
          paymentMethod: 'online',
          paymentStatus: 'completed',
          couponCode: appliedCoupon?.code || routeParams?.couponCode,
        });
        return;
      } catch (error) {
        console.error('[Razorpay] Service online payment failed or cancelled:', error);
        const message =
          error?.description ||
          error?.message ||
          (typeof error === 'string' ? error : t('Online payment was not completed.'));
        showPaymentAlert(t('Payment Incomplete'), message);
        return;
      } finally {
        setProcessing(false);
      }
    }
    if (mode !== 'service' && !isAddressValid(deliveryAddress)) {
      Alert.alert(t('Missing Information'), t('Please fill in the delivery address (Address Line 1, City, State, Pincode)'));
      return;
    }
    setProcessing(true);
    // Marketplace orders created in THIS session. If the payment does not go
    // through, they are removed again so no unpaid order is ever "booked".
    const createdOrderIds = [];
    let createdOrder = null;
    let verifiedOrders = null;
    try {
      // ── Step 1: Marketplace — create the local order(s) first.
      // They stay "pending" until the Razorpay payment is verified server-side.
      if (mode !== 'service' && !existingOrder) {
        if (routeParams?.source === 'cart') {
          const items = routeParams?.items || [];
          if (!items.length) {
            navigateToResult();
            return;
          }
          for (const item of items) {
            const product = item.product;
            const subtotal = itemSubtotal(product, item.quantity);
            const order = await customerApi.createOrder(
              buildOrderPayload(product, item.quantity, subtotal, 'gateway'),
            );
            createdOrderIds.push(order?.orderId || order?.id);
          }
        } else {
          const product = routeParams?.product;
          const quantity = routeParams?.quantity || 1;
          const subtotal = itemSubtotal(product, quantity);
          createdOrder = await customerApi.createOrder(
            buildOrderPayload(product, quantity, subtotal, 'gateway'),
          );
          createdOrderIds.push(createdOrder?.orderId || createdOrder?.id);
        }
      }

      // ── Step 2: Create the Razorpay order (amount is computed server-side).
      const rzpOrder =
        mode === 'service'
          ? await paymentApi.createRazorpayOrder({
              bookingId: routeParams.bookingId,
              couponCode: appliedCoupon?.code,
            })
          : await paymentApi.createRazorpayOrder({
              orderIds: existingOrder ? [existingOrder.orderId] : createdOrderIds,
            });

      // ── Step 3: Open the real Razorpay payment page.
      const result = await openRazorpayCheckout({
        key: rzpOrder.keyId,
        orderId: rzpOrder.orderId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || 'INR',
        description:
          mode === 'service' ? 'Service booking payment' : 'Marketplace order payment',
      });

      // ── Step 4: Verify the payment server-side and mark paid / complete booking.
      if (mode === 'service') {
        const isAggregatorFlow = !!routeParams?.customerUid || !!routeParams?.isAggregator;
        const paymentPayload = {
          method: 'gateway',
          couponCode: appliedCoupon?.code,
          billingAddress,
          payment: {
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
            razorpaySignature: result.razorpay_signature,
          },
        };
        if (isAggregatorFlow) {
          await aggregatorApi.completePayment(routeParams.bookingId, paymentPayload);
        } else {
          await customerApi.completePayment(routeParams.bookingId, paymentPayload);
        }
      } else {
        const verifyRes = await paymentApi.verifyMarketplacePayment({
          orderIds: existingOrder ? [existingOrder.orderId] : createdOrderIds,
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        });
        verifiedOrders = Array.isArray(verifyRes?.orders) ? verifyRes.orders : null;
      }

      // ── Step 5: Payment confirmed — navigate to the success screen.
      navigateToResult(verifiedOrders?.[0] || createdOrder);
    } catch (error) {
      // Full technical details go to the console for debugging.
      console.error(
        '[Razorpay] Online payment failed:',
        JSON.stringify(
          {
            message: error?.message,
            code: error?.code,
            reason: error?.reason,
            source: error?.source,
            step: error?.step,
            metadata: error?.metadata,
            stack: error?.stack,
          },
          null,
          2,
        ),
      );

      // Payment never completed → remove any orders created in this session so
      // the customer is not left with a booked-but-unpaid order.
      if (createdOrderIds.length > 0) {
        await paymentApi
          .abandonMarketplaceOrders(createdOrderIds)
          .catch((cleanupError) =>
            console.error('Failed to clean up unpaid orders', cleanupError),
          );
      }

      const cancelled = error?.message === 'PAYMENT_CANCELLED';
      const title = cancelled ? t('Payment Cancelled') : t('Payment Failed');
      const message = cancelled
        ? t('You closed the payment page. Nothing was charged.')
        : t(
            'We could not complete your payment. Please try again or use a different payment method.',
          );
      showPaymentAlert(title, message);
    } finally {
      setProcessing(false);
    }
  };

  const handleProceed = () => {
    if (!selected || processing) return;

    if (selected === 'gateway') {
      startGatewayPayment();
    } else {
      handleCODCheckout();
    }
  };

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Back')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>
          {mode === 'service' ? t('Payment Method') : t('Select Payment Option')}
        </Text>
      </View>

      <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          {mode === 'service'
            ? t('Choose how you would like to pay for this service')
            : t('Choose how you would like to pay for your order')}
        </Text>

        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <Pressable
              key={opt.id}
              style={[styles.optionCard, selected === opt.id && styles.optionCardSelected]}
              onPress={() => !processing && setSelected(opt.id)}
            >
              <Text style={styles.optionIcon}>{opt.icon}</Text>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionLabel, selected === opt.id && styles.optionLabelSelected]}>
                  {t(opt.label)}
                </Text>
                <Text style={styles.optionDesc}>{t(opt.desc)}</Text>
              </View>
              <View style={[styles.radio, selected === opt.id && styles.radioSelected]}>
                {selected === opt.id && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          ))}
        </View>

        {!existingOrder && (
        <View style={styles.couponSection}>
          <Text style={styles.couponHeading}>{t('Apply Coupon')}</Text>

            {availableCoupons.length > 0 && (
              <>
                <Text style={styles.availableHeading}>{t('Available for you')}</Text>
                <View style={styles.availableWrap}>
                  {availableCoupons.map((c) => (
                    <Pressable
                      key={c.id}
                      style={styles.couponChip}
                      onPress={() => handleCopyCoupon(c.code)}
                    >
                      <Text style={styles.couponChipText}>{c.label}</Text>
                      <Text style={styles.couponChipCode}>
                        {c.code} · {t('tap to copy')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <View style={styles.couponInputRow}>
              <TextInput
                style={styles.couponInput}
                placeholder={t('Enter coupon code')}
                placeholderTextColor="#9CA3AF"
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {appliedCoupon ? (
                <Pressable style={[styles.couponButton, styles.couponRemoveButton]} onPress={removeCoupon}>
                  <Text style={styles.couponRemoveText}>{t('Remove')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.couponButton,
                    (!couponInput.trim() || applyingCoupon) && styles.couponButtonDisabled,
                  ]}
                  onPress={() => applyCouponCode(couponInput)}
                  disabled={!couponInput.trim() || applyingCoupon}
                >
                  {applyingCoupon ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.couponButtonText}>{t('Apply')}</Text>
                  )}
                </Pressable>
              )}
            </View>

            {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}

            {appliedCoupon && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('Subtotal')}</Text>
                  <Text style={styles.summaryValue}>₹ {grossTotal}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('Coupon discount')}</Text>
                  <Text style={styles.summaryDiscount}>− ₹ {computedDiscount}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.summaryTotalLabel}>{t('Total')}</Text>
                  <Text style={styles.summaryTotalValue}>₹ {discountedTotal}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {existingOrder && (
          <View style={styles.summaryBox}>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.summaryTotalLabel}>{t('Amount to Pay')}</Text>
              <Text style={styles.summaryTotalValue}>₹ {discountedTotal}</Text>
            </View>
          </View>
        )}

        {/* ── Billing / Delivery Address ── */}
        {mode === 'service' && !isSpraying ? (
          <View style={styles.addressCard}>
            <Text style={styles.addressCardTitle}>{t('Billing Address')}</Text>
            <Text style={styles.addressCardSubtitle}>{t('Required for service booking')}</Text>
            <AddressFields
              address={billingAddress}
              onChange={setBillingAddress}
              disabled={processing}
              t={t}
            />
          </View>
        ) : mode !== 'service' ? (
          <View style={styles.addressCard}>
            <Text style={styles.addressCardTitle}>{t('Delivery Address')}</Text>
            <Text style={styles.addressCardSubtitle}>{t('Required for marketplace order')}</Text>
            <AddressFields
              address={deliveryAddress}
              onChange={setDeliveryAddress}
              disabled={processing}
              t={t}
            />
          </View>
        ) : null}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {mode === 'service'
              ? t('Cash payments are collected on-site. Online payments are securely processed via Razorpay.')
              : t('COD orders will be processed after delivery. Online payments are securely processed via Razorpay.')}
          </Text>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.proceedButton, (!selected || processing) && styles.proceedButtonDisabled]}
            onPress={handleProceed}
            disabled={!selected || processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.proceedButtonText}>
                {selected === 'gateway' || existingOrder ? t('Proceed to Payment') :
                 mode === 'service' ? t('Confirm Booking') : t('Confirm Order')}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.supportWrapper}>
          <SupportCard onNavigate={onNavigate} />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  heading: { marginLeft: 16, fontSize: 20, fontWeight: '700', color: '#2F3542' },
  content: { //paddingHorizontal: 20, 
    paddingBottom: 28
  },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20, paddingHorizontal: 20 },
  optionsContainer: { gap: 16 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F5F6FF',
  },
  optionIcon: { fontSize: 28, marginRight: 16 },
  optionTextContainer: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  optionLabelSelected: { color: COLORS.primary },
  optionDesc: { fontSize: 13, color: '#6B7280' },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioSelected: { borderColor: COLORS.primary },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
  },
  couponSection: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginHorizontal: 20
  },
  couponHeading: { fontSize: 16, fontWeight: '700', color: '#2F3542', marginBottom: 12 },
  availableHeading: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  availableWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  couponChip: {
    backgroundColor: '#F5F6FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  couponChipText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  couponChipCode: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  couponInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#111827',
  },
  couponButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponButtonDisabled: { opacity: 0.5 },
  couponButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  couponRemoveButton: { backgroundColor: '#FEE2E2' },
  couponRemoveText: { fontSize: 15, fontWeight: '700', color: '#B91C1C' },
  couponError: { fontSize: 13, color: '#DC2626', marginTop: 8 },
  summaryBox: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 8,
    marginHorizontal: 20
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  summaryDiscount: { fontSize: 14, fontWeight: '700', color: '#059669' },
  summaryTotalRow: { marginTop: 4 },
  summaryTotalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  summaryTotalValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  infoBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginHorizontal: 20
  },
  infoText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  addressCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginHorizontal: 20,
  },
  addressCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F3542',
    marginBottom: 4,
  },
  addressCardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
  },
  addressSection: {
    gap: 8,
  },
  addressHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
    marginTop: 4,
  },
  addressInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addressCol: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  proceedButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proceedButtonDisabled: { opacity: 0.5 },
  proceedButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  supportWrapper: {
    marginTop: 16,
    paddingBottom: 10
  },
});

export default PaymentSelectionScreen;
