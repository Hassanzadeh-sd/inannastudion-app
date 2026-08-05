import { Stack } from 'expo-router';
import { colors } from '../../../theme';

export default function LeadsStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
