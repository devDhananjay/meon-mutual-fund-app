import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '../constants/storageKeys';

export async function persistAuth({accessToken, refreshToken, user}) {
  const pairs = [
    [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
    [STORAGE_KEYS.USER_DATA, JSON.stringify(user)],
  ];
  if (refreshToken != null) {
    pairs.push([STORAGE_KEYS.REFRESH_TOKEN, refreshToken]);
  }
  await AsyncStorage.multiSet(pairs);
}

export async function clearAuthStorage() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER_DATA,
  ]);
}

export async function getRememberedUsername() {
  return AsyncStorage.getItem(STORAGE_KEYS.REMEMBERED_USERNAME);
}

export async function setRememberedUsername(username) {
  if (username) {
    await AsyncStorage.setItem(STORAGE_KEYS.REMEMBERED_USERNAME, username);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBERED_USERNAME);
  }
}

/** Returns { accessToken, refreshToken, user } or null if not logged in */
export async function loadStoredSession() {
  const [[, token], [, userJson], [, refresh]] = await AsyncStorage.multiGet([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.USER_DATA,
    STORAGE_KEYS.REFRESH_TOKEN,
  ]);
  if (!token || !userJson) {
    return null;
  }
  try {
    const user = JSON.parse(userJson);
    return {accessToken: token, refreshToken: refresh || null, user};
  } catch {
    return null;
  }
}
