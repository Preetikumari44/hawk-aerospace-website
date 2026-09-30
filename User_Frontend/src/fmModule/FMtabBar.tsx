import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Asset Imports (Using existing matching files inside src/assets/)
import HomeIconActive from '../assets/Home-Active.svg';
import HomeIconInactive from '../assets/Home-Inactive.svg';
import MissionsIconActive from '../assets/Missions-Active.svg';
import MissionsIconInactive from '../assets/Missions-Inactive.svg';
import ResourcesIconActive from '../assets/Missions-Active.svg';
import ResourcesIconInactive from '../assets/Missions-Inactive.svg';
import MarketplaceIconActive from '../assets/MarketPlace-Active.svg';
import MarketplaceIconInactive from '../assets/Marketplace-Inactive.svg';
import AccountIconActive from '../assets/Account-Active.svg';
import AccountIconInactive from '../assets/Account-Inactive.svg';

import { useIsDesktop } from '../utils/responsive';
import { useLanguage } from '../i18n';

interface TabBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const TABS = [
    { id: 'Home', label: 'Home', IconActive: HomeIconActive, IconInactive: HomeIconInactive },
    { id: 'Missions', label: 'Missions', IconActive: MissionsIconActive, IconInactive: MissionsIconInactive },
    { id: 'Resources', label: 'Resources', IconActive: ResourcesIconActive, IconInactive: ResourcesIconInactive },
    { id: 'Marketplace', label: 'Marketplace', IconActive: MarketplaceIconActive, IconInactive: MarketplaceIconInactive },
    { id: 'Account', label: 'Account', IconActive: AccountIconActive, IconInactive: AccountIconInactive },
];

const FleetManagerTabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const isCompact = windowWidth < 380;
    const iconSize = isCompact ? 18 : 20;
    const [tabLayouts, setTabLayouts] = useState<{ [key: string]: { x: number, width: number } }>({});
    const translateX = useRef(new Animated.Value(0)).current;
    const indicatorWidth = useRef(new Animated.Value(0)).current;
    const isDesktop = useIsDesktop();

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

    if (isDesktop) {
        return (
            <View style={desktopStyles.sidebar}>
                <View style={desktopStyles.logoContainer}>
                    <Text style={desktopStyles.logoText}>{t('Drone Ops')}</Text>
                </View>

                <View style={desktopStyles.navContainer}>
                    {TABS.map(({ id, label, IconActive, IconInactive }) => {
                        const isActive = activeTab === id;
                        const CurrentIcon = isActive ? IconActive : IconInactive;

                        return (
                            <TouchableOpacity
                                key={id}
                                onPress={() => onTabChange(id)}
                                style={[desktopStyles.navItem, isActive && isMainTab && desktopStyles.navItemActive]}
                                activeOpacity={0.8}
                            >
                                <CurrentIcon
                                    width={22}
                                    height={22}
                                    color={isActive && isMainTab ? '#0B3A2C' : '#64748B'}
                                />
                                <Text style={[desktopStyles.navLabel, isActive && isMainTab && desktopStyles.navLabelActive]}>
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
        color: '#64748B',
        letterSpacing: 0.2
    },
    labelActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

const desktopStyles = StyleSheet.create({
    sidebar: {
        position: 'absolute', // <--- ADDED
        top: 0,               // <--- ADDED
        bottom: 0,            // <--- ADDED
        left: 0,              // <--- ADDED
        zIndex: 50,           // <--- ADDED
        width: 260,
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0',
        paddingVertical: 24,
        paddingHorizontal: 16
    },
    logoContainer: {
        paddingHorizontal: 16,
        marginBottom: 40
    },
    logoText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B'
    },
    navContainer: {
        flex: 1,
        gap: 8
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 4
    },
    navItemActive: {
        backgroundColor: '#E7F4EC'
    },
    navLabel: {
        fontSize: 16,
        color: '#64748B'
    },
    navLabelActive: {
        color: '#0B3A2C',
        fontWeight: '600'
    },
});

export default FleetManagerTabBar;