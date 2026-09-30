import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeIcon from './assets/Icons_V02/Icons/home.svg';
import BookingsIcon from './assets/Icons_V02/Icons/bookings.svg';
import MarketplaceIcon from './assets/Icons_V02/Icons/marketplace.svg';
import AccountIcon from './assets/Icons_V02/Icons/account.svg';
import { useLanguage } from '../i18n';

interface TabBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const TABS = [
    { id: 'Home', label: 'Home', IconComponent: HomeIcon },
    { id: 'Bookings', label: 'Bookings', IconComponent: BookingsIcon },
    { id: 'Marketplace', label: 'Marketplace', IconComponent: MarketplaceIcon },
    { id: 'Account', label: 'Account', IconComponent: AccountIcon },
];

const CustomerTabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    // Responsive: compact phones get smaller icons/padding so 4 tabs fit.
    const isCompact = windowWidth < 360;
    const iconSize = isCompact ? 21 : 24;
    const [tabLayouts, setTabLayouts] = useState<{ [key: string]: { x: number, width: number } }>({});
    const translateX = useRef(new Animated.Value(0)).current;
    const indicatorWidth = useRef(new Animated.Value(0)).current;

    // Check if activeTab is one of the main tabs
    const isMainTab = TABS.some(tab => tab.id === activeTab);

    useEffect(() => {
        const currentLayout = tabLayouts[activeTab];
        if (currentLayout && isMainTab) {
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: currentLayout.x,
                    stiffness: 700,
                    damping: 27,
                    mass: 1,
                    useNativeDriver: false,
                }),
                Animated.spring(indicatorWidth, {
                    toValue: currentLayout.width,
                    stiffness: 700,
                    damping: 27,
                    mass: 1,
                    useNativeDriver: false,
                })
            ]).start();
        }
    }, [activeTab, tabLayouts, isMainTab]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleLayout = (id: string, event: LayoutChangeEvent) => {
        const { x, width } = event.nativeEvent.layout;
        setTabLayouts(prev => ({ ...prev, [id]: { x, width } }));
    };

    const tabs = (
        <>
            {TABS.map(({ id, label, IconComponent }) => {
                const isActive = activeTab === id;
                const iconColor = isActive ? '#FFFFFF' : '#6B7280';

                return (
                    <TouchableOpacity
                        key={id}
                        style={styles.tab}
                        onPress={() => onTabChange(id)}
                        activeOpacity={0.8}
                        onLayout={isWeb ? undefined : (e) => handleLayout(id, e)}
                    >
                        <IconComponent width={iconSize} height={iconSize} fill={iconColor} color={iconColor} />

                        <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                            {t(label)}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </>
    );

    // On web the screen content is centered in a phone-width column, so the tab
    // bar must be centered with the same max width to stay aligned. Web keeps the
    // simple pill-per-tab styling (no floating bar / sliding indicator).
    if (isWeb) {
        return (
            <View style={styles.webContainer}>
                <View style={styles.webRow}>
                    {TABS.map(({ id, label, IconComponent }) => {
                        const isActive = activeTab === id;
                        const iconColor = isActive ? '#FFFFFF' : '#6B7280';

                        return (
                            <TouchableOpacity
                                key={id}
                                style={[styles.webTab, isActive && isMainTab && styles.webActiveTab]}
                                onPress={() => onTabChange(id)}
                                activeOpacity={0.8}
                            >
                                <IconComponent width={24} height={24} fill={iconColor} color={iconColor} />

                                <Text style={[styles.webLabel, isActive && isMainTab && styles.labelActive]} numberOfLines={1}>
                                    {t(label)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.fixedWrapper, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8) }]}>
            <View style={styles.container}>
                {isMainTab && Object.keys(tabLayouts).length === TABS.length && (
                    <Animated.View style={[
                        styles.slidingPill,
                        {
                            transform: [{ translateX }],
                            width: indicatorWidth
                        }
                    ]} />
                )}

                {tabs}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Fixed (docked) bottom bar: full-width, flush to the screen bottom on
    // Android/iOS, with safe-area padding. No floating margins or rounded card.
    fixedWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E4E3EA',
        elevation: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },
    container: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingTop: 8,
        paddingHorizontal: 4,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    slidingPill: {
        position: 'absolute',
        top: 8,    // match container paddingTop
        bottom: 0,
        left: 0,
        backgroundColor: '#5060D3',
        borderRadius: 22,
    },
    webContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingTop: 4,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#E4E3EA',
        elevation: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    webRow: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 800,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    webTab: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 28,
    },
    webActiveTab: {
        backgroundColor: '#5060D3',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    webLabel: {
        fontSize: 11,
        fontFamily: 'Roboto-Medium',
        color: '#5F606D',
        letterSpacing: 0.2,
    },
    tab: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 28,
        zIndex: 2,
    },
    label: {
        fontSize: 10,
        fontFamily: 'Roboto-Medium',
        color: '#5F606D',
        letterSpacing: 0.2,
    },
    labelActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default CustomerTabBar;
