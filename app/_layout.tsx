import { Stack, useRouter } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { type PropsWithChildren } from 'react';
import { COLORS } from '../utils/constants';

import { MD3LightTheme } from 'react-native-paper';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.primaryLight,
    background: COLORS.background,
    surface: COLORS.surface,
    onBackground: COLORS.text,
    onSurface: COLORS.text,
  },
};

function WebFrame({ children }: PropsWithChildren) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={webStyles.outer}>
      <View style={webStyles.phone}>{children}</View>
    </View>
  );
}

function BackBtn() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.back()} style={{ paddingLeft: 20, paddingRight: 8 }}>
      <Text style={{ fontSize: 34, fontWeight: '300', color: COLORS.text }}>‹</Text>
    </TouchableOpacity>
  );
}

const detailScreenOptions = {
  headerShown: true,
  headerLeft: () => <BackBtn />,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: { color: COLORS.text, fontWeight: '700' as const },
  headerShadowVisible: false,
};

export default function RootLayout() {
  return (
    <WebFrame>
      <PaperProvider theme={theme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login"   options={{ headerShown: false }} />
          <Stack.Screen name="signup"  options={{ headerShown: false }} />
          <Stack.Screen name="index"   options={{ headerShown: false }} />
          <Stack.Screen name="(member)"  />
          <Stack.Screen name="(trainer)" />
          <Stack.Screen name="(gym)"     />
          <Stack.Screen name="gym/[id]"     options={{ ...detailScreenOptions, title: '헬스장 상세' }} />
          <Stack.Screen name="trainer/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="booking/new"          options={{ headerShown: false }} />
          <Stack.Screen name="booking/consultation" options={{ headerShown: false }} />
          <Stack.Screen name="booking/[id]"         options={{ ...detailScreenOptions, title: '예약 상세' }} />
          <Stack.Screen name="booking/receipt"      options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]"    options={{ headerShown: false }} />
          <Stack.Screen name="user-profile/[userId]" options={{ headerShown: false }} />
          <Stack.Screen name="location-picker" options={{ headerShown: false }} />
          <Stack.Screen name="operator"  options={{ headerShown: false }} />
          <Stack.Screen name="gym-apply" options={{ headerShown: false }} />
        </Stack>
      </PaperProvider>
    </WebFrame>
  );
}

const webStyles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  } as any,
  phone: {
    width: 430,
    maxWidth: '100%' as any,
    flex: 1,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
});
