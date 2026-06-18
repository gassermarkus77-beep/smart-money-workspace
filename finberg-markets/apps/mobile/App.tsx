import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ChartScreen     from './src/screens/ChartScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import AlertsScreen    from './src/screens/AlertsScreen';
import AccountScreen   from './src/screens/AccountScreen';

const Tab = createBottomTabNavigator();

export default function App(): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#26a69a', background: '#0b0f17', card: '#0b0f17',
            text: '#e6ebf2', border: '#1a2332', notification: '#ef5350',
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' as const },
            medium: { fontFamily: 'System', fontWeight: '500' as const },
            bold: { fontFamily: 'System', fontWeight: '700' as const },
            heavy: { fontFamily: 'System', fontWeight: '900' as const },
          },
        }}
      >
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: { backgroundColor: '#0b0f17', borderTopColor: '#1a2332' },
            tabBarActiveTintColor: '#26a69a',
            tabBarInactiveTintColor: '#9aa4b2',
            headerStyle: { backgroundColor: '#0b0f17' },
            headerTitleStyle: { color: '#e6ebf2' },
          }}
        >
          <Tab.Screen name="Chart"     component={ChartScreen} />
          <Tab.Screen name="Watchlist" component={WatchlistScreen} />
          <Tab.Screen name="Alerts"    component={AlertsScreen} />
          <Tab.Screen name="Account"   component={AccountScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
