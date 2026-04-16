import {Dimensions, PixelRatio, Platform} from 'react-native';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;

export const normalizeFont = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};

export const widthPercentageToDP = (widthPercent) => {
  const elemWidth = parseFloat(String(widthPercent));
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * elemWidth) / 100);
};

export const heightPercentageToDP = (heightPercent) => {
  const elemHeight = parseFloat(String(heightPercent));
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * elemHeight) / 100);
};

export const widthFromPixel = (widthPx, w = 375) => {
  return widthPx * (SCREEN_WIDTH / w);
};

export const heightFromPixel = (heightPx, h = 812) => {
  return heightPx * (SCREEN_HEIGHT / h);
};

export const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;
export const mobileRegex = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/;

export const Colors = {
  themeColor: '#1E81F2',
  themeBlue: '#1E81F2',
  themeRed: '#DD0000',
  white: '#FFFFFF',
  red: '#DD0000',
  gray: '#6B7280',
  green: '#16A34A',
  offWhite: '#F8FAFC',
  lightWhite: '#F8FAFC',
  black: '#000000',
  lightBlue: '#87CEFA',
  blue: '#1E81F2',
  WHITE: '#FFFFFF',
  GREY: '#6B7280',
  BORDER_GREY: '#E5E7EB',
  LIGHT_GREY: '#EEF2F7',
  BUTTON_DISABLED: '#D1D1D6',
  TEXT_PRIMARY: '#111827',
  LINK_BLUE: '#1E81F2',
};

export const FontSize = {
  doubleExtraLarge: 20,
  extraLarge: 18,
  large: 16,
  medium: 14,
  small: 12,
};

/** Same API host as web `apiClient` / `BACKEND_IP` */
export const baseUrl = 'https://mutualfunds.meon.co.in/v1';

export const wp = widthPercentageToDP;
export const hp = heightPercentageToDP;
export const wpx = widthFromPixel;
export const hpx = heightFromPixel;
export const nf = normalizeFont;
