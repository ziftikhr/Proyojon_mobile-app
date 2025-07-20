import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';

import Home from './screens/Home';
import Profile from './screens/Profile';
import Updates from './screens/Updates';
import Settings from './screens/Settings';
import NotFound from './screens/NotFound';
import Cart from './screens/Cart';
import Chats from './screens/Chats';
import Login from './screens/Login';
import Signup from './screens/Signup';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Cart') iconName = 'cart';
          else if (route.name === 'Updates') iconName = 'notifications';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#800d0dff',
        tabBarInactiveTintColor: 'gray',
        // headerShown: false,
        headerRight: () => (
          <>
            <Pressable onPress={() => navigation.navigate('Profile', {user: 'John Doe'})} style={{ padding: 10 }}>
              <Ionicons name="person" size={24} color="#800d0dff" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Chats')} style={{ padding: 10 }}>
              <Ionicons name="chatbubbles" size={24} color="#800d0dff" />
            </Pressable>
          </>
        ),
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Updates" component={Updates} />
      <Tab.Screen name="Cart" component={Cart} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen
        name="Login"
        component={Login}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Signup"
        component={Signup}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HomeTabs"
        options={{ headerShown: false }}
      >
        {props => <HomeTabs {...props} />}
      </Stack.Screen>

      <Stack.Screen
        name="Settings"
        component={Settings}
        options={({ navigation }) => ({
          presentation: 'modal',
          headerRight: () => (
            <Pressable onPress={() => navigation.goBack()} style={{ padding: 10 }}>
              {/* <Text style={{ color: 'blue' }}>Close</Text> */}
              <Ionicons name="close" size={24} color="black" />
            </Pressable>
          ),
        })}
      />

      <Stack.Screen
        name="Profile"
        component={Profile}
        options={({ route }) => ({
            title: route.params?.user ? `@${route.params.user}` : 'Profile',
        })}
      />

      <Stack.Screen
        name="Chats"
        component={Chats}
        options={{ title: 'Chats' }}
      />

      <Stack.Screen
        name="NotFound"
        component={NotFound}
        options={{ title: '404' }}
      />
    </Stack.Navigator>
  );
}
