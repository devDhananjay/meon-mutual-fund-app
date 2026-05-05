import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import AppColors from '../../theme/colors';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';
import {appAlert} from '../../utils/appAlert';
import {useSupportLocale} from '../../hooks/useSupportLocale';
import {
  getArticleI18n,
  getSupportUi,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
} from '../../constants/supportHelpI18n';
import SupportLanguageToggle from '../../components/support/SupportLanguageToggle';
import PhoneHandsetIcon from '../../components/support/PhoneHandsetIcon';
import MailEnvelopeIcon from '../../components/support/MailEnvelopeIcon';
import Icons from '../../utils/icons';

export default function SupportArticleScreen() {
  const navigation = useNavigation();
  const {colors, isDark} = useAppTheme();
  const route = useRoute();
  const id = route.params?.id ?? 'faq';
  const {lang, setLang} = useSupportLocale();
  const ui = useMemo(() => getSupportUi(lang), [lang]);
  const article = useMemo(() => getArticleI18n(id, lang), [id, lang]);

  const [openIndex, setOpenIndex] = useState(0);
  const [faqQuery, setFaqQuery] = useState('');
  const [helpTitle, setHelpTitle] = useState('');
  const [helpMessage, setHelpMessage] = useState('');

  const isFaq = id === 'faq';
  const isHelp = id === 'help';
  const helpEmail = SUPPORT_EMAIL;
  const canSubmitHelp = helpTitle.trim().length > 0 && helpMessage.trim().length > 0;

  const filteredFaqSections = useMemo(() => {
    if (!isFaq) {
      return article.sections;
    }
    const q = faqQuery.trim().toLowerCase();
    let rows = article.sections;
    if (q) {
      rows = rows.filter(
        s =>
          s.heading.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [article.sections, faqQuery, isFaq]);

  const faqSuggestions = useMemo(() => article.sections.slice(0, 4), [article.sections]);

  const onHelpSubmit = useCallback(async () => {
    const subject = helpTitle.trim();
    const message = helpMessage.trim();
    if (!subject || !message) {
      appAlert(article.title, 'Please enter both title and message.');
      return;
    }

    const body = `${message}\n\n---\nSent from Meon app`;
    const mailto = `mailto:${helpEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(mailto);
      appAlert(article.title, 'Support email draft opened successfully.');
      setHelpTitle('');
      setHelpMessage('');
    } catch {
      try {
        await Linking.openURL(`mailto:${helpEmail}`);
        appAlert(article.title, 'Support email draft opened successfully.');
        setHelpTitle('');
        setHelpMessage('');
      } catch {
        appAlert(article.title, 'No email app found on this device.');
      }
    }
  }, [article.title, helpEmail, helpMessage, helpTitle]);

  const headerRight = useMemo(
    () => <SupportLanguageToggle lang={lang} onChange={setLang} />,
    [lang, setLang],
  );

  const pillBg = isDark ? 'rgba(30, 129, 242, 0.2)' : '#EAF4FF';
  const pillTxt = colors.primary;
  const chipActive = colors.primary;

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

  const onToggleIndex = useCallback(idx => {
    setOpenIndex(prev => (prev === idx ? -1 : idx));
  }, []);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['left', 'right', 'bottom']}>
      <AppHeader title={article.title} onBack={() => navigation.goBack()} right={headerRight} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {isFaq ? (
          <>
            <Text style={[styles.heroTitle, {color: colors.textPrimary}]}>{ui.heroFaq}</Text>

            <View style={[styles.searchBox, {backgroundColor: colors.card, borderColor: colors.border}]}>
              <Image source={Icons.SearchIcon} style={[styles.searchIcon, {tintColor: colors.textSecondary}]} />
              <TextInput
                value={faqQuery}
                onChangeText={setFaqQuery}
                placeholder={ui.searchPlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, {color: colors.textPrimary}]}
              />
            </View>

            <Text style={[styles.sectionLabel, {color: colors.textSecondary}]}>{ui.quickSuggestions}</Text>
            <View style={styles.suggestionList}>
              {faqSuggestions.map((sec, i) => (
                <TouchableOpacity
                  key={`sug-${i}`}
                  style={[styles.suggestionPill, {backgroundColor: pillBg}]}
                  onPress={() => {
                    const globalIdx = article.sections.findIndex(s => s.heading === sec.heading);
                    if (globalIdx >= 0) {
                      setOpenIndex(globalIdx);
                    }
                  }}
                  activeOpacity={0.85}>
                  <Text style={[styles.suggestionPillTxt, {color: pillTxt}]} numberOfLines={2}>
                    {sec.heading}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.browseTitle, {color: colors.textPrimary}]}>{ui.browseByCategory}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <View style={[styles.categoryChip, {backgroundColor: chipActive}]}>
                <Text style={[styles.categoryChipTxt, {color: '#FFFFFF'}]}>
                  {ui.categoryAll} {article.sections.length}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.faqSectionHead}>
              <Text style={[styles.faqSectionTitle, {color: colors.textPrimary}]}>{ui.sectionGeneral}</Text>
              <Text style={[styles.viewAll, {color: '#E5484D'}]}>{ui.viewAll}</Text>
            </View>

            <View style={contentCardStyle}>
              {filteredFaqSections.map((sec, idx) => {
                const globalIdx = article.sections.indexOf(sec);
                const open = globalIdx >= 0 && globalIdx === openIndex;
                return (
                  <TouchableOpacity
                    key={`faq-${globalIdx}-${idx}`}
                    style={[
                      styles.faqRow,
                      idx !== filteredFaqSections.length - 1 && {
                        borderBottomColor: colors.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => onToggleIndex(globalIdx)}>
                    <View style={styles.faqCardInner}>
                      <View style={styles.faqTextCol}>
                        <Text style={[styles.faqTitle, {color: colors.textPrimary}]}>{sec.heading}</Text>
                        <View style={[styles.tagPill, {backgroundColor: pillBg}]}>
                          <Text style={[styles.tagPillTxt, {color: pillTxt}]}>{sec.category}</Text>
                        </View>
                      </View>
                      <View style={[styles.plusBtn, {borderColor: colors.border}]}>
                        <Text style={[styles.faqPlus, {color: colors.textSecondary}]}>{open ? '−' : '+'}</Text>
                      </View>
                    </View>
                    {open ? <Text style={[styles.faqBody, {color: colors.textSecondary}]}>{sec.body}</Text> : null}
                  </TouchableOpacity>
                );
              })}
              {filteredFaqSections.length === 0 ? (
                <Text style={[styles.emptyFaq, {color: colors.textSecondary}]}>—</Text>
              ) : null}
            </View>
          </>
        ) : null}

        {isHelp ? (
          <>
            <View style={contentCardStyle}>
              <View style={styles.contactPairRow}>
                <TouchableOpacity
                  style={[
                    styles.contactCell,
                    {borderColor: colors.border, backgroundColor: isDark ? colors.inputBg : '#F8FAFC'},
                  ]}
                  onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE_TEL}`)}
                  activeOpacity={0.85}>
                  <PhoneHandsetIcon size={20} color="#FFFFFF" circleColor={colors.primary} />
                  <Text style={[styles.contactLabel, {color: colors.textPrimary}]}>{ui.callUs}</Text>
                  <Text style={[styles.contactValue, {color: colors.primary}]} numberOfLines={1}>
                    {SUPPORT_PHONE_DISPLAY}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contactCell,
                    {borderColor: colors.border, backgroundColor: isDark ? colors.inputBg : '#F8FAFC'},
                  ]}
                  onPress={() => Linking.openURL(`mailto:${helpEmail}`)}
                  activeOpacity={0.85}>
                  <MailEnvelopeIcon size={20} tintColor="#FFFFFF" circleColor={colors.primary} />
                  <Text style={[styles.contactLabel, {color: colors.textPrimary}]}>{ui.emailUs}</Text>
                  <Text style={[styles.contactValue, {color: colors.primary}]} numberOfLines={1}>
                    {helpEmail}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.helpIntro, {color: colors.textSecondary}]}>{ui.contactSub}</Text>
            </View>

            <View style={contentCardStyle}>
              <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>{ui.titleLabel}</Text>
              <TextInput
                value={helpTitle}
                onChangeText={setHelpTitle}
                placeholder={ui.titlePlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, {borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.inputBg}]}
              />
              <Text style={[styles.inputLabel, {color: colors.textSecondary, marginTop: 10}]}>{ui.messageLabel}</Text>
              <TextInput
                value={helpMessage}
                onChangeText={setHelpMessage}
                placeholder={ui.messagePlaceholder}
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[
                  styles.input,
                  styles.textArea,
                  {borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.inputBg},
                ]}
              />
              <TouchableOpacity
                style={[styles.submitBtn, {backgroundColor: colors.primary}, !canSubmitHelp && styles.submitBtnDisabled]}
                activeOpacity={0.85}
                onPress={onHelpSubmit}
                disabled={!canSubmitHelp}>
                <Text style={styles.submitText}>{ui.submit}</Text>
              </TouchableOpacity>
            </View>

            <View style={contentCardStyle}>
              <Text style={[styles.helpTitle, {color: colors.textPrimary}]}>{ui.helpIntro}</Text>
              {article.sections.map((sec, idx) => {
                const open = openIndex === idx;
                return (
                  <TouchableOpacity
                    key={`help-${idx}`}
                    style={[
                      styles.faqRow,
                      idx !== article.sections.length - 1 && {
                        borderBottomColor: colors.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => onToggleIndex(idx)}>
                    <View style={styles.faqCardInner}>
                      <View style={styles.faqTextCol}>
                        <Text style={[styles.faqTitle, {color: colors.textPrimary}]}>{sec.heading}</Text>
                        <View style={[styles.tagPill, {backgroundColor: pillBg}]}>
                          <Text style={[styles.tagPillTxt, {color: pillTxt}]}>{sec.category}</Text>
                        </View>
                      </View>
                      <View style={[styles.plusBtn, {borderColor: colors.border}]}>
                        <Text style={[styles.faqPlus, {color: colors.textSecondary}]}>{open ? '−' : '+'}</Text>
                      </View>
                    </View>
                    {open ? <Text style={[styles.faqBody, {color: colors.textSecondary}]}>{sec.body}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        {!isFaq && !isHelp ? (
          <View style={contentCardStyle}>
            <Text style={[styles.updatedLine, {color: colors.textSecondary}]}>{ui.lastUpdated}</Text>
            {article.sections.map((sec, idx) => (
              <TouchableOpacity
                key={`legal-${idx}`}
                style={[
                  styles.faqRow,
                  idx !== article.sections.length - 1 && {
                    borderBottomColor: colors.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => onToggleIndex(idx)}>
                <View style={styles.faqCardInner}>
                  <View style={styles.faqTextCol}>
                    <Text style={[styles.faqTitle, {color: colors.textPrimary}]}>{sec.heading}</Text>
                    <View style={[styles.tagPill, {backgroundColor: pillBg}]}>
                      <Text style={[styles.tagPillTxt, {color: pillTxt}]}>{sec.category}</Text>
                    </View>
                  </View>
                  <View style={[styles.plusBtn, {borderColor: colors.border}]}>
                    <Text style={[styles.faqPlus, {color: colors.textSecondary}]}>{openIndex === idx ? '−' : '+'}</Text>
                  </View>
                </View>
                {openIndex === idx ? <Text style={[styles.faqBody, {color: colors.textSecondary}]}>{sec.body}</Text> : null}
              </TouchableOpacity>
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
  content: {paddingHorizontal: 16, paddingBottom: 28, paddingTop: 4, gap: 10},
  heroTitle: {
    ...Textstyles.heading,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
  },
  searchBox: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchIcon: {width: 18, height: 18},
  searchInput: {...Textstyles.normal, flex: 1, fontSize: 15, paddingVertical: 10},
  sectionLabel: {...Textstyles.medium, fontSize: 13, marginTop: 6},
  suggestionList: {gap: 10},
  suggestionPill: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  suggestionPillTxt: {...Textstyles.medium, fontSize: 14, fontWeight: '600'},
  browseTitle: {...Textstyles.heading, fontSize: 16, marginTop: 8},
  chipRow: {flexDirection: 'row', gap: 10, paddingVertical: 4},
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChipTxt: {...Textstyles.medium, fontSize: 13, fontWeight: '700'},
  faqSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  faqSectionTitle: {...Textstyles.heading, fontSize: 16},
  viewAll: {...Textstyles.medium, fontSize: 14, fontWeight: '600'},
  contentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  faqRow: {
    paddingVertical: 14,
  },
  faqCardInner: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12},
  faqTextCol: {flex: 1, minWidth: 0},
  faqTitle: {
    fontSize: 15,
    ...Textstyles.medium,
    fontWeight: '600',
  },
  tagPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagPillTxt: {...Textstyles.medium, fontSize: 11, fontWeight: '600'},
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  faqPlus: {
    ...Textstyles.medium,
    fontSize: 20,
    lineHeight: 20,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    transform: [{translateY: -1}],
  },
  faqBody: {
    ...Textstyles.normal,
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  emptyFaq: {...Textstyles.normal, padding: 16, textAlign: 'center', fontSize: 14},
  contactPairRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contactCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  contactLabel: {...Textstyles.medium, fontSize: 13, fontWeight: '700'},
  contactValue: {...Textstyles.medium, fontSize: 13, fontWeight: '600'},
  helpIntro: {...Textstyles.normal, fontSize: 13, lineHeight: 20, marginTop: 14},
  helpTitle: {
    ...Textstyles.medium,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  inputLabel: {
    ...Textstyles.medium,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    ...Textstyles.normal,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 14,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#FFFFFF',
    ...Textstyles.medium,
    fontSize: 15,
    fontWeight: '600',
  },
  updatedLine: {
    ...Textstyles.normal,
    fontSize: 12,
    marginBottom: 10,
  },
  heading: {
    fontSize: 16,
    ...Textstyles.medium,
    fontWeight: '600',
    marginBottom: 8,
  },
  body: {
    ...Textstyles.normal,
    fontSize: 15,
    lineHeight: 22,
  },
});
