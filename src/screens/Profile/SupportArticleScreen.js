import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Linking} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import AppColors from '../../theme/colors';
import {SUPPORT_ARTICLES} from '../../constants/supportLegalContent';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';
import {appAlert} from '../../utils/appAlert';

export default function SupportArticleScreen() {
  const navigation = useNavigation();
  const {colors} = useAppTheme();
  const route = useRoute();
  const id = route.params?.id ?? 'faq';
  const [faqOpenIndex, setFaqOpenIndex] = useState(0);
  const [helpTitle, setHelpTitle] = useState('');
  const [helpMessage, setHelpMessage] = useState('');

  const article = useMemo(() => SUPPORT_ARTICLES[id] ?? SUPPORT_ARTICLES.faq, [id]);
  const isFaq = id === 'faq';
  const isHelp = id === 'help';
  const helpEmail = 'support@meon.co.in';
  const canSubmitHelp = helpTitle.trim().length > 0 && helpMessage.trim().length > 0;

  const onHelpSubmit = useCallback(async () => {
    const subject = helpTitle.trim();
    const message = helpMessage.trim();
    if (!subject || !message) {
      appAlert('Help & Support', 'Please enter both title and message.');
      return;
    }

    const body = `${message}\n\n---\nSent from Meon app`;
    const mailto = `mailto:${helpEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      // Android may return false for canOpenURL(mailto) depending on package visibility.
      // Attempt to open directly first.
      await Linking.openURL(mailto);
      appAlert('Help & Support', 'Support email draft opened successfully.');
      setHelpTitle('');
      setHelpMessage('');
    } catch {
      try {
        await Linking.openURL(`mailto:${helpEmail}`);
        appAlert('Help & Support', 'Support email draft opened successfully.');
        setHelpTitle('');
        setHelpMessage('');
      } catch {
        appAlert('Help & Support', 'No email app found on this device.');
      }
    }
  }, [helpEmail, helpMessage, helpTitle]);

  const contentCardStyle = useMemo(
    () => [
      styles.contentCard,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
    ],
    [colors.border, colors.card],
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['left', 'right', 'bottom']}>
      <AppHeader title={article.title} onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {isFaq ? (
          <>
            <View style={[styles.searchBox, {backgroundColor: colors.card, borderColor: colors.border}]}>
              <Text style={[styles.searchText, {color: colors.textSecondary}]}>Search FAQ's</Text>
            </View>

            <View style={contentCardStyle}>
              {article.sections.map((sec, idx) => {
                const open = idx === faqOpenIndex;
                return (
                  <TouchableOpacity
                    key={String(idx)}
                    style={[styles.faqRow, idx !== article.sections.length - 1 && {borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth}]}
                    activeOpacity={0.85}
                    onPress={() => setFaqOpenIndex(open ? -1 : idx)}>
                    <View style={styles.faqTitleRow}>
                      <Text style={[styles.faqTitle, {color: colors.textPrimary}]}>{sec.heading}</Text>
                      <Text style={[styles.faqPlus, {color: colors.textSecondary}]}>{open ? '−' : '+'}</Text>
                    </View>
                    {open ? <Text style={[styles.faqBody, {color: colors.textSecondary}]}>{sec.body}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        {isHelp ? (
          <>
            <View style={contentCardStyle}>
              <Text style={[styles.helpTitle, {color: colors.textPrimary}]}>
                We're here to help—whether you're just getting started, need service info, or technical support.
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL('tel:+919990256258')}>
                <Text style={[styles.helpContact, {color: colors.textSecondary}]}>+91 9990256258</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@meon.co.in')}>
                <Text style={[styles.helpContact, {color: colors.textSecondary}]}>support@meon.co.in</Text>
              </TouchableOpacity>
            </View>

            <View style={contentCardStyle}>
              <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>Title</Text>
              <TextInput
                value={helpTitle}
                onChangeText={setHelpTitle}
                placeholder="Enter title"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, {borderColor: colors.border, color: colors.textPrimary}]}
              />
              <Text style={[styles.inputLabel, {color: colors.textSecondary, marginTop: 10}]}>Message</Text>
              <TextInput
                value={helpMessage}
                onChangeText={setHelpMessage}
                placeholder="Enter message here..."
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[styles.input, styles.textArea, {borderColor: colors.border, color: colors.textPrimary}]}
              />
              <TouchableOpacity
                style={[styles.submitBtn, !canSubmitHelp && styles.submitBtnDisabled]}
                activeOpacity={0.85}
                onPress={onHelpSubmit}>
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {!isFaq && !isHelp ? (
          <View style={contentCardStyle}>
            <Text style={[styles.updatedLine, {color: colors.textSecondary}]}>Last updated on 23-02-2024</Text>
            {article.sections.map((sec, idx) => (
              <View key={String(idx)} style={[styles.block, idx === article.sections.length - 1 && styles.blockLast]}>
                <Text style={[styles.heading, {color: colors.textPrimary}]}>{sec.heading}</Text>
                <Text style={[styles.body, {color: colors.textSecondary}]}>{sec.body}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: AppColors.background},
  scroll: {flex: 1},
  content: {paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, gap: 12},
  contentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  searchBox: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  searchText: {
    fontSize: 14,
  },
  faqRow: {
    paddingVertical: 12,
  },
  faqTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  faqTitle: {
    flex: 1,
    fontSize: 15,
    ...Textstyles.medium,
    fontWeight: '600',
  },
  faqPlus: {
    fontSize: 20,
    lineHeight: 22,
  },
  faqBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  helpTitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  helpContact: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 42,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 14,
    backgroundColor: '#2F80ED',
    borderRadius: 9,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#FFFFFF',
    ...Textstyles.medium,
    fontSize: 14,
  },
  block: {marginBottom: 16},
  blockLast: {marginBottom: 0},
  updatedLine: {
    fontSize: 12,
    marginBottom: 10,
  },
  heading: {
    fontSize: 16,
    ...Textstyles.medium,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  body: {
    ...Textstyles.normal,
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textSecondary,
  },
});
