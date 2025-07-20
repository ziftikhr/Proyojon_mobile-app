import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';

const User = ({ user, selectUser, chat, online, user1, unreadCount }) => {
  const isSelected = chat && user.other.uid === chat.other.uid && user.ad.adId === chat.ad.adId;

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={() => selectUser(user)}
    >
      <View style={[styles.avatarWrapper, online[user.other.uid] ? styles.onlineRing : styles.offlineRing]}>
        {user.other.photoUrl ? (
          <Image source={{ uri: user.other.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user.other.name?.charAt(0)}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{user.other.name}</Text>
        <Text style={styles.status}>{online[user.other.uid] ? 'Active now' : 'Offline'}</Text>
      </View>
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  selected: {
    backgroundColor: '#f0f8ff',
  },
  avatarWrapper: {
    borderRadius: 25,
    padding: 2,
    marginRight: 12,
  },
  onlineRing: {
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  offlineRing: {
    borderWidth: 2,
    borderColor: '#ccc',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#bbb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    color: '#888',
  },
  unreadBadge: {
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
    minHeight: 20,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default User;
