import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { isLoggedIn, role } = useAuthStore();

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (role === 'member')         return <Redirect href="/(member)/community" />;
  if (role === 'trainer')        return <Redirect href="/(trainer)/community" />;
  if (role === 'gym_admin')      return <Redirect href="/(gym)/community" />;

  return <Redirect href="/login" />;
}
