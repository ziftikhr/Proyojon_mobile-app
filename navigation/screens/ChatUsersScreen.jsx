import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import User from '../components/User';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';

const ChatUsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [online, setOnline] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [user] = useAtom(userAtom);
  const user1 = user?.uid;

  useEffect(() => {
    if (!user1) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const msgRef = collection(db, 'messages');
    const q = query(
      msgRef,
      where('users', 'array-contains', user1),
      orderBy('lastUpdated', 'desc')
    );

    const unsub = onSnapshot(q, async (msgsSnap) => {
      const userList = [];
      const unreadStatus = {};

      for (const docSnap of msgsSnap.docs) {
        const message = docSnap.data();
        const messageId = docSnap.id;

        // Only mark as unread if last message was not sent by me
        const hasUnread = message.lastUnread === true && message.lastSender !== user1;
        unreadStatus[messageId] = hasUnread;

        const adRef = doc(db, 'ads', message.ad);
        const otherRef = doc(db, 'users', message.users.find((id) => id !== user1));

        const [adDoc, otherDoc] = await Promise.all([getDoc(adRef), getDoc(otherRef)]);

        if (adDoc.exists() && otherDoc.exists()) {
          const userItem = {
            id: messageId,
            ad: adDoc.data(),
            me: user,
            other: otherDoc.data(),
            hasUnread,
            lastUpdated: message.lastUpdated,
          };

          userList.push(userItem);

          // Track online status
          onSnapshot(otherRef, (doc) => {
            setOnline((prev) => ({
              ...prev,
              [doc.data().uid]: doc.data().isOnline,
            }));
          });
        }
      }

      // Sort by unread first, then by lastUpdated
      userList.sort((a, b) => {
        if (a.hasUnread && !b.hasUnread) return -1;
        if (!a.hasUnread && b.hasUnread) return 1;
        return b.lastUpdated - a.lastUpdated;
      });

      setUsers(userList);
      setUnreadMessages(unreadStatus);
      setLoading(false);
    });

    return () => unsub();
  }, [user1]);

  const getUnreadCount = (messageId) => {
    return unreadMessages[messageId] ? 1 : 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="maroon" />
      </View>
    );
  }

  if (!user1) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Login to see chats</Text>
      </View>
    );
  }

  if (users.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>No chats found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.userItemContainer,
              item.hasUnread && styles.unreadContainer,
            ]}
          >
            <User
              user={item}
              online={online}
              user1={user1}
              chat={null}
              selectUser={() =>
                navigation.navigate('ChatMessages', { chatUser: item })
              }
              // unreadCount={getUnreadCount(item.id)}
              hasUnread={item.hasUnread}
            />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
  },
  userItemContainer: {
    backgroundColor: 'transparent',
  },
  unreadContainer: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
});

export default ChatUsersScreen;
