import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Tabs from './navigation/Tabs';
import { Provider } from 'jotai';

export default function App() {
  return (
    <Provider>
      <NavigationContainer>
        <Tabs />
      </NavigationContainer>
    </Provider>
  );
}
