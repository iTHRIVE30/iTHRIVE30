import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import HeaderMenu from '../../components/HeaderMenu';
import { LOGO_MARK } from '../../lib/brand';

const GOLD = '#D4AF37';
const BLACK = '#0B0B0B';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: '#666',
        tabBarStyle: { backgroundColor: BLACK, borderTopColor: '#222' },
        headerStyle: { backgroundColor: BLACK },
        headerTintColor: GOLD,
        headerTitle: () => (
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