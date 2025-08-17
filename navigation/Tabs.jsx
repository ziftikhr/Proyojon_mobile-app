import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TouchableOpacity, View, StyleSheet, Image } from 'react-native';

import Home from './screens/Home';
import Profile from './screens/Profile';
import Updates from './screens/Updates';
import Settings from './screens/Settings';
import NotFound from './screens/NotFound';
import Cart from './screens/Cart';
import Login from './screens/Login';
import Signup from './screens/Signup';
import ChatUsersScreen from './screens/ChatUsersScreen';
import ChatMessagesScreen from './screens/ChatMessagesScreen';
import ChatDetailsScreen from './screens/ChatDetailsScreen';
import PostAd from './screens/PostAd';
import { useAtom } from 'jotai';
import { userAtom } from '../atoms/userAtom';
import logo from '../assets/proyojon.png';
import DetailedAdScreen from "./screens/DetailedAdScreen";
import ChatIconWithBadge from './components/ChatIconWithBadge';
import UpdatesIconWithBadge from './components/UpdateIconWithBadge'; // Import the new component

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs({ navigation }) {
  const [user] = useAtom(userAtom);
  
  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'Home') {
              iconName = 'home';
              return <Ionicons name={iconName} size={size} color={color} />;
            } else if (route.name === 'Cart') {
              iconName = 'cart';
              return <Ionicons name={iconName} size={size} color={color} />;
            } else if (route.name === 'Updates') {
              // Use the custom icon with badge for Updates
              return <UpdatesIconWithBadge color={color} size={size} />;
            } else if (route.name === 'PostAdButton') {
              iconName = 'add-circle';
              return <Ionicons name={iconName} size={size} color={color} />;
            }
            return <Ionicons name="home" size={size} color={color} />;
          },
          tabBarActiveTintColor: '#800d0dff',
          tabBarInactiveTintColor: 'gray',
          headerRight: () => (
            <>
              <Pressable onPress={() => navigation.navigate('Profile', {user: user?.email})} style={{ padding: 10 }}>
                <Ionicons name="person" size={24} color="#800d0dff" />
              </Pressable>
              {/* Replace the old chat icon with the new one with badge */}
              <ChatIconWithBadge 
                onPress={() => navigation.navigate('ChatUsers')} 
              />
            </>
          ),
          headerTitle: () => (
            <Image
              source={logo}
              style={{ width: 120, height: 40, resizeMode: 'contain' }}
            />
          ),
        })}
      >
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen
          name="Post"
          component={PostAd}
          options={{
            tabBarLabel: 'Post',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="add-circle" color={color} size={size} />
            ),
          }}
        />

        <Tab.Screen name="Updates" component={Updates} />
        <Tab.Screen name="Cart" component={Cart} />
      </Tab.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#800d0dff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default function Tabs() {
  const [user] = useAtom(userAtom);
  return (
    <Stack.Navigator initialRouteName="HomeTabs">
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
          name="AdDetails"
          component={DetailedAdScreen}
          options={{ title: null }}
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
              <Ionicons name="close" size={24} color="black" />
            </Pressable>
          ),
        })}
      />

      <Stack.Screen
        name="Profile"
        component={Profile}
        options={{ title: user? `@${user?.name}` : 'Profile' }}
      />

      <Stack.Screen
        name="NotFound"
        component={NotFound}
        options={{ title: '404' }}
      />

      <Stack.Screen name="ChatUsers" component={ChatUsersScreen} options={{ title: 'Chats' }} />
      <Stack.Screen name="ChatMessages" component={ChatMessagesScreen} />
      <Stack.Screen name="ChatDetails" component={ChatDetailsScreen} options={{ title: 'Chat Details' }} />
    </Stack.Navigator>
  );
}