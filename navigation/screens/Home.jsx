import { Button, Text } from '@react-navigation/elements';
import { StyleSheet, View } from 'react-native';
import React from 'react'

export default function Home() {
  return (
    <View style={styles.container}>
      <Text>Home Screen</Text>
      <Text>Open up 'src/App.tsx' to start working on your app!</Text>
      <Button screen="Profile" params={{ user: 'jane' }}>
        Go to Profile
      </Button>
      <Button screen="Settings">Go to Settings</Button>
      <Button screen="NotFound">Go to Not Found</Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
});