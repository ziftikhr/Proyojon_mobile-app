import { Text } from '@react-navigation/elements';
import { StyleSheet, View } from 'react-native';
import React from 'react'

export default function Profile({ route }) {
  const { user } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome, {user || 'Guest'}!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
});