import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import AppColors from '../theme/colors';
import {radius} from '../theme/radius';

const CONNECTOR_DOTS = 6;
const DOT_SIZE = 3;
const DOT_GAP = 5;

function DottedConnector({completed}) {
  const color = completed ? '#22C55E' : '#D1D5DB';
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
}) {
  return (
    <View style={styles.card}>
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
                      : styles.tlDotPending,
              ]}>
              {step.done ? (
                <Text style={styles.tlCheck}>✓</Text>
              ) : step.cancelled || step.failed ? (
                <Text style={styles.tlCheck}>✕</Text>
              ) : step.continueButton ? (
                <Text style={styles.tlClock}>⏱</Text>
              ) : null}
            </View>
            {index < steps.length - 1 ? <DottedConnector completed={!!step.done} /> : null}
          </View>
          <View style={styles.tlBody}>
            <Text style={styles.tlTitle}>{step.title}</Text>
            <Text style={styles.tlTime}>{formatDateTime(step.at)}</Text>
          </View>

          {step?.id === 0 && timelineStatus === 'SUBMITTED' ? (
            <View style={styles.tlActionWrap}>
              <View style={styles.authActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onCancel}
                  activeOpacity={0.9}
                  disabled={loading}>
                  <Text style={styles.cancelTxt}>{loading ? 'Canceling...' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.continueBtn}
                  onPress={onContinue}
                  activeOpacity={0.9}
                  disabled={paymentLoading || loading}>
                  <Text style={styles.continueTxt}>{loading ? 'Please wait...' : 'Continue'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {step?.continueButton && timelineStatus !== 'SUBMITTED' ? (
            <View style={styles.tlActionWrap}>
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={onContinue}
                activeOpacity={0.9}
                disabled={paymentLoading || loading}>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    marginBottom: 16,
  },
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
  tlDotPending: {backgroundColor: AppColors.white, borderColor: '#D1D5DB'},
  tlCheck: {color: AppColors.white, fontSize: 11, fontWeight: '600'},
  tlClock: {color: AppColors.white, fontSize: 10, fontWeight: '600'},
  tlBody: {flex: 1, paddingLeft: 8, paddingBottom: 12},
  tlTitle: {fontSize: 15, fontWeight: '600', color: AppColors.textPrimary},
  tlTime: {fontSize: 12, color: AppColors.textSecondary, marginTop: 4},
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
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 10,
  },
  cancelTxt: {fontSize: 13, color: '#374151', fontWeight: '600'},
  continueBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  continueTxt: {fontSize: 13, color: AppColors.white, fontWeight: '700'},
});
