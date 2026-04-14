import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { isLoggedIn, role } = useAuthStore();

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (role === 'member')         return <Redirect href="/(member)" />;
  if (role === 'trainer')        return <Redirect href="/(trainer)" />;
  if (role === 'gym_admin')      return <Redirect href="/(gym)" />;

  return <Redirect href="/login" />;
}
