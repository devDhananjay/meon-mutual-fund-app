import React, {useMemo, useState, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import AppColors from '../theme/colors';
import Textstyles from '../utils/text';
import {useAppTheme} from '../theme/useAppTheme';
import {useSupportLocale} from '../hooks/useSupportLocale';
import {getArticleI18n, getSupportUi} from '../constants/supportHelpI18n';
import SupportLanguageToggle from '../components/support/SupportLanguageToggle';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const {colors} = useAppTheme();
  const {lang, setLang} = useSupportLocale();
  const ui = useMemo(() => getSupportUi(lang), [lang]);
  const article = useMemo(() => getArticleI18n('privacy', lang), [lang]);
  const [openIndex, setOpenIndex] = useState(0);
  const onToggle = useCallback(idx => setOpenIndex(prev => (prev === idx ? -1 : idx)), []);
  const pillBg = '#EAF4FF';
  const pillTxt = colors.primary;

  const headerRight = useMemo(
    () => <SupportLanguageToggle lang={lang} onChange={setLang} />,
    [lang, setLang],
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['left', 'right', 'bottom']}>
      <AppHeader title={article.title} onBack={() => navigation.goBack()} right={headerRight} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <Text style={[styles.updated, {color: colors.textSecondary}]}>{ui.lastUpdated}</Text>
          {article.sections.map((sec, idx) => (
            <TouchableOpacity
              key={`privacy-${idx}`}
              style={[
                styles.row,
                idx !== article.sections.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => onToggle(idx)}>
              <View style={styles.top}>
                <View style={styles.textCol}>
                  <Text style={[styles.heading, {color: colors.textPrimary}]}>{sec.heading}</Text>
                  <View style={[styles.tag, {backgroundColor: pillBg}]}>
                    <Text style={[styles.tagTxt, {color: pillTxt}]}>{sec.category}</Text>
                  </View>
                </View>
                <View style={[styles.plusBtn, {borderColor: colors.border}]}>
                  <Text style={[styles.plus, {color: colors.textSecondary}]}>{openIndex === idx ? '−' : '+'}</Text>
                </View>
              </View>
              {openIndex === idx ? <Text style={[styles.body, {color: colors.textSecondary}]}>{sec.body}</Text> : null}
            </TouchableOpacity>
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
  updated: {
    ...Textstyles.normal,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  row: {paddingVertical: 14},
  top: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12},
  textCol: {flex: 1, minWidth: 0},
  heading: {
    ...Textstyles.medium,
    fontSize: 15,
    fontWeight: '600',
  },
  tag: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagTxt: {
    ...Textstyles.medium,
    fontSize: 11,
    fontWeight: '600',
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    ...Textstyles.medium,
    fontSize: 20,
    lineHeight: 22,
  },
  body: {
    ...Textstyles.normal,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
});
