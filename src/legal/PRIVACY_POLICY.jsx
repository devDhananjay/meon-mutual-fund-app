import React, {useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import AppColors from '../theme/colors';
import Textstyles from '../utils/text';
import {useAppTheme} from '../theme/useAppTheme';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const {colors} = useAppTheme();
  const onBack = useCallback(() => navigation.goBack(), [navigation]);
  const paragraphs = [
    'Please read our privacy policy carefully before using app operated by Meon.',
    'We collect only the information needed to provide your investment account features, maintain app security, and comply with applicable regulations.',
    'Your data is shared only with regulated partners where necessary to process transactions, mandates, and order execution. We do not sell personal data.',
    'You can contact support if you need clarification or updates regarding personal details and account-related information.',
  ];

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Privacy Policy" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <Text style={[styles.intro, {color: colors.textPrimary}]}>
            Please read our privacy policy carefully before using app operated by Meon.
          </Text>
          <Text style={[styles.updated, {color: colors.textSecondary}]}>Last updated on 23-02-2024</Text>
          {paragraphs.map((line, idx) => (
            <Text key={String(idx)} style={[styles.body, {color: colors.textSecondary}]}>
              {line}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: AppColors.background},
  scroll: {flex: 1},
  content: {paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8},
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  intro: {
    ...Textstyles.medium,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  body: {
    ...Textstyles.normal,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  updated: {
    ...Textstyles.normal,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
});
