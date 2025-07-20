import { Button, Text } from '@react-navigation/elements';
import { StyleSheet, View } from 'react-native';
import React from 'react'

export default function Home() {
  return (
    <View style={styles.container}>
      <Text>Home Screen</Text>
      <Button screen="Profile" color='green'>Go to Profile</Button>
      <Button screen="Settings" color='gray'>Go to Settings</Button>
      <Button screen="NotFound" color='crimson'>Go to Not Found</Button>
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