import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
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
  deleteDoc,
  limit,
  startAfter,
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [user] = useAtom(userAtom);
  const user1 = user?.uid;

  const CHATS_PER_PAGE = 10;

  // 🔹 First Page (real-time)
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
      orderBy('lastUpdated', 'desc'),
      limit(CHATS_PER_PAGE)
    );

    const unsub = onSnapshot(q, async (msgsSnap) => {
      const userList = [];
      const unreadStatus = {};

      let lastDoc = null;

      for (const docSnap of msgsSnap.docs) {
        const message = docSnap.data();
        const messageId = docSnap.id;

        // Unread check
        const hasUnread =
          message.lastUnread === true && message.lastSender !== user1;
        unreadStatus[messageId] = hasUnread;

        const adRef = doc(db, 'ads', message.ad);
        const otherRef = doc(
          db,
          'users',
          message.users.find((id) => id !== user1)
        );

        const [adDoc, otherDoc] = await Promise.all([
          getDoc(adRef),
          getDoc(otherRef),
        ]);

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

          // Online tracking
          onSnapshot(otherRef, (doc) => {
            setOnline((prev) => ({
              ...prev,
              [doc.data().uid]: doc.data().isOnline,
            }));
          });
        }

        lastDoc = docSnap; // track last
      }

      // Sort unread first
      userList.sort((a, b) => {
        if (a.hasUnread && !b.hasUnread) return -1;
        if (!a.hasUnread && b.hasUnread) return 1;
        return b.lastUpdated - a.lastUpdated;
      });

      setUsers(userList);
      setUnreadMessages(unreadStatus);
      setLastVisible(lastDoc);
      setHasMore(msgsSnap.docs.length === CHATS_PER_PAGE);
      setLoading(false);
    });

    return () => unsub();
  }, [user1]);

  // 🔹 Load more (pagination)
  const loadMore = async () => {
    if (loadingMore || !hasMore || !lastVisible) return;

    setLoadingMore(true);

    try {
      const msgRef = collection(db, 'messages');
      const q = query(
        msgRef,
        where('users', 'array-contains', user1),
        orderBy('lastUpdated', 'desc'),
        startAfter(lastVisible),
        limit(CHATS_PER_PAGE)
      );

      const msgsSnap = await getDocs(q);

      const newUsers = [];
      const unreadStatus = {};

      let lastDoc = null;

      for (const docSnap of msgsSnap.docs) {
        const message = docSnap.data();
        const messageId = docSnap.id;

        const hasUnread =
          message.lastUnread === true && message.lastSender !== user1;
        unreadStatus[messageId] = hasUnread;

        const adRef = doc(db, 'ads', message.ad);
        const otherRef = doc(
          db,
          'users',
          message.users.find((id) => id !== user1)
        );

        const [adDoc, otherDoc] = await Promise.all([
          getDoc(adRef),
          getDoc(otherRef),
        ]);

        if (adDoc.exists() && otherDoc.exists()) {
          const userItem = {
            id: messageId,
            ad: adDoc.data(),
            me: user,
            other: otherDoc.data(),
            hasUnread,
            lastUpdated: message.lastUpdated,
          };

          newUsers.push(userItem);

          onSnapshot(otherRef, (doc) => {
            setOnline((prev) => ({
              ...prev,
              [doc.data().uid]: doc.data().isOnline,
            }));
          });
        }

        lastDoc = docSnap;
      }

      setUsers((prev) => [...prev, ...newUsers]);
      setUnreadMessages((prev) => ({ ...prev, ...unreadStatus }));
      setLastVisible(lastDoc);
      setHasMore(msgsSnap.docs.length === CHATS_PER_PAGE);
    } catch (err) {
      console.error('Error loading more chats:', err);
    }

    setLoadingMore(false);
  };

  // 🔹 Delete Chat
  const handleDeleteChat = (chatId) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'messages', chatId));
            } catch (err) {
              console.error('Error deleting chat:', err);
            }
          },
        },
      ],
      { cancelable: true }
    );
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
          <User
            user={item}
            online={online}
            user1={user1}
            chat={null}
            hasUnread={item.hasUnread}
            selectUser={() =>
              navigation.navigate('ChatMessages', { chatUser: item })
            }
            onLongPress={() => handleDeleteChat(item.id)}
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="maroon" style={{ margin: 10 }} />
          ) : null
        }
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
});

export default ChatUsersScreen;
