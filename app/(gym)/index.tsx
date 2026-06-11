import { Redirect } from 'expo-router';

export default function GymIndex() {
  return <Redirect href="/(gym)/bookings" />;
}
