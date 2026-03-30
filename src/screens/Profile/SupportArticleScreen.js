import React, {useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import AppColors from '../../theme/colors';
import {SUPPORT_ARTICLES} from '../../constants/supportLegalContent';
import Textstyles from '../../utils/text';

export default function SupportArticleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = route.params?.id ?? 'faq';

  const article = useMemo(() => SUPPORT_ARTICLES[id] ?? SUPPORT_ARTICLES.faq, [id]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title={article.title} onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {article.sections.map((sec, idx) => (
          <View key={String(idx)} style={styles.block}>
            <Text style={styles.heading}>{sec.heading}</Text>
            <Text style={styles.body}>{sec.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: AppColors.background},
  scroll: {flex: 1},
  content: {paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8},
  block: {marginBottom: 20},
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
