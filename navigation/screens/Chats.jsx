import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { db } from '../../FirebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import User from '../components/User';
import Message from '../components/Message';
import MessageForm from '../components/MessageForm';
import { Ionicons } from '@expo/vector-icons';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';

const Chats = ({ navigation, route }) => {
  const [chat, setChat] = useState(null);
  const [text, setText] = useState('');
  const [users, setUsers] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [online, setOnline] = useState({});
  const [user] = useAtom(userAtom);
  const user1 = user?.uid;
  const currentChatIdRef = useRef(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [userUnreadCounts, setUserUnreadCounts] = useState({});

  const getUnreadMessagesCount = async () => {
    if (!user1) return;

    try {
      const msgRef = collection(db, 'messages');
      const q = query(msgRef, where('users', 'array-contains', user1));

      const msgsSnap = await getDocs(q);
      let count = 0;
      const userCounts = {};

      msgsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.lastSender !== user1 && data.lastUnread === true) {
          count++;

          const chatParts = doc.id.split('.');
          const otherUserId = chatParts.find((id) => id !== user1);
          const adId = chatParts[2];

          const chatKey = `${otherUserId}-${adId}`;

          userCounts[chatKey] = (userCounts[chatKey] || 0) + 1;
        }
      });

      setUnreadCount(count);
      setUserUnreadCounts(userCounts);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  useEffect(() => {
    if (user1) {
      getUnreadMessagesCount();
      const unsubscribe = onSnapshot(collection(db, 'messages'), () => {
        getUnreadMessagesCount();
      });

      return () => unsubscribe();
    }
  }, [user1]);

  const deleteConversation = async () => {
    if (!chat) return;

    const chatId = currentChatIdRef.current;
    if (!chatId) return;

    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setMsgs([]);

              const msgsRef = collection(db, 'messages', chatId, 'chat');
              const msgsSnapshot = await getDocs(msgsRef);
              const deletePromises = msgsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
              await Promise.all(deletePromises);

              await deleteDoc(doc(db, 'messages', chatId));

              const inboxRef = collection(db, 'inbox');
              const inboxSnapshot = await getDocs(inboxRef);
              const conversationDoc = inboxSnapshot.docs.find(
                (doc) => doc.data().chatId === chatId
              );
              if (conversationDoc) {
                await deleteDoc(conversationDoc.ref);
              }

              setUsers((prevUsers) =>
                prevUsers.filter((user) => user.ad.adId !== chat.ad.adId)
              );

              setChat(null);
              currentChatIdRef.current = null;
            } catch (error) {
              console.error('Error deleting conversation:', error);
            }
          },
        },
      ]
    );
  };

  const selectUser = async (user) => {
    if (!user || !user.ad) return;

    setChat(user);
    const user2 = user.other.uid;
    const id = user1 > user2
      ? `${user1}.${user2}.${user.ad.adId}`
      : `${user2}.${user1}.${user.ad.adId}`;

    currentChatIdRef.current = id;

    const msgsRef = collection(db, 'messages', id, 'chat');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (querySnapshot) => {
      if (currentChatIdRef.current === id) {
        let msgs = [];
        querySnapshot.forEach((doc) => msgs.push(doc.data()));
        setMsgs(msgs);
      }
    });

    const docSnap = await getDoc(doc(db, 'messages', id));
    if (docSnap.exists()) {
      if (docSnap.data().lastSender !== user1 && docSnap.data().lastUnread) {
        await updateDoc(doc(db, 'messages', id), {
          lastUnread: false,
        });
        getUnreadMessagesCount();
      }
    }
    return () => unsub();
  };

  const getChat = async (ad) => {
    if (!ad || !ad.adId) return;

    const buyer = await getDoc(doc(db, 'users', user1));
    const seller = await getDoc(doc(db, 'users', ad.postedBy));
    setChat({ ad, me: buyer.data(), other: seller.data() });

    const chatId = user1 > ad.postedBy
      ? `${user1}.${ad.postedBy}.${ad.adId}`
      : `${ad.postedBy}.${user1}.${ad.adId}`;

    currentChatIdRef.current = chatId;

    const adRef = doc(db, 'ads', ad.adId);
    const unsubAd = onSnapshot(adRef, async (adSnap) => {
      if (!adSnap.exists() && currentChatIdRef.current === chatId) {
        const chatRef = collection(db, 'messages', chatId, 'chat');
        const chatSnapshot = await getDocs(chatRef);
        const deletePromises = chatSnapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        await deleteDoc(doc(db, 'messages', chatId));
        setChat(null);
        currentChatIdRef.current = null;
      }
    });

    const msgsRef = collection(db, 'messages', chatId, 'chat');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(q, (querySnapshot) => {
      if (currentChatIdRef.current === chatId) {
        let msgs = [];
        querySnapshot.forEach((doc) => msgs.push(doc.data()));
        setMsgs(msgs);
      }
    });

    const docSnap = await getDoc(doc(db, 'messages', chatId));
    if (docSnap.exists()) {
      if (docSnap.data().lastSender !== user1 && docSnap.data().lastUnread) {
        await updateDoc(doc(db, 'messages', chatId), {
          lastUnread: false,
        });
        getUnreadMessagesCount();
      }
    }

    return () => {
      unsubAd();
      unsubMsgs();
    };
  };

  const getList = async () => {
    const msgRef = collection(db, 'messages');
    const q = query(msgRef, where('users', 'array-contains', user1));
    const msgsSnap = await getDocs(q);
    const messages = msgsSnap.docs.map((doc) => doc.data());
    const users = [];
    const unsubscribes = [];

    for (const message of messages) {
      const adRef = doc(db, 'ads', message.ad);
      const meRef = doc(db, 'users', message.users.find((id) => id === user1));
      const otherRef = doc(db, 'users', message.users.find((id) => id !== user1));

      const adDoc = await getDoc(adRef);
      const meDoc = await getDoc(meRef);
      const otherDoc = await getDoc(otherRef);

      if (adDoc.exists() && meDoc.exists() && otherDoc.exists()) {
        users.push({
          ad: adDoc.data(),
          me: meDoc.data(),
          other: otherDoc.data(),
        });

        const unsub = onSnapshot(otherRef, (doc) => {
          setOnline((prev) => ({
            ...prev,
            [doc.data().uid]: doc.data().isOnline,
          }));
        });

        unsubscribes.push(unsub);
      }
    }

    setUsers(users);

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  };

  useEffect(() => {
    if (route.params?.ad) {
      getChat(route.params.ad);
    }
    getList();
  }, [route.params]);

  const handleSubmit = async () => {
    if (!chat || !chat.ad || text.trim() === '') return;

    const user2 = chat.other.uid;
    const chatId = user1 > user2
      ? `${user1}.${user2}.${chat.ad.adId}`
      : `${user2}.${user1}.${chat.ad.adId}`;

    const newMsg = {
      text,
      sender: user1,
      createdAt: new Date(),
      tempId: Date.now(),
    };

    setMsgs((prevMsgs) => [...prevMsgs, newMsg]);
    setText('');

    try {
      await addDoc(collection(db, 'messages', chatId, 'chat'), newMsg);

      await updateDoc(doc(db, 'messages', chatId), {
        lastText: text,
        lastSender: user1,
        lastUnread: true,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMsgs((prevMsgs) => prevMsgs.filter((msg) => msg.tempId !== newMsg.tempId));
    }
  };

  const getUnreadCountForUser = (user) => {
    if (!user || !user.ad || !user.other) return 0;

    const chatKey = `${user.other.uid}-${user.ad.adId}`;
    return userUnreadCounts[chatKey] || 0;
  };

  return (
    <View style={styles.container}>
      <View style={styles.usersContainer}>
        <FlatList
          data={users}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <User
              user={item}
              selectUser={selectUser}
              chat={chat}
              online={online}
              user1={user1}
              unreadCount={getUnreadCountForUser(item)}
            />
          )}
          style={styles.userList}
        />
      </View>
      <View style={styles.chatContainer}>
        {chat ? (
          <>
            <View style={styles.chatHeader}>
              {chat.other.photoUrl ? (
                <Image source={{ uri: chat.other.photoUrl }} style={styles.userImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{chat.other.name?.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatUserName}>{chat.other.name}</Text>
                <Text style={styles.chatUserStatus}>
                  {online[chat.other.uid] ? 'Active now' : 'Offline'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={deleteConversation}
                style={styles.deleteButton}
                accessibilityLabel="Delete Conversation"
              >
                <Ionicons name="trash" size={24} color="red" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={msgs}
              keyExtractor={(item, index) => item.tempId ? item.tempId.toString() : index.toString()}
              renderItem={({ item }) => <Message msg={item} user1={user1} />}
              style={styles.messagesList}
              inverted
            />
            <MessageForm text={text} setText={setText} handleSubmit={handleSubmit} />
          </>
        ) : (
          <View style={styles.noChatContainer}>
            <Text style={styles.noChatText}>Select a user to start conversation</Text>
          </View>
        )}
      </View>
      <View style={styles.chatInfoContainer}>
        {chat && (
          <>
            {chat.other.photoUrl ? (
              <Image source={{ uri: chat.other.photoUrl }} style={styles.userImageLarge} />
            ) : (
              <View style={styles.avatarPlaceholderLarge}>
                <Text style={styles.avatarTextLarge}>{chat.other.name?.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.chatTitle}>{chat.other.name}</Text>
            <Text style={styles.chatStatus}>
              {online[chat.other.uid] ? 'Active now' : 'Offline'}
            </Text>
            <View style={styles.adDetails}>
              <Image
                source={{ uri: chat.ad.images[0]?.url }}
                style={styles.adImage}
              />
              <Text style={styles.adTitle}>{chat.ad.title}</Text>
              <Text style={styles.adPrice}>{chat.ad.price}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  usersContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  userList: {
    flex: 1,
  },
  chatContainer: {
    flex: 2,
    backgroundColor: '#f9f9f9',
    justifyContent: 'flex-start',
    paddingBottom: 60, // Add padding to ensure TextInput is above mobile buttons
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#bbb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatUserName: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatUserStatus: {
    fontSize: 12,
    color: '#888',
  },
  deleteButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  noChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChatText: {
    fontSize: 18,
    color: '#888',
  },
  chatInfoContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    borderLeftWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  userImageLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholderLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#bbb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 32,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 10,
  },
  chatStatus: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  adDetails: {
    alignItems: 'center',
  },
  adImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  adPrice: {
    fontSize: 14,
    color: '#666',
  },
});

export default Chats;
