import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  TouchableOpacity,
  Animated
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { db } from '../../FirebaseConfig';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, getDoc, doc
} from 'firebase/firestore';
import Message from '../components/Message';
import MessageForm from '../components/MessageForm';
import { Ionicons } from '@expo/vector-icons';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';

const ChatMessagesScreen = () => {

  const animatedBottom = useRef(new Animated.Value(0)).current;

  const { params } = useRoute();
  const { chatUser } = params;
  const navigation = useNavigation();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [user] = useAtom(userAtom);
  const user1 = user?.uid;
  const chatIdRef = useRef(null);
  const flatListRef = useRef();

  useEffect(() => {
    const user2 = chatUser.other.uid;
    const chatId = user1 > user2
      ? `${user1}.${user2}.${chatUser.ad.adId}`
      : `${user2}.${user1}.${chatUser.ad.adId}`;
    chatIdRef.current = chatId;

    const q = query(collection(db, 'messages', chatId, 'chat'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const newMsgs = snapshot.docs.map((doc) => doc.data());
      setMsgs(newMsgs);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const checkAndResetUnread = async () => {
      const docSnap = await getDoc(doc(db, 'messages', chatId));
      if (docSnap.exists() && docSnap.data().lastSender !== user1 && docSnap.data().lastUnread) {
        await updateDoc(doc(db, 'messages', chatId), { lastUnread: false });
      }
    };

    checkAndResetUnread();

    return () => unsub();
  }, []);

  useEffect(() => {
  const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
    Animated.timing(animatedBottom, {
      toValue: e.endCoordinates.height + 10, // Add some padding
      duration: 250,
      useNativeDriver: false,
    }).start();
  });

  const hideSub = Keyboard.addListener('keyboardDidHide', () => {
    Animated.timing(animatedBottom, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  });

  return () => {
    showSub.remove();
    hideSub.remove();
  };
}, []);


  const handleSubmit = async () => {
    const chatId = chatIdRef.current;
    const msg = {
      text,
      sender: user1,
      createdAt: new Date(),
      tempId: Date.now(),
    };

    setMsgs((prev) => [...prev, msg]);
    setText('');

    try {
      await addDoc(collection(db, 'messages', chatId, 'chat'), msg);
      await updateDoc(doc(db, 'messages', chatId), {
        lastText: text,
        lastSender: user1,
        lastUnread: true,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: chatUser.other.name,
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('ChatDetails', { chatUser })}>
          <Ionicons name="information-circle-outline" size={24} color="maroon" style={{ marginRight: 10 }} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={msgs}
        keyExtractor={(item, index) => item.tempId?.toString() || index.toString()}
        renderItem={({ item }) => <Message msg={item} user1={user1} />}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
      />
      <Animated.View style={[styles.formContainer, { marginBottom: animatedBottom }]}>
        <MessageForm text={text} setText={setText} handleSubmit={handleSubmit} />
      </Animated.View>
    </View>
  </TouchableWithoutFeedback>
);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  formContainer: {
    padding: 10,
    // borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
});

export default ChatMessagesScreen;
