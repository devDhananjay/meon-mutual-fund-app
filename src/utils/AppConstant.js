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
  themeColor: '#0285C5',
  themeBlue: '#0285C5',
  themeRed: '#DD0000',
  white: '#FFFFFF',
  red: '#DD0000',
  gray: '#7D7C7C',
  green: '#02a556',
  offWhite: '#F3F5F9',
  lightWhite: '#F5F5F5',
  black: '#000000',
  lightBlue: '#87CEFA',
  blue: '#0285C5',
  WHITE: '#FFFFFF',
  GREY: '#808080',
  BORDER_GREY: '#EBECED',
  LIGHT_GREY: '#E8E8E8',
  BUTTON_DISABLED: '#D1D1D6',
  TEXT_PRIMARY: '#000000',
  LINK_BLUE: '#0285C5',
};

export const FontSize = {
  doubleExtraLarge: 20,
  extraLarge: 18,
  large: 16,
  medium: 14,
  small: 12,
};

export const baseUrl = ''; // Add API base URL when ready

export const wp = widthPercentageToDP;
export const hp = heightPercentageToDP;
export const wpx = widthFromPixel;
export const hpx = heightFromPixel;
export const nf = normalizeFont;
