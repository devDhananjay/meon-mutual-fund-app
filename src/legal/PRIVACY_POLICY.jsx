import React, {useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, Linking} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import AppColors from '../theme/colors';
import Textstyles from '../utils/text';
import blocks from './privacyPolicyBlocks.json';

const LINK = '#1155CC';
const HEADING = '#6C7794';
const BODY = '#595959';
const MUTED = '#7F7F7F';
const ADDRESS = '#A6A6A6';

function normalizeSegments(segments) {
  if (!segments?.length) {
    return [];
  }
  const out = [];
  for (const seg of segments) {
    if (seg[0] !== 'text') {
      out.push(seg);
      continue;
    }
    const t = seg[1];
    if (!/https?:\/\//i.test(t)) {
      out.push(seg);
      continue;
    }
    let pos = 0;
    const re = /https?:\/\/[^\s]+/gi;
    let m;
    while ((m = re.exec(t)) !== null) {
      if (m.index > pos) {
        out.push(['text', t.slice(pos, m.index)]);
      }
      const raw = m[0];
      const url = raw.replace(/[.,;:)]+$/, '');
      out.push(['link', url, url]);
      pos = m.index + raw.length;
    }
    if (pos < t.length) {
      out.push(['text', t.slice(pos)]);
    }
  }
  return out;
}

function plainFromSegments(segments) {
  if (!segments?.length) {
    return '';
  }
  return segments
    .map(s => {
      if (s[0] === 'text') {
        return s[1];
      }
      if (s[0] === 'link') {
        return s[2];
      }
      if (s[0] === 'em') {
        return s[1];
      }
      return '';
    })
    .join('');
}

function SegmentLine({segments, baseStyle, linkStyle, emStyle}) {
  const segs = useMemo(() => normalizeSegments(segments), [segments]);
  return (
    <Text style={baseStyle}>
      {segs.map((seg, i) => {
        const k = seg[0];
        if (k === 'text') {
          return <Text key={i}>{seg[1]}</Text>;
        }
        if (k === 'link') {
          return (
            <Text key={i} style={linkStyle} onPress={() => Linking.openURL(seg[1])}>
              {seg[2]}
            </Text>
          );
        }
        if (k === 'em') {
          return (
            <Text key={i} style={emStyle}>
              {seg[1]}
            </Text>
          );
        }
        return null;
      })}
    </Text>
  );
}

function paragraphVariant(plain, idx) {
  if (idx === 0 && plain === 'PRIVACY POLICY') {
    return 'skip';
  }
  if (idx === 1 && /^Last updated/i.test(plain)) {
    return 'updated';
  }
  if (plain === 'TABLE OF CONTENTS' || plain === 'SUMMARY OF KEY POINTS') {
    return 'blockHeading';
  }
  if (/^\d+\.\s+[A-Z]/.test(plain) && plain.length < 140) {
    return 'sectionHeading';
  }
  if (plain === '__________' || /^B 902-905/.test(plain) || /^Sector 62/.test(plain) || /^\d{6}$/.test(plain.trim())) {
    return 'address';
  }
  return 'body';
}

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const onBack = useCallback(() => navigation.goBack(), [navigation]);

  let pIdx = -1;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Privacy Policy" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {blocks.map((block, idx) => {
          if (block.type === 'em_p') {
            pIdx += 1;
            return (
              <View key={idx} style={styles.block}>
                <Text style={[styles.body, styles.em]}>{block.text}</Text>
              </View>
            );
          }

          if (block.type === 'ul') {
            return (
              <View key={idx} style={styles.block}>
                {block.items.map((row, j) => (
                  <View key={j} style={styles.liRow}>
                    <Text style={styles.bullet}>•</Text>
                    <View style={styles.liBody}>
                      <SegmentLine
                        segments={row}
                        baseStyle={styles.body}
                        linkStyle={styles.link}
                        emStyle={styles.em}
                      />
                    </View>
                  </View>
                ))}
              </View>
            );
          }

          const plain = plainFromSegments(block.segments);
          pIdx += 1;
          const variant = paragraphVariant(plain, pIdx);
          if (variant === 'skip') {
            return null;
          }

          const base =
            variant === 'updated'
              ? styles.updated
              : variant === 'blockHeading'
                ? styles.blockHeading
                : variant === 'sectionHeading'
                  ? styles.sectionHeading
                  : variant === 'address'
                    ? styles.address
                    : styles.body;

          const linkStyle = [styles.link, variant === 'address' && styles.addressLink];

          return (
            <View key={idx} style={styles.block}>
              <SegmentLine segments={block.segments} baseStyle={base} linkStyle={linkStyle} emStyle={styles.em} />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: AppColors.background},
  scroll: {flex: 1},
  content: {paddingHorizontal: 16, paddingBottom: 36, paddingTop: 8},
  block: {marginBottom: 14},
  body: {
    ...Textstyles.normal,
    fontSize: 15,
    lineHeight: 22,
    color: BODY,
  },
  em: {fontStyle: 'italic'},
  updated: {
    ...Textstyles.normal,
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
  },
  blockHeading: {
    ...Textstyles.medium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: HEADING,
  },
  sectionHeading: {
    ...Textstyles.medium,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: HEADING,
    marginTop: 4,
  },
  address: {
    ...Textstyles.normal,
    fontSize: 14,
    lineHeight: 20,
    color: ADDRESS,
  },
  addressLink: {color: ADDRESS},
  link: {
    color: LINK,
    textDecorationLine: 'underline',
    fontSize: 15,
    lineHeight: 22,
  },
  liRow: {flexDirection: 'row', alignItems: 'flex-start', paddingRight: 4},
  bullet: {
    width: 18,
    fontSize: 15,
    lineHeight: 22,
    color: BODY,
    marginTop: 1,
  },
  liBody: {flex: 1},
});
