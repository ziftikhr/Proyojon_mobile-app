import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';

const ChatIconWithBadge = ({ onPress }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [user] = useAtom(userAtom);
  const user1 = user?.uid;

  useEffect(() => {
    if (!user1) {
      setUnreadCount(0);
      return;
    }

    const msgRef = collection(db, 'messages');
    const q = query(
      msgRef,
      where('users', 'array-contains', user1),
      orderBy('lastUpdated', 'desc')
    );

    const unsub = onSnapshot(q, (msgsSnap) => {
      let count = 0;
      
      msgsSnap.docs.forEach((docSnap) => {
        const message = docSnap.data();
        // Only count as unread if last message was not sent by current user
        const hasUnread = message.lastUnread === true && message.lastSender !== user1;
        if (hasUnread) {
          count++;
        }
      });

      setUnreadCount(count);
    });

    return () => unsub();
  }, [user1]);

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="chatbubbles" size={24} color="#800d0dff" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
});

export default ChatIconWithBadge;