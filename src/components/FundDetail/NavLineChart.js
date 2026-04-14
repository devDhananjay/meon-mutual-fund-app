import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';

const RANGE_KEYS = [
  '1M',
  '2M',
  '3M',
  '6M',
  '1Y',
  // '3Y',
  // '5Y',
];

const RANGE_MAP = {
  '1M': 30,
  '2M': 60,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  '3Y': 1095,
  '5Y': 1825,
};

const CHART_H = 220;
const Y_AXIS_W = 46;
const X_AXIS_H = 34;
const PLOT_PAD = {left: 4, right: 8, top: 8, bottom: 6};
const LINE_WIDTH = 2.5;
const END_DOT = 6;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pickNavValue(d) {
  const v = d?.nav_value ?? d?.nav ?? d?.NAV;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function niceStep(rough) {
  if (!Number.isFinite(rough) || rough <= 0) {
    return 0.01;
  }
  const p10 = 10 ** Math.floor(Math.log10(rough));
  const err = rough / p10;
  const m = err <= 1 ? 1 : err <= 2 ? 2 : err <= 5 ? 5 : 10;
  return m * p10;
}

/** Y-axis ticks + padded domain (similar to web chart). */
function computeYTicks(minV, maxV) {
  const pad = Math.max((maxV - minV) * 0.05, 0.005);
  const lo = minV - pad;
  const hi = maxV + pad;
  const span = hi - lo;
  const step = niceStep(span / 4);
  const start = Math.ceil(lo / step) * step;
  const ticks = [];
  for (let v = start; v <= hi + 1e-9; v += step) {
    ticks.push(Number(v.toFixed(6)));
    if (ticks.length > 8) {
      break;
    }
  }
  if (ticks.length < 2) {
    return {ticks: [lo, hi], lo, hi};
  }
  return {ticks, lo, hi};
}

function formatYLabel(v) {
  return `₹${Number(v).toFixed(2)}`;
}

function formatDayMonth(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd} ${MONTHS[d.getMonth()]}`;
}

/** Web-style: month change → "Apr '26" (bold); same month → "04 Apr". */
function formatXAxisItem(dateMs, prevMs) {
  const d = new Date(dateMs);
  if (!Number.isFinite(prevMs)) {
    return {text: formatDayMonth(d), isMonthBoundary: false};
  }
  const prev = new Date(prevMs);
  const boundary =
    d.getMonth() !== prev.getMonth() || d.getFullYear() !== prev.getFullYear();
  if (boundary) {
    const yy = String(d.getFullYear()).slice(-2);
    return {text: `${MONTHS[d.getMonth()]} '${yy}`, isMonthBoundary: true};
  }
  return {text: formatDayMonth(d), isMonthBoundary: false};
}

function pickXAxisIndices(pointCount, maxTicks) {
  if (pointCount < 2) {
    return [];
  }
  if (pointCount <= maxTicks) {
    return [...Array(pointCount).keys()];
  }
  const idxs = [];
  for (let i = 0; i < maxTicks; i++) {
    idxs.push(Math.round((i / (maxTicks - 1)) * (pointCount - 1)));
  }
  return [...new Set(idxs)].sort((a, b) => a - b);
}

/** Catmull–Rom spline → dense polyline (smooth curve like Apex). */
function catmullRom2D(points, samplesPerSeg = 12) {
  if (points.length < 2) {
    return points;
  }
  const out = [];
  const get = i => {
    if (i < 0) {
      return points[0];
    }
    if (i >= points.length) {
      return points[points.length - 1];
    }
    return points[i];
  };
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    for (let j = 0; j < samplesPerSeg; j++) {
      const t = j / samplesPerSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      out.push({x, y});
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function NavChartPlot({smoothPoints, yTicks, lo, hi, plotW, plotH, lineColor, gridColor}) {
  if (smoothPoints.length < 2) {
    return null;
  }

  const innerH = plotH - PLOT_PAD.top - PLOT_PAD.bottom;
  const gridYs = yTicks.map(v => {
    const t = (v - lo) / (hi - lo || 1);
    return PLOT_PAD.top + (1 - t) * innerH;
  });

  return (
    <View style={[styles.plotArea, {width: plotW, height: plotH}]}>
      {gridYs.map((gy, gi) => (
        <View
          key={`grid-${gi}`}
          style={[
            styles.gridLine,
            {
              top: gy,
              borderColor: gridColor,
            },
          ]}
        />
      ))}
      {smoothPoints.slice(0, -1).map((p1, i) => {
        const p2 = smoothPoints[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (!Number.isFinite(len) || len <= 0.01) {
          return null;
        }
        const drawLen = len + 1;
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        return (
          <View
            key={`ln-${i}`}
            style={[
              styles.lineSeg,
              {
                left: midX - drawLen / 2,
                top: midY - LINE_WIDTH / 2,
                width: drawLen,
                height: LINE_WIDTH,
                backgroundColor: lineColor,
                transform: [{rotateZ: `${angleDeg}deg`}],
              },
            ]}
          />
        );
      })}
      {smoothPoints.length > 0 ? (
        <View
          style={[
            styles.endDot,
            {
              left: smoothPoints[smoothPoints.length - 1].x - END_DOT / 2,
              top: smoothPoints[smoothPoints.length - 1].y - END_DOT / 2,
              backgroundColor: lineColor,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export default function NavLineChart({graphData = [], graphLoading, timeFrame, onTimeFrameChange}) {
  const {colors, isDark} = useAppTheme();
  const {width: windowWidth} = useWindowDimensions();
  const range = timeFrame || '1M';

  const screenW = windowWidth > 0 ? windowWidth : Dimensions.get('window').width;

  const themed = useMemo(
    () =>
      StyleSheet.create({
        rangeLabel: {fontSize: 14, color: colors.textSecondary},
        loadingTxt: {marginTop: 8, color: colors.textSecondary, fontSize: 14},
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          marginHorizontal: 4,
          marginVertical: 4,
        },
        chipOn: {
          borderColor: colors.primary,
          backgroundColor: isDark ? 'rgba(96,165,250,0.12)' : '#E0F2FE',
        },
        chipTxt: {fontSize: 13, color: colors.textPrimary},
        chipTxtOn: {color: colors.primary, ...Textstyles.medium, fontWeight: '600'},
      }),
    [colors, isDark],
  );

  const toMs = d => {
    const raw = d?.date || d?.nav_date || d?.timestamp || d?.portfolio_date;
    if (typeof raw === 'number') {
      return raw < 1e12 ? raw * 1000 : raw;
    }
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : NaN;
  };

  const filteredData = useMemo(() => {
    const days = RANGE_MAP[range] || 30;
    if (!graphData?.length) {
      return [];
    }
    return graphData.slice(-days);
  }, [graphData, range]);

  const chartData = useMemo(() => {
    if (!filteredData.length) {
      return [];
    }
    return [...filteredData]
      .map(d => ({...d, __ms: toMs(d), __nav: pickNavValue(d)}))
      .filter(d => Number.isFinite(d.__ms) && Number.isFinite(d.__nav))
      .sort((a, b) => a.__ms - b.__ms);
  }, [filteredData]);

  const {absoluteReturn, percentReturn, isGain} = useMemo(() => {
    const fd = chartData;
    if (fd.length < 2) {
      return {absoluteReturn: 0, percentReturn: 0, isGain: true};
    }
    const oldest = Number(fd[0].__nav);
    const latest = Number(fd[fd.length - 1].__nav);
    const abs = latest - oldest;
    const pct = oldest ? (abs / oldest) * 100 : 0;
    return {
      absoluteReturn: abs,
      percentReturn: pct,
      isGain: abs >= 0,
    };
  }, [chartData]);

  const chartWidth = useMemo(
    () => Math.min(Math.max(280, screenW - 32), 400),
    [screenW],
  );

  const lineColor = isGain ? '#16a34a' : '#dc2626';
  const gridColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const yLabelColor = colors.textSecondary;

  const plotW = Math.max(1, chartWidth - Y_AXIS_W);
  const plotH = CHART_H;

  const chartModel = useMemo(() => {
    if (chartData.length < 2) {
      return null;
    }
    const values = chartData.map(d => d.__nav);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const {ticks, lo, hi} = computeYTicks(minV, maxV);
    const n = values.length;
    const innerW = plotW - PLOT_PAD.left - PLOT_PAD.right;
    const innerH = plotH - PLOT_PAD.top - PLOT_PAD.bottom;
    const span = hi - lo || 1;

    const basePts = values.map((v, i) => {
      const x = PLOT_PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
      const y = PLOT_PAD.top + (1 - (v - lo) / span) * innerH;
      return {x, y};
    });
    const smoothPoints = catmullRom2D(basePts, 16);
    const ms0 = chartData[0]?.__ms;
    const ms1 = chartData[chartData.length - 1]?.__ms;
    const chartKey = `${range}-${n}-${ms0}-${ms1}-${isDark ? 'd' : 'l'}`;

    return {values, ticks, lo, hi, smoothPoints, chartKey};
  }, [chartData, plotW, plotH, range, isDark]);

  const showChart = chartData.length >= 2 && chartModel != null;

  const xAxisItems = useMemo(() => {
    if (chartData.length < 2) {
      return [];
    }
    const maxTicks = range === '1Y' || range === '3Y' || range === '5Y' || range === '6M' ? 9 : 8;
    const idxs = pickXAxisIndices(chartData.length, maxTicks);
    return idxs.map((i, idx) => {
      const ms = chartData[i].__ms;
      const prevMs = idx === 0 ? NaN : chartData[idxs[idx - 1]].__ms;
      const {text, isMonthBoundary} = formatXAxisItem(ms, prevMs);
      return {key: `xtick-${i}-${ms}`, text, isMonthBoundary};
    });
  }, [chartData, range]);

  return (
    <View style={styles.wrap}>
      <View style={styles.returnRow}>
        <Text style={[Textstyles.medium, styles.abs, isGain ? styles.green : styles.red]}>
          {absoluteReturn >= 0 ? '+' : '-'}₹{Math.abs(absoluteReturn).toFixed(2)}
        </Text>
        <Text style={[Textstyles.normal, themed.rangeLabel]}>{range} return</Text>
      </View>
      <Text style={[Textstyles.medium, isGain ? styles.green : styles.red]}>
        {absoluteReturn >= 0 ? '+' : ''}
        {percentReturn.toFixed(2)}%
      </Text>

      <View style={[styles.chartBox, {width: chartWidth}]}>
        {graphLoading && filteredData.length === 0 ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={themed.loadingTxt}>Loading chart…</Text>
          </View>
        ) : !showChart ? (
          <View style={styles.chartLoading}>
            <Text style={themed.loadingTxt}>Not enough NAV data</Text>
          </View>
        ) : (
          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}>
            <View style={styles.chartRow}>
              <View style={[styles.yAxisCol, {width: Y_AXIS_W}]}>
                {[...chartModel.ticks].reverse().map((tv, i) => (
                  <Text
                    key={`y-${i}-${tv}`}
                    numberOfLines={1}
                    style={[styles.yAxisLabel, {color: yLabelColor}]}>
                    {formatYLabel(tv)}
                  </Text>
                ))}
              </View>
              <NavChartPlot
                key={chartModel.chartKey}
                smoothPoints={chartModel.smoothPoints}
                yTicks={chartModel.ticks}
                lo={chartModel.lo}
                hi={chartModel.hi}
                plotW={plotW}
                plotH={plotH}
                lineColor={lineColor}
                gridColor={gridColor}
              />
            </View>
            {xAxisItems.length > 0 ? (
              <View style={[styles.xAxisRow, {borderTopColor: gridColor}]}>
                {xAxisItems.map(item => (
                  <Text
                    key={item.key}
                    numberOfLines={1}
                    style={[
                      styles.xAxisLabel,
                      {
                        color: colors.textSecondary,
                        fontWeight: item.isMonthBoundary ? '700' : '400',
                      },
                    ]}>
                    {item.text}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        )}
        {graphLoading && filteredData.length > 0 ? (
          <View
            style={[
              styles.chartOverlay,
              {backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.5)'},
            ]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </View>

      <View style={styles.chips}>
        {RANGE_KEYS.map(key => (
          <TouchableOpacity
            key={key}
            style={[themed.chip, range === key && themed.chipOn]}
            onPress={() => onTimeFrameChange?.(key)}
            activeOpacity={0.85}>
            <Text style={[Textstyles.medium, themed.chipTxt, range === key && themed.chipTxtOn]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  returnRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  abs: {
    fontSize: 22,
    marginRight: 8,
  },
  green: {color: '#16a34a'},
  red: {color: '#dc2626'},
  chartBox: {
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 8,
  },
  chartCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  yAxisCol: {
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingRight: 4,
  },
  yAxisLabel: {
    fontSize: 9,
    ...Textstyles.normal,
    textAlign: 'right',
  },
  plotArea: {
    position: 'relative',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lineSeg: {
    position: 'absolute',
  },
  endDot: {
    position: 'absolute',
    width: END_DOT,
    height: END_DOT,
    borderRadius: END_DOT / 2,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: X_AXIS_H,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  xAxisLabel: {
    fontSize: 9,
    ...Textstyles.normal,
    flexShrink: 1,
    textAlign: 'center',
    maxWidth: '13%',
  },
  chartLoading: {
    height: CHART_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
  },
});
