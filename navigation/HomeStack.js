import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/Home'
import DetailedAdScreen from './screens/DetailedAdScreen';

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'Home2' }} />
      <Stack.Screen name="AdDetails" component={DetailedAdScreen} options={{ title: 'Ad Details' }} />
    </Stack.Navigator>
  );
};

export default HomeStack;
