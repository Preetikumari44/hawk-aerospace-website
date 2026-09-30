import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeIconActive from '../assets/Home-Active.svg';
import HomeIconInactive from '../assets/Home-Inactive.svg';
import BookingsIconActive from '../assets/Missions-Active.svg';
import BookingsIconInactive from '../assets/Missions-Inactive.svg';
import CommissionIconActive from '../assets/Earnings-Active.svg';
import CommissionIconInactive from '../assets/Earnings-Inactive.svg';
import MarketplaceIconActive from '../assets/MarketPlace-Active.svg';
import MarketplaceIconInactive from '../assets/Marketplace-Inactive.svg';
import AccountIconActive from '../assets/Account-Active.svg';
import AccountIconInactive from '../assets/Account-Inactive.svg';

import { useLanguage } from '../i18n';

interface TabBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const TABS = [
    { id: 'Home', label: 'Home', IconActive: HomeIconActive, IconInactive: HomeIconInactive },
    { id: 'Bookings', label: 'Bookings', IconActive: BookingsIconActive, IconInactive: BookingsIconInactive },
    { id: 'Commission', label: 'Commission', IconActive: CommissionIconActive, IconInactive: CommissionIconInactive },
    { id: 'Marketplace', label: 'Marketplace', IconActive: MarketplaceIconActive, IconInactive: MarketplaceIconInactive },
    { id: 'Account', label: 'Account', IconActive: AccountIconActive, IconInactive: AccountIconInactive },
];

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isCompact = windowWidth < 380;
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
            {TABS.map(({ id, label, IconActive, IconInactive }) => {
                const isActive = activeTab === id;
                const iconColor = isActive ? '#FFFFFF' : '#64748B';

                return (
                    <TouchableOpacity
                        key={id}
                        style={styles.tab}
                        onPress={() => onTabChange(id)}
                        activeOpacity={0.8}
                        onLayout={isWeb ? undefined : (e) => handleLayout(id, e)}
                    >
                        {isActive ? (
                            <IconActive width={iconSize} height={iconSize} fill={iconColor} color={iconColor} />
                        ) : (
                            <IconInactive width={iconSize} height={iconSize} fill={iconColor} color={iconColor} />
                        )}

                        <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                            {t(label)}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </>
    );

    if (isWeb) {
        return (
            <View style={styles.webContainer}>
                <View style={styles.webRow}>
                    {TABS.map(({ id, label, IconActive, IconInactive }) => {
                        const isActive = activeTab === id;
                        const iconColor = isActive ? '#FFFFFF' : '#64748B';

                        return (
                            <TouchableOpacity
                                key={id}
                                style={[styles.webTab, isActive && isMainTab && styles.webActiveTab]}
                                onPress={() => onTabChange(id)}
                                activeOpacity={0.8}
                            >
                                {isActive ? (
                                    <IconActive width={24} height={24} fill={iconColor} color={iconColor} />
                                ) : (
                                    <IconInactive width={24} height={24} fill={iconColor} color={iconColor} />
                                )}

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
    // Fixed (docked) bottom bar: full-width, flush to the screen bottom.
    fixedWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        elevation: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },
    container: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingTop: 6,
        paddingHorizontal: 2,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    slidingPill: {
        position: 'absolute',
        top: 6,
        bottom: 0,
        left: 0,
        backgroundColor: '#0B3A2C',
        borderRadius: 20,
    },
    webContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingTop: 4,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
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
        gap: 2,
        paddingVertical: 6,
        paddingHorizontal: 6,
        borderRadius: 20,
    },
    webActiveTab: {
        backgroundColor: '#0B3A2C',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    webLabel: {
        fontSize: 9,
        fontFamily: 'Roboto-Medium',
        color: '#5A6478',
        letterSpacing: 0.1,
    },
    tab: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        paddingVertical: 6,
        paddingHorizontal: 2,
        borderRadius: 20,
        zIndex: 2,
    },
    label: {
        fontSize: 9,
        fontFamily: 'Roboto-Medium',
        color: '#5A6478',
        letterSpacing: 0.1,
    },
    labelActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default TabBar;
