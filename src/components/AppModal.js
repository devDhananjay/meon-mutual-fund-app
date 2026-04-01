import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import AppColors from '../theme/colors';
import {radius} from '../theme/radius';
import Textstyles from '../utils/text';

export default function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  isBottomSheet = true,
  showActions = false,
  cancelText = 'Cancel',
  applyText = 'Apply',
  onCancel,
  onApply,
  applyDisabled = false,
  applyLoading = false,
  maxHeight = '88%',
  animationType,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType || (isBottomSheet ? 'slide' : 'fade')}
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, !isBottomSheet && styles.overlayCenter]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.dim} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            !isBottomSheet && styles.centerSheet,
            {maxHeight},
          ]}>
          {isBottomSheet ? <View style={styles.grabber} /> : null}
          {title ? <Text style={[styles.title, Textstyles.heading, {marginVertical: 10}]}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.content}>{children}</View>
          {showActions ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelTextBtn}
                onPress={onCancel || onClose}
                activeOpacity={0.8}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyBtn, applyDisabled && styles.applyBtnDisabled]}
                onPress={onApply}
                activeOpacity={0.9}
                disabled={applyDisabled || applyLoading}>
                <Text style={styles.applyText}>
                  {applyLoading ? 'Please wait...' : applyText}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end'},
  overlayCenter: {justifyContent: 'center', paddingHorizontal: 20},
  dim: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)'},
  sheet: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 12,
    // elevation: 5,
  },
  centerSheet: {
    borderRadius: radius.cardLarge,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    marginHorizontal: 0,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 10,
    marginBottom: 12,
  },
  title: {
    ...Textstyles.heading,
    fontSize: 18,
    color: AppColors.textPrimary,
  },
  subtitle: {
    ...Textstyles.medium,
    marginTop: 6,
    marginBottom: 4,
    color: AppColors.textSecondary,
    fontSize: 13,
  },
  content: {marginTop: 12},
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  cancelTextBtn: {
    flex: 1,
    marginRight: 6,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    ...Textstyles.medium,
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  applyBtn: {
    flex: 1,
    marginLeft: 6,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#2F80ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDisabled: {opacity: 0.65},
  applyText: {...Textstyles.medium, color: '#FFFFFF', fontSize: 15, fontWeight: '500'},
});
