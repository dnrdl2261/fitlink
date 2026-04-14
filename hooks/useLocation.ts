import { useEffect } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../store/locationStore';

export function useLocation() {
  const { currentLocation, hasPermission, setLocation, setPermission } = useLocationStore();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setPermission(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        setPermission(false);
        // 권한 거부 시 서울 기본 좌표 유지 (locationStore 초기값)
      }
    })();
  }, []);

  return { currentLocation, hasPermission };
}
