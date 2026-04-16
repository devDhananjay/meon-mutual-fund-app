import React, {useMemo, useState, useCallback} from 'react';
import {Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';
import {setThemeMode} from '../../store/slices/themeSlice';
import {STORAGE_KEYS} from '../../constants/storageKeys';
import Icons from '../../utils/icons';

export default function ProfileSettingsScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {colors, isDark} = useAppTheme();
  const themeMode = useSelector(s => s.theme.mode);
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const darkModeEnabled = themeMode === 'dark';

  const onToggleDarkMode = useCallback(
    async value => {
      const nextMode = value ? 'dark' : 'light';
      dispatch(setThemeMode(nextMode));
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, nextMode);
      } catch {
        /* ignore */
      }
    },
    [dispatch],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader
        title="Settings"
        onBack={() => navigation.goBack()}
        backgroundColor={isDark ? colors.background : '#FFFFFF'}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* <View style={styles.group}>  */}
          {/* <TouchableOpacity
            style={styles.row}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AccountDetails')}>
            <View style={[styles.iconWrap, {backgroundColor: isDark ? '#1B2640' : '#EEF5FF'}]}>
              <Image source={Icons.UserRounded} style={styles.rowIcon} resizeMode="contain" />
            </View>
            <Text style={styles.rowLabel}>Account Details</Text>
            <Image source={Icons.GoIcon} style={styles.rowChevron} resizeMode="contain" />
          </TouchableOpacity> */}
        {/* </View> */}

        <View style={styles.group}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, {backgroundColor: isDark ? '#1B2640' : '#EEF5FF'}]}>
              <Image source={Icons.DarkModeIcon} style={styles.rowIcon} resizeMode="contain" />
            </View>
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Switch
              value={darkModeEnabled}
              onValueChange={onToggleDarkMode}
              trackColor={{false: '#D5D7DC', true: colors.primary}}
              thumbColor="#FFFFFF"
              // ios_backgroundColor="#D5D7DC"
            />
          </View>

          <View style={[styles.row, styles.rowDivider]}>
            <View style={[styles.iconWrap, {backgroundColor: isDark ? '#1B2640' : '#EEF5FF'}]}>
              <Image source={Icons.NotificationsIcon} style={[styles.rowIcon, {tintColor: '#1E81F2'}]} resizeMode="contain" />
            </View>
            <Text style={styles.rowLabel}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{false: '#D5D7DC', true: colors.primary}}
              thumbColor="#FFFFFF"
              // ios_backgroundColor="#D5D7DC"
            />
          </View>

          <TouchableOpacity
            style={[styles.row, styles.rowDivider]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('DeleteAccount')}>
            <View style={[styles.iconWrap, {backgroundColor: isDark ? '#3B1F24' : '#FFF1F2'}]}>
              <Image source={Icons.deleteIcon} style={styles.rowIconDelete} resizeMode="contain" />
            </View>
            <Text style={styles.rowLabel}>Delete Account</Text>
            <Image source={Icons.GoIcon} style={styles.rowChevron} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c, isDark) {
  return StyleSheet.create({
    safe: {flex: 1, backgroundColor: isDark ? c.background : '#FFFFFF'},
    scrollContent: {paddingHorizontal: 16, paddingTop: 0, paddingBottom: 20},
    group: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      overflow: 'hidden',
      marginBottom: 12,
    },
    row: {
      minHeight: 72,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowIcon: {width: 20, height: 20},
    rowIconDelete: {width: 20, height: 20, tintColor: '#E64B63'},
    rowLabel: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 16,
      ...Textstyles.medium,
      fontWeight: '600',
    },
    rowChevron: {width: 12, height: 12, tintColor: c.textSecondary},
  });
}
