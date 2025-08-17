// components/UpdatesIconWithBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAtom } from 'jotai';
import { updatesCountAtom } from '../../atoms/UpdatesCountAtom';

const UpdatesIconWithBadge = ({ color, size }) => {
  const [updatesCount] = useAtom(updatesCountAtom);

  return (
    <View style={styles.container}>
      <Ionicons name="notifications" size={size} color={color} />
      {updatesCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {updatesCount > 99 ? '99+' : updatesCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default UpdatesIconWithBadge;