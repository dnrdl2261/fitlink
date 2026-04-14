import { Stack } from 'expo-router';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet } from 'react-native';
import { type PropsWithChildren } from 'react';
import { COLORS } from '../utils/constants';

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.secondary,
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

const detailScreenOptions = {
  headerShown: true,
  headerBackTitle: '',
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
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login"   options={{ headerShown: false }} />
          <Stack.Screen name="signup"  options={{ headerShown: false }} />
          <Stack.Screen name="index"   options={{ headerShown: false }} />
          <Stack.Screen name="(member)"  />
          <Stack.Screen name="(trainer)" />
          <Stack.Screen name="(gym)"     />
          <Stack.Screen name="gym/[id]"     options={{ ...detailScreenOptions, title: '헬스장 상세' }} />
          <Stack.Screen name="trainer/[id]" options={{ ...detailScreenOptions, title: '트레이너 프로필' }} />
          <Stack.Screen name="booking/new"  options={{ ...detailScreenOptions, title: '예약하기' }} />
          <Stack.Screen name="booking/[id]" options={{ ...detailScreenOptions, title: '예약 상세' }} />
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
