import { Button, Text } from '@react-navigation/elements';
import { StyleSheet, View } from 'react-native';
import React from 'react'
import { auth } from '../../FirebaseConfig';
import { signOut } from 'firebase/auth';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';

export default function Profile({ navigation }) {
  const [user, setUser] = useAtom(userAtom);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigation.goBack();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome, {user?.email || 'Guest'}!</Text>
      {user?.email ? (
        <Button title="Logout" onPress={handleLogout} >Logout</Button>
      ) : (
        <Button title="Login" onPress={() => {navigation.navigate('Login')}} >Login</Button>
      )}
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