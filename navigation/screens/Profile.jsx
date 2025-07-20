
import { Text } from '@react-navigation/elements';
import { StyleSheet, View, Button } from 'react-native';
import React from 'react';
import { auth } from '../../FirebaseConfig';

export default function Profile({ route, navigation }) {
  const { user } = route.params || {};

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.replace('Login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome, {user || 'Guest'}!</Text>
      <Button title="Logout" onPress={handleLogout} />
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
