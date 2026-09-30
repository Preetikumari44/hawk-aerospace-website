import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
    Image,
} from 'react-native';
import AvatarIcon from '../../assets/Avatar.svg';
import NotificationIcon from '../../assets/notification-icon.svg';
import NotificationBadge from '../../common/NotificationBadge';
import { useIsDesktop } from '../../utils/responsive';
import { useLanguage } from '../../i18n';

interface HeaderProps {
    userName?: string;
    showUser?: boolean;
    onNotification?: () => void;
    unreadCount?: number;
    photoUrl?: string | null;
}

const Header: React.FC<HeaderProps> = ({
    userName = 'Fleet Manager',
    showUser = true,
    onNotification,
    unreadCount = 0,
    photoUrl = null,
}) => {
    const isDesktop = useIsDesktop();
    const { t, locale } = useLanguage();
    const renderAvatar = () => photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
    ) : (
        <AvatarIcon width={44} height={44} style={styles.avatar} />
    );
    if (isDesktop) {
        return (
            <View style={[styles.container, { paddingTop: 24, paddingHorizontal: 40, borderBottomWidth: 0, backgroundColor: 'transparent' }]}>
                <View style={[styles.content, { maxWidth: 1280, width: '100%', marginHorizontal: 'auto' }]}>
                    {showUser && (
                        <View style={styles.userSection}>
                            {renderAvatar()}
                            <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
                        </View>
                    )}
                    <View style={styles.rightActions}>
                        <TouchableOpacity style={styles.notificationBtn} onPress={onNotification}><NotificationIcon width={22} height={22} /><NotificationBadge count={unreadCount} /></TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.content}>
                {showUser && (
                    <View style={styles.userSection}>
                        {renderAvatar()}
                        <Text style={styles.userName} numberOfLines={1}>
                            {userName}
                        </Text>
                    </View>
                )}

                <View style={styles.rightActions}>
                    <TouchableOpacity
                        style={styles.notificationBtn}
                        onPress={onNotification}
                        activeOpacity={0.7}
                    >
                        <NotificationIcon
                            width={22}
                            height={22}
                        />
                        <NotificationBadge count={unreadCount} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ?? 0) - 6,
        paddingBottom: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
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
        width: 44,
        height: 44,
        marginRight: 12,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        backgroundColor: '#E7F4EC',
    },
    userName: {
        fontSize: 22,
        fontFamily: 'Roboto-Medium',
        fontWeight: '500',
        color: '#1E293B',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationBtn: {
        width: 40,
        height: 40,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
});

export default Header;