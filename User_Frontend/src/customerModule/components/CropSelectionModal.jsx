import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import CrossIcon from '../assets/Icons_V02/Icons/CrossIcon.svg';

import COLORS from '../constants/colors';
import { useLanguage } from '../../i18n';

const CropSelectionModal = ({ visible, onClose, crops, selectedCrop, onSelectCrop }) => {
  const { t, locale } = useLanguage();
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      {/* Background Dim Overlay */}
      <View style={styles.overlay}>
        
        {/* Main Bottom Sheet */}
        <View style={styles.bottomSheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('Select your Crop')}</Text>
            <Pressable onPress={onClose} style={styles.closeHitbox}>
              {/* <MaterialIcons name="close" size={24} color="#374151" /> */}
              <CrossIcon width={24} height={24} />
            </Pressable>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.listContainer}
          >
            {crops.map((crop) => {
              const isSelected = crop === selectedCrop;
              
              return (
                <Pressable
                  key={crop}
                  // 🔥 Agar selected hai toh blue background add hoga
                  style={[styles.cropItem, isSelected && styles.selectedCropItem]}
                  onPress={() => {
                    onSelectCrop(crop);
                    onClose(); // Option click hote hi modal band ho jayega
                  }}
                >
                  <Text style={[styles.cropText, isSelected && styles.selectedCropText]}>
                    {t(crop)}
                  </Text>
                  
                  {/* 🔥 Radio button toggle logic */}
                  <MaterialIcons
                    name={isSelected ? "radio-button-checked" : "radio-button-unchecked"}
                    size={24}
                    color={isSelected ? COLORS.primary : "#9CA3AF"}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Dim background
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%', 
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6', // Subtle separator line
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeHitbox: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  cropItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 4,
  },
  // 🔥 Selected item ka background color (Figma match)
  selectedCropItem: {
    backgroundColor: '#EBEBFF', // Light purple/blue color matching Figma
  },
  cropText: {
    fontSize: 16,
    // color: '#4B5563',
    fontWeight: '500',
  },
  // 🔥 Selected text ka color
  selectedCropText: {
    // color: COLORS.primary,
    fontWeight: '600',
  },
});

export default CropSelectionModal;