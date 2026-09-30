import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, Image } from 'react-native';
import { useLanguage } from '../../i18n';

// Asset Imports
import AvatarIcon from '../../assets/Avatar.svg';
import NotificationIcon from '../../assets/notification-icon.svg';
import NotificationBadge from '../../common/NotificationBadge';

interface TechnicianHeaderProps {
    userName?: string;
    onNotification?: () => void;
    onMorePress?: () => void;
    unreadCount?: number;
    photoUrl?: string | null;
}

const TechnicianHeader: React.FC<TechnicianHeaderProps> = ({
    userName = 'Manohar Rao',
    onNotification,
    onMorePress,
    unreadCount = 0,
    photoUrl = null,
}) => {
    const { t, locale } = useLanguage();
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.content}>
                <View style={styles.userSection}>
                    {photoUrl ? (
                        <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                    ) : (
                        <AvatarIcon width={48} height={48} style={styles.avatar} />
                    )}
                    <Text style={styles.userName} numberOfLines={1}>
                        {userName}
                    </Text>
                </View>

                <View style={styles.rightActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={onNotification} activeOpacity={0.7}>
                        <NotificationIcon width={22} height={22} fill="#1E293B" />
                        <NotificationBadge count={unreadCount} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconBtn} onPress={onMorePress} activeOpacity={0.7}>
                        {/* 3-dots can be rendered with text/circles safely or an option icon if available */}
                        <Text style={styles.dotsText}>⋮</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ?? 0) + 12,
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        marginRight: 12,
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        backgroundColor: '#E7F4EC',
    },
    userName: {
        fontSize: 22,
        fontFamily: 'Roboto-Medium',
        fontWeight: '600',
        color: '#1E293B',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    dotsText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: -4,
    },
});

export default TechnicianHeader;