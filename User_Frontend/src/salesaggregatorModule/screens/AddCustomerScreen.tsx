import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useLanguage } from '../../i18n';
import { aggregatorApi } from '../../utils/api';
import { useTabBarPadding } from '../../utils/responsive';

type Mode = 'choose' | 'existing' | 'new';

const normalizeCustomers = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.customers)) return res.customers;
  return [];
};

const getCustomerField = (c: any, ...keys: string[]): string => {
  for (const k of keys) {
    const v = c?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
};

const AddCustomerScreen: React.FC<{ onNavigate?: any, routeParams?: any }> = ({ onNavigate, routeParams }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Existing customers state
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Validation: Name, Mobile (10 digits), Address aur T&C zaroori hain
  const isFormValid = name.trim().length > 0 && mobile.length === 10 && address.trim().length > 0 && isTermsAccepted;

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    setCustomersError('');
    try {
      const res = await aggregatorApi.getCustomers({ limit: 100 });
      setCustomers(normalizeCustomers(res));
    } catch (e: any) {
      setCustomersError(e?.message || t('Could not load customers. Please try again.'));
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    if (mode === 'existing' && customers.length === 0 && !loadingCustomers) {
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const hay = `${getCustomerField(c, 'name')} ${getCustomerField(c, 'phone', 'phoneNumber', 'mobile')} ${getCustomerField(c, 'email')} ${c?.uid || c?.id || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [customers, search]);

  const handleContinue = async () => {
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      // Backend: stage customer details + send OTP to the customer's mobile number
      await aggregatorApi.sendCustomerOtp({
        name: name.trim(),
        phone: `+91${mobile}`,
        address: address.trim(),
        email: email.trim() || undefined,
      });

      if (onNavigate) {
        onNavigate('CustomerOtpVerification', {
          customerMobile: mobile,
          customerDetails: {
            name: name.trim(),
            phone: `+91${mobile}`,
            address: address.trim(),
            email: email.trim() || null,
          },
          // Forward the booking selections so the flow is not lost
          ...(routeParams?.bookingParams || {}),
        });
      }
    } catch (error: any) {
      Alert.alert(t('Error'), error?.message || t('Could not send OTP. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectExisting = () => {
    const c = customers.find((x) => (x?.uid || x?.id) === selectedId);
    if (!c) {
      Alert.alert(t('Select Customer'), t('Please select a customer to continue.'));
      return;
    }
    const customerUid = c?.uid || c?.id;
    const rawPhone = getCustomerField(c, 'phone', 'phoneNumber', 'mobile').replace('+91', '').replace(/\D/g, '').slice(-10);
    const profileAddress = c?.profileData?.address || c?.address || '';
    if (onNavigate) {
      onNavigate('FarmLocationScreen', {
        ...(routeParams?.bookingParams || {}),
        customerUid,
        customerName: getCustomerField(c, 'name'),
        customerPhone: rawPhone || getCustomerField(c, 'phone', 'phoneNumber', 'mobile'),
        customerAddress: typeof profileAddress === 'string' ? profileAddress : getCustomerField(c, 'address'),
        customerEmail: getCustomerField(c, 'email', 'profileData.email') || c?.profileData?.email || '',
      });
    }
  };

  const renderChoice = () => (
    <View>
      <TouchableOpacity style={styles.optionCard} activeOpacity={0.8} onPress={() => setMode('existing')}>
        <View style={styles.optionIcon}>
          <MaterialIcons name="people" size={26} color="#0B3A2C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionTitle}>{t('Add Existing Customer')}</Text>
          <Text style={styles.optionSub}>{t('Choose from previously added customers')}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionCard} activeOpacity={0.8} onPress={() => setMode('new')}>
        <View style={styles.optionIcon}>
          <MaterialIcons name="person-add" size={26} color="#0B3A2C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionTitle}>{t('Add New Customer')}</Text>
          <Text style={styles.optionSub}>{t('Fill the form to add a new customer')}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );

  const renderExisting = () => (
    <View>
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('Search by name, mobile or email')}
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {loadingCustomers ? (
        <ActivityIndicator size="large" color="#0B3A2C" style={{ marginTop: 32 }} />
      ) : customersError ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{customersError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchCustomers}>
            <Text style={styles.retryText}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialIcons name="people-outline" size={40} color="#CBD5E1" />
          <Text style={styles.emptyText}>{t('No customers found. Add a new customer.')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setMode('new')}>
            <Text style={styles.retryText}>{t('Add New Customer')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => String(item?.uid || item?.id || idx)}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const id = String(item?.uid || item?.id || '');
            const selected = selectedId === id;
            const cName = getCustomerField(item, 'name') || t('Unnamed');
            const cPhone = getCustomerField(item, 'phone', 'phoneNumber', 'mobile');
            const cEmail = item?.email || item?.profileData?.email || '';
            return (
              <TouchableOpacity
                style={[styles.customerCard, selected && styles.customerCardSelected]}
                activeOpacity={0.8}
                onPress={() => setSelectedId(id)}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{cName}</Text>
                  {!!cPhone && <Text style={styles.customerMeta}>{cPhone}</Text>}
                  {!!cEmail && <Text style={styles.customerMeta}>{cEmail}</Text>}
                </View>
                <MaterialIcons name="person" size={22} color={selected ? '#0B3A2C' : '#CBD5E1'} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={[styles.continueBtn, selectedId ? styles.continueBtnActive : styles.continueBtnInactive, { marginTop: 24 }]}
        disabled={!selectedId}
        onPress={handleSelectExisting}
        activeOpacity={0.8}
      >
        <Text style={[styles.continueBtnText, styles.continueBtnTextActive]}>{t('Continue with Selected')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNewForm = () => (
    <View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('Customer Name ')}<Text style={styles.asterisk}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder={t('Enter Customer Name')}
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('Customer Mobile Number ')}<Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.mobileRow}>
          <View style={styles.countryCodeBox}>
            <Text style={styles.countryCodeText}>+91</Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color="#5A6478" />
          </View>
          <TextInput
            style={[styles.input, styles.mobileInput]}
            placeholder={t('Enter Customer Mobile Number')}
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={10}
            value={mobile}
            onChangeText={setMobile}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('Customer Address ')}<Text style={styles.asterisk}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder={t('Enter Customer Address')}
          placeholderTextColor="#94A3B8"
          value={address}
          onChangeText={setAddress}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('Customer Email ID')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('Enter Customer Email ID')}
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <TouchableOpacity
        style={styles.checkboxRow}
        activeOpacity={0.8}
        onPress={() => !submitting && setIsTermsAccepted(!isTermsAccepted)}
      >
        <View style={[styles.checkbox, isTermsAccepted && styles.checkboxActive]}>
          {isTermsAccepted && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
        </View>
        <Text style={styles.checkboxText}>
          {t('By Signing I agree to ')}<Text style={styles.linkText}>{t('Terms & Conditions')}</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.continueBtn, isFormValid ? styles.continueBtnActive : styles.continueBtnInactive]}
        disabled={!isFormValid || submitting}
        onPress={handleContinue}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={[styles.continueBtnText, isFormValid ? styles.continueBtnTextActive : styles.continueBtnTextInactive]}>
            {t('Continue')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const headerTitle = mode === 'choose' ? t('Select a Customer') : mode === 'existing' ? t('Existing Customers') : t('New Customer');
  const handleBack = () => {
    if (mode !== 'choose') setMode(mode === 'existing' && customers.length === 0 ? 'choose' : mode === 'new' && false ? 'choose' : mode === 'existing' || mode === 'new' ? 'choose' : 'choose');
    else if (onNavigate) onNavigate('Back');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>

      {mode !== 'choose' && (
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, mode === 'existing' && styles.tabActive]} onPress={() => setMode('existing')}>
            <Text style={[styles.tabText, mode === 'existing' && styles.tabTextActive]}>{t('Existing')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'new' && styles.tabActive]} onPress={() => setMode('new')}>
            <Text style={[styles.tabText, mode === 'new' && styles.tabTextActive]}>{t('New')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>
        {mode === 'choose' && renderChoice()}
        {mode === 'existing' && renderExisting()}
        {mode === 'new' && renderNewForm()}
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#F8FAFC' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 24, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
  tabs: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#E7F4EC', borderRadius: 16, padding: 4, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 14, fontFamily: 'Roboto-Medium', color: '#5A6478' },
  tabTextActive: { color: '#0B3A2C' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 12, gap: 12 },
  optionIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 16, fontFamily: 'Roboto-Medium', color: '#1E293B' },
  optionSub: { fontSize: 13, fontFamily: 'Roboto-Regular', color: '#5A6478', marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 12, height: 52, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1E293B' },
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 14, marginBottom: 10, gap: 12 },
  customerCardSelected: { borderColor: '#0B3A2C', borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#0B3A2C' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0B3A2C' },
  customerName: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#1E293B' },
  customerMeta: { fontSize: 13, fontFamily: 'Roboto-Regular', color: '#5A6478', marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: '#5A6478', textAlign: 'center', fontFamily: 'Roboto-Regular' },
  retryBtn: { backgroundColor: '#E7F4EC', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#0B3A2C', fontFamily: 'Roboto-Medium' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5A6478', marginBottom: 8 },
  asterisk: { color: '#C53030' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 56, fontSize: 15, fontFamily: 'Roboto-Medium', color: '#1E293B' },
  mobileRow: { flexDirection: 'row', gap: 12 },
  countryCodeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 12, height: 56 },
  countryCodeText: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#1E293B', marginRight: 4 },
  mobileInput: { flex: 1 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, marginTop: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxActive: { backgroundColor: '#0B3A2C', borderColor: '#0B3A2C' },
  checkboxText: { fontSize: 14, color: '#5A6478', fontFamily: 'Roboto-Regular' },
  linkText: { textDecorationLine: 'underline', color: '#5A6478', fontFamily: 'Roboto-Medium' },
  continueBtn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  continueBtnInactive: { backgroundColor: '#CBD5E1' },
  continueBtnActive: { backgroundColor: '#0B3A2C' },
  continueBtnText: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '500' },
  continueBtnTextInactive: { color: '#FFFFFF' },
  continueBtnTextActive: { color: '#FFFFFF' }
});

export default AddCustomerScreen;
