import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeIconActive from '../assets/Home-Active.svg';
import HomeIconInactive from '../assets/Home-Inactive.svg';

import MissionsIconActive from '../assets/Missions-Active.svg';
import MissionsIconInactive from '../assets/Missions-Inactive.svg';

import EarningsIconActive from '../assets/Earnings-Active.svg';
import EarningsIconInactive from '../assets/Earnings-Inactive.svg';

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
    { id: 'Missions', label: 'Missions', IconActive: MissionsIconActive, IconInactive: MissionsIconInactive },
    { id: 'Earnings', label: 'Earnings', IconActive: EarningsIconActive, IconInactive: EarningsIconInactive },
    { id: 'Marketplace', label: 'Marketplace', IconActive: MarketplaceIconActive, IconInactive: MarketplaceIconInactive },
    { id: 'Account', label: 'Account', IconActive: AccountIconActive, IconInactive: AccountIconInactive },
];

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const isCompact = windowWidth < 380;
    const iconSize = isCompact ? 18 : 20;
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

    return (
        <View style={[styles.fixedWrapper, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8) }]}>
            <View style={styles.container}>
                {/* Make sure TABS matches the name of your array above.
                    If your array is called something else, update it here.
                */}
                {isMainTab && Object.keys(tabLayouts).length === TABS.length && (
                    <Animated.View style={[
                        styles.slidingPill,
                        {
                            transform: [{ translateX }],
                            width: indicatorWidth
                        }
                    ]} />
                )}

                {TABS.map(({ id, label, IconActive, IconInactive }) => {
                    const isActive = activeTab === id;
                    const CurrentIcon = isActive ? IconActive : IconInactive;

                    return (
                        <TouchableOpacity
                            key={id}
                            onLayout={(e) => handleLayout(id, e)}
                            style={styles.tab}
                            onPress={() => onTabChange(id)}
                            activeOpacity={0.8}
                        >
                            <CurrentIcon
                                width={iconSize}
                                height={iconSize}
                            />
                            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                                {t(label)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
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
        paddingTop: 8,
        paddingHorizontal: 2,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    slidingPill: {
        position: 'absolute',
        top: 8,
        bottom: 0,
        left: 0,
        backgroundColor: '#0B3A2C',
        borderRadius: 22,
    },
    tab: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        paddingHorizontal: 2,
        zIndex: 2, // Keeps text/icon above the sliding background
    },
    label: {
        fontSize: 10,
        fontFamily: 'Roboto-Medium',
        color: '#5A6478',
        letterSpacing: 0.2
    },
    labelActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default TabBar;