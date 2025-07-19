import { Text } from '@react-navigation/elements';
import { StyleSheet, View } from 'react-native';
import React from 'react'

export default function Chats() {
  return (
    <View style={styles.container}>
      <Text>Chats</Text>
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});