import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';

const COLORS = {
  active: '#FF9F1C',
  inactive: '#9CA3AF',
  background: '#FDFBF7',
  border: '#E5E7EB',
};

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function PublicLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

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
          height: 60,
          paddingBottom: 8,
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
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📈" label="Progress" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="syllabus"
        options={{
          title: 'Syllabus',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" label="Syllabus" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="lesson"
        options={{
          href: null,
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
