import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import HeaderMenu from '../../components/HeaderMenu';
import { LOGO_MARK } from '../../lib/brand';
import { useTheme } from '../../hooks/useTheme';

export default function TabLayout() {
  const t = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.ground, borderTopColor: t.borderSoft },
        headerStyle: { backgroundColor: t.ground },
        headerTintColor: t.primary,
        headerTitle: () => (
          // The mark is gold in every variant and carries no tagline, so it needs no
          // tone switch - it reads on ivory and on black alike.
          <Image
            source={LOGO_MARK}
            style={{ width: 130, height: 36 }}
            resizeMode="contain"
          />
        ),
        headerRight: () => <HeaderMenu />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} /> }} />
      <Tabs.Screen name="wins" options={{ title: 'Wins', tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} /> }} />
      <Tabs.Screen name="challenges" options={{ title: 'Challenges', tabBarIcon: ({ color, size }) => <Ionicons name="flag" size={size} color={color} /> }} />

      {/*
        Menu screens. They live inside the tab group rather than the root stack so the tab
        bar stays on screen - you leave them by tapping any tab, the same as anywhere else
        in the app. `href: null` keeps them out of the bar itself; they're reached from the
        header menu. In the root stack they pushed *over* the tabs, which hid the bar and
        left a back button labelled with the raw route name.
      */}
      <Tabs.Screen name="archive" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="teams" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
