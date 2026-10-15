import AsyncStorage from '@react-native-async-storage/async-storage';
import {DeviceEventEmitter} from 'react-native';
import {STORAGE_KEYS} from '../constants/storageKeys';
import {TOUR_SCREEN} from './tourSteps';

export const APP_TOUR_REPLAY_EVENT = 'meon_app_tour_replay';

async function readTourMap() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.APP_TOUR_SCREENS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }

  // Migrate legacy single flag → dashboard only
  try {
    const legacy = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_APP_TOUR);
    if (legacy === '1') {
      const migrated = {[TOUR_SCREEN.dashboard]: true};
      await AsyncStorage.setItem(STORAGE_KEYS.APP_TOUR_SCREENS, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    /* ignore */
  }

  return {};
}

async function writeTourMap(map) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.APP_TOUR_SCREENS, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export async function hasSeenScreenTour(screenKey) {
  const map = await readTourMap();
  return !!map[screenKey];
}

export async function markScreenTourSeen(screenKey) {
  const map = await readTourMap();
  if (map[screenKey]) {
    return;
  }
  map[screenKey] = true;
  await writeTourMap(map);
  if (screenKey === TOUR_SCREEN.dashboard) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_APP_TOUR, '1');
    } catch {
      /* ignore */
    }
  }
}

/** @deprecated use markScreenTourSeen(TOUR_SCREEN.dashboard) */
export async function markAppTourSeen() {
  await markScreenTourSeen(TOUR_SCREEN.dashboard);
}

/** @deprecated use hasSeenScreenTour(TOUR_SCREEN.dashboard) */
export async function hasSeenAppTour() {
  return hasSeenScreenTour(TOUR_SCREEN.dashboard);
}

export async function clearAllScreenTours() {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEYS.APP_TOUR_SCREENS, STORAGE_KEYS.HAS_SEEN_APP_TOUR]);
  } catch {
    /* ignore */
  }
}

/** Settings → Replay: reset all screen tips and restart from Dashboard. */
export async function requestAppTourReplay() {
  await clearAllScreenTours();
  DeviceEventEmitter.emit(APP_TOUR_REPLAY_EVENT);
}
