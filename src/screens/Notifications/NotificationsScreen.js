import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import {navigateToMyOrders} from '../../navigation/navigationRef';

export default function NotificationsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={[Textstyles.heading, styles.title]}>Notifications</Text>
        <View style={styles.toolbarRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={[Textstyles.medium, styles.cardTitle]}>Stay updated</Text>
          <Text style={[Textstyles.normal, styles.cardBody]}>
            Order confirmations, SIP alerts, and account updates will appear here when available.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigateToMyOrders(navigation)}
          activeOpacity={0.85}>
          <Text style={[Textstyles.medium, styles.linkLabel]}>View order activity</Text>
          <Text style={styles.chevron}>›</Text>
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
    backgroundColor: Colors.white,
  },
  backBtn: {width: 44, height: 44, justifyContent: 'center', alignItems: 'center'},
  backTxt: {fontSize: 28, color: Colors.TEXT_PRIMARY, fontWeight: '300'},
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
  chevron: {fontSize: 22, color: Colors.GREY},
});
