import React, {useMemo} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image} from 'react-native';
import {radius} from '../theme/radius';
import Icons from '../utils/icons';
import Textstyles from '../utils/text';
import {useAppTheme} from '../theme/useAppTheme';

const CONNECTOR_DOTS = 6;
const DOT_SIZE = 3;
const DOT_GAP = 5;

function DottedConnector({completed, lineMuted}) {
  const color = completed ? '#22C55E' : lineMuted;
  return (
    <View style={styles.dottedConnector}>
      {Array.from({length: CONNECTOR_DOTS}).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dottedSeg,
            {backgroundColor: color},
            i === CONNECTOR_DOTS - 1 && styles.dottedSegLast,
          ]}
        />
      ))}
    </View>
  );
}

export default function StatusTimeline({
  steps,
  timelineStatus,
  loading,
  paymentLoading,
  onContinue,
  onCancel,
  formatDateTime,
  continueDisabled = false,
}) {
  const {colors, isDark} = useAppTheme();
  const dynamic = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.card,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          marginBottom: 16,
        },
        tlTitle: {...Textstyles.medium, fontSize: 15, fontWeight: '600', color: colors.textPrimary},
        tlTime: {...Textstyles.normal, fontSize: 12, color: colors.textSecondary, marginTop: 4},
        tlDotPending: {
          backgroundColor: colors.card,
          borderColor: isDark ? colors.border : '#D1D5DB',
        },
      }),
    [colors, isDark],
  );

  const lineMuted = isDark ? colors.border : '#D1D5DB';

  return (
    <View style={dynamic.card}>
      {steps.map((step, index) => (
        <View key={step.key} style={styles.tlRow}>
          <View style={styles.tlLeft}>
            <View
              style={[
                styles.tlDot,
                step.done
                  ? styles.tlDotDone
                  : step.cancelled || step.failed
                    ? styles.tlDotFail
                    : step.continueButton
                      ? styles.tlDotContinue
                      : dynamic.tlDotPending,
              ]}>
              {step.done ? (
                <Image source={Icons.checkIcons} style={styles.tlCheckIcon} resizeMode="contain" />
              ) : step.cancelled || step.failed ? (
                <Image source={Icons.CnacelIcon} style={styles.tlCheckIcon} resizeMode="contain" />
              ) : step.continueButton ? (
                <Text style={styles.tlClock}>⏱</Text>
              ) : null}
            </View>
            {index < steps.length - 1 ? <DottedConnector completed={!!step.done} lineMuted={lineMuted} /> : null}
          </View>
          <View style={styles.tlBody}>
            <Text style={dynamic.tlTitle}>{step.title}</Text>
            <Text style={dynamic.tlTime}>{formatDateTime(step.at)}</Text>
          </View>

          {step?.id === 0 && timelineStatus === 'SUBMITTED' ? (
            <View style={styles.tlActionWrap}>
              <View style={styles.authActionRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, {backgroundColor: isDark ? '#2C2C2C' : '#F3F4F6', borderColor: colors.border}]}
                  onPress={onCancel}
                  activeOpacity={0.9}
                  disabled={loading}>
                  <Text style={[styles.cancelTxt, {color: colors.textPrimary}]}>
                    {loading ? 'Canceling...' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.continueBtn, continueDisabled && styles.continueBtnDisabled]}
                  onPress={onContinue}
                  activeOpacity={0.9}
                  disabled={paymentLoading || loading || continueDisabled}>
                  <Text style={styles.continueTxt}>{loading ? 'Please wait...' : 'Continue'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {step?.continueButton && timelineStatus !== 'SUBMITTED' ? (
            <View style={styles.tlActionWrap}>
              <TouchableOpacity
                style={[styles.continueBtn, continueDisabled && styles.continueBtnDisabled]}
                onPress={onContinue}
                activeOpacity={0.9}
                disabled={paymentLoading || loading || continueDisabled}>
                <Text style={styles.continueTxt}>
                  {loading ? 'Please wait...' : timelineStatus === 'FAILED' ? 'Retry' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tlRow: {flexDirection: 'row', alignItems: 'flex-start'},
  tlLeft: {width: 28, alignItems: 'center'},
  dottedConnector: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  dottedSeg: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginBottom: DOT_GAP,
  },
  dottedSegLast: {marginBottom: 0},
  tlDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tlDotDone: {backgroundColor: '#22C55E', borderColor: '#22C55E'},
  tlDotFail: {backgroundColor: '#EF4444', borderColor: '#EF4444'},
  tlDotContinue: {backgroundColor: '#F59E0B', borderColor: '#F59E0B'},
  tlCheckIcon: {width: 14, height: 14},
  tlClock: {...Textstyles.medium, color: '#FFFFFF', fontSize: 10, fontWeight: '600'},
  tlBody: {flex: 1, paddingLeft: 8, paddingBottom: 12},
  tlActionWrap: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingLeft: 8,
    paddingTop: 2,
  },
  authActionRow: {flexDirection: 'row', alignItems: 'center'},
  cancelBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  cancelTxt: {...Textstyles.medium, fontSize: 13, fontWeight: '600'},
  continueBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  continueBtnDisabled: {opacity: 0.45},
  continueTxt: {...Textstyles.heading, fontSize: 13, color: '#FFFFFF', fontWeight: '700'},
});
