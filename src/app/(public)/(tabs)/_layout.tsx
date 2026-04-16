import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProgressStore } from '@/stores/useProgressStore';

const COLORS = {
  active: '#FF9F1C',
  inactive: '#9CA3AF',
  background: '#FDFBF7',
  border: '#E5E7EB',
};

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function ProgressTabIcon({ focused }: { focused: boolean }) {
  const queueLength = useProgressStore((s) => s.offlineQueue.length);
  return (
    <View>
      <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>📈</Text>
      {queueLength > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -6,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#FF9F1C',
          }}
        />
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.active,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontFamily: 'Lexend_400Regular',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => <ProgressTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="syllabus"
        options={{
          title: 'Syllabus',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile/add"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
