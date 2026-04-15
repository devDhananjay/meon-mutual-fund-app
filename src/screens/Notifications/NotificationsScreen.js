import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';
import {navigateToMyOrders} from '../../navigation/navigationRef';
import {useAppTheme} from '../../theme/useAppTheme';
import AppBackButton from '../../components/AppBackButton';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const {colors} = useAppTheme();

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      <View style={[styles.toolbar, {borderBottomColor: colors.border, backgroundColor: colors.card}]}>
        <AppBackButton onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn} />
        <Text style={[Textstyles.heading, styles.title, {color: colors.textPrimary}]}>Notifications</Text>
        <View style={styles.toolbarRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <Text style={[Textstyles.medium, styles.cardTitle, {color: colors.textPrimary}]}>Stay updated</Text>
          <Text style={[Textstyles.normal, styles.cardBody, {color: colors.textSecondary}]}>
            Order confirmations, SIP alerts, and account updates will appear here when available.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.linkRow, {backgroundColor: colors.card, borderColor: colors.border}]}
          onPress={() => navigateToMyOrders(navigation)}
          activeOpacity={0.85}>
          <Text style={[Textstyles.medium, styles.linkLabel, {color: colors.primary}]}>View order activity</Text>
          <Image source={Icons.GoIcon} style={[styles.chevron, {tintColor: colors.textSecondary}]} resizeMode="contain" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F0F2F5'},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
    backgroundColor: Colors.white,
  },
  backBtn: {width: 44, height: 44, justifyContent: 'center', alignItems: 'center'},
  title: {flex: 1, fontSize: 18, textAlign: 'center'},
  toolbarRight: {width: 44},
  scroll: {padding: 16, paddingBottom: 40},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  cardTitle: {fontSize: 16, marginBottom: 8, color: Colors.TEXT_PRIMARY},
  cardBody: {fontSize: 14, color: Colors.GREY, lineHeight: 20},
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  linkLabel: {fontSize: 15, color: Colors.themeBlue},
  chevron: {width: 14, height: 14},
});
