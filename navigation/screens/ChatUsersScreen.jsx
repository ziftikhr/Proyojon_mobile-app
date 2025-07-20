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
} from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import User from '../components/User';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';

const ChatUsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [online, setOnline] = useState({});
  const [loading, setLoading] = useState(true);
  const [user] = useAtom(userAtom);
  const user1 = user?.uid;

  useEffect(() => {
    const getList = async () => {
      if (!user1) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const msgRef = collection(db, 'messages');
        const q = query(msgRef, where('users', 'array-contains', user1));
        const msgsSnap = await getDocs(q);
        const messages = msgsSnap.docs.map((doc) => doc.data());
        const userList = [];

        for (const message of messages) {
          const adRef = doc(db, 'ads', message.ad);
          const meRef = doc(db, 'users', message.users.find((id) => id === user1));
          const otherRef = doc(db, 'users', message.users.find((id) => id !== user1));

          const [adDoc, meDoc, otherDoc] = await Promise.all([
            getDoc(adRef),
            getDoc(meRef),
            getDoc(otherRef),
          ]);

          if (adDoc.exists() && meDoc.exists() && otherDoc.exists()) {
            userList.push({
              ad: adDoc.data(),
              me: meDoc.data(),
              other: otherDoc.data(),
            });

            onSnapshot(otherRef, (doc) => {
              setOnline((prev) => ({
                ...prev,
                [doc.data().uid]: doc.data().isOnline,
              }));
            });
          }
        }

        setUsers(userList);
      } catch (err) {
        console.error('Error fetching chat users:', err);
      } finally {
        setLoading(false);
      }
    };

    getList();
  }, [user1]);

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
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <User
            user={item}
            online={online}
            user1={user1}
            chat={null}
            selectUser={() => navigation.navigate('ChatMessages', { chatUser: item })}
            unreadCount={0}
          />
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
});

export default ChatUsersScreen;
