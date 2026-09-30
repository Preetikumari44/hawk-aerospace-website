import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { chatApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

interface SupportCardProps {
  onNavigate?: (screen: string, params?: any) => void;
}

const SupportCard: React.FC<SupportCardProps> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const handleSupport = useCallback(async () => {
        if (!onNavigate) {
            console.warn('[SupportCard] onNavigate not provided');
            return;
        }
        try {
            const conversation = await chatApi.createConversation({
                participantUid: 'admin',
                participantRole: 'admin',
                type: 'support',
            });
            if (conversation?.id) {
                onNavigate('ChatScreen', { conversationId: conversation.id, type: 'support' });
            } else {
                Alert.alert(t('Error'), t('Could not start support chat. Please try again.'));
            }
        } catch (error) {
            console.error('[SupportCard] Failed to open support chat:', error);
            Alert.alert(t('Error'), t('Could not reach support right now. Please try again.'));
        }
    }, [onNavigate, t]);

    return (
        <View style={styles.expertCard}>
            <View style={styles.expertLeft}>
                <Text style={styles.expertTitle}>{t('24x7 Expert Support')}</Text>
                <Text style={styles.expertSub}>{t('Get help from our agricultural drone specialists anytime')}</Text>
                <TouchableOpacity style={styles.expertSupportBtn} activeOpacity={0.85} onPress={handleSupport}>
                    <Text style={styles.expertSupportBtnText}>{t('Support →')}</Text>
                </TouchableOpacity>
            </View>
            <Image source={require('../../assets/support.png')} style={styles.expertPhoneImage} resizeMode="contain" />
        </View>
    );
};

const styles = StyleSheet.create({
    expertCard: { backgroundColor: '#5A6478', borderRadius: 28, padding: 26, marginVertical: 8, flexDirection: 'row', justifyContent: 'space-between', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16 },
    expertLeft: { flex: 1, paddingRight: 16 },
    expertTitle: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#FFFFFF', marginBottom: 6 },
    expertSub: { fontSize: 14, fontFamily: 'Roboto-Regular', color: 'rgba(255,255,255,0.85)', lineHeight: 20, marginBottom: 18 },
    expertSupportBtn: { backgroundColor: '#FFFFFF', borderRadius: 100, paddingHorizontal: 22, paddingVertical: 12, alignSelf: 'flex-start' },
    expertSupportBtnText: { fontSize: 15, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5A6478' },
    expertPhoneImage: { width: 74, height: 74 },
});

export default SupportCard;