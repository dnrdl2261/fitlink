import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useLocationStore } from '../store/locationStore';
import { reverseGeocode } from '../utils/geocode';

async function applyLocation(
  lat: number,
  lon: number,
  setLocation: (c: { latitude: number; longitude: number }) => void,
  setPermission: (g: boolean) => void,
  setSelectedDong: (d: string) => void,
  selectedDong: string,
) {
  setPermission(true);
  setLocation({ latitude: lat, longitude: lon });
  // 이미 수동으로 선택한 위치가 있으면 덮어쓰지 않음
  if (!selectedDong) {
    const dong = await reverseGeocode(lat, lon);
    if (dong) setSelectedDong(dong);
  }
}

export function useLocation() {
  const { currentLocation, hasPermission, selectedDong, setLocation, setPermission, setSelectedDong } =
    useLocationStore();

  useEffect(() => {
    if (hasPermission !== null) return; // 이미 처리됨

    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        setPermission(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          applyLocation(coords.latitude, coords.longitude, setLocation, setPermission, setSelectedDong, selectedDong);
        },
        () => setPermission(false),
        { timeout: 10000 },
      );
    } else {
      (async () => {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          applyLocation(pos.coords.latitude, pos.coords.longitude, setLocation, setPermission, setSelectedDong, selectedDong);
        } else {
          setPermission(false);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { currentLocation, hasPermission };
}
