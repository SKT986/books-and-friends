import { Text } from 'react-native'
import { Tabs } from 'expo-router'
import { Colors } from '@/constants/theme'

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{symbol}</Text>
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.plum,
        tabBarInactiveTintColor: Colors.inkSoft,
        tabBarStyle: { backgroundColor: Colors.paper, borderTopColor: Colors.line },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🔎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="my-sessions"
        options={{
          title: 'My Sessions',
          tabBarIcon: ({ focused }) => <TabIcon symbol="📚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon symbol="👤" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
