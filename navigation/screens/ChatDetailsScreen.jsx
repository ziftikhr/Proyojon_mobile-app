import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const ChatDetailsScreen = () => {
  const { params } = useRoute();
  const { chatUser } = params;

  return (
    <View style={styles.container}>
      {chatUser.other.photoUrl ? (
        <Image source={{ uri: chatUser.other.photoUrl }} style={styles.userImage} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{chatUser.other.name?.charAt(0)}</Text>
        </View>
      )}
      <Text style={styles.userName}>{chatUser.other.name}</Text>
      <Text style={styles.status}>Status: {chatUser.other.isOnline ? 'Online' : 'Offline'}</Text>

      <View style={styles.iconsSection}>
        <Ionicons name="call" size={24} color="black" />
        <Ionicons name="mail" size={24} color="black" />
        <Ionicons name="videocam" size={24} color="black" />
      </View>

      <View style={styles.adSection}>
        <Image source={{ uri: chatUser.ad.images[0]?.url }} style={styles.adImage} />
        <Text style={styles.adTitle}>{chatUser.ad.title}</Text>
        <Text style={styles.adPrice}>৳ {chatUser.ad.price}</Text>
      </View>

      <View style={styles.iconsSection}>
        <Ionicons name="trending-down" size={24} color="red" />
        <Ionicons name="trash" size={24} color="black" />
        <Ionicons name="trending-up" size={24} color="green" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center' },
  userImage: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#bbb', justifyContent: 'center', alignItems: 'center',
  },
  iconsSection: {
    flexDirection: 'row', justifyContent: 'space-around',
    width: '100%', marginVertical: 20,
    paddingHorizontal: 20,
  },
  avatarText: { color: '#fff', fontSize: 32 },
  userName: { fontSize: 22, fontWeight: '700', marginTop: 10 },
  status: { fontSize: 16, color: '#888', marginBottom: 20 },
  adSection: { alignItems: 'center' },
  adImage: { width: 200, height: 150, borderRadius: 10 },
  adTitle: { fontSize: 18, fontWeight: '600', marginTop: 10 },
  adPrice: { fontSize: 16, color: '#444', marginTop: 4 },
});

export default ChatDetailsScreen;
