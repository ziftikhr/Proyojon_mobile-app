import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';

const User = ({ user, selectUser, chat, online, user1, unreadCount, hasUnread, onLongPress }) => {
  const isSelected =
    chat?.other?.uid === user.other.uid && chat?.ad?.adId === user.ad.adId;

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        isSelected && styles.selected,
        hasUnread && styles.unreadContainer // Add unread highlighting
      ]}
      onPress={() => selectUser(user)}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <View style={[
        styles.avatarWrapper, 
        online[user.other.uid] ? styles.onlineRing : styles.offlineRing
      ]}>
        {user.other.photoUrl ? (
          <Image source={{ uri: user.other.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user.other.name?.charAt(0)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={[
          styles.name,
          hasUnread && styles.unreadText // Bold text for unread
        ]}>
          {user.other.name}
        </Text>
        <Text style={[
          styles.status,
          hasUnread && styles.unreadStatusText // Slightly darker status for unread
        ]}>
          {online[user.other.uid] ? 'Active now' : 'Offline'}
        </Text>
      </View>
      
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
        </View>
      )}
      
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: user.ad.images[0]?.url }} style={styles.avatarRight} />
      </View>
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
  // New unread container style - Messenger-like highlighting
  unreadContainer: {
    backgroundColor: '#f0f8ff', // Light blue background
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2', // Blue left border
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
  avatarRight: {
    width: 46,
    height: 46,
    borderRadius: 15,
    marginLeft: 'auto',
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
  // Bold text for unread messages
  unreadText: {
    fontWeight: 'bold',
    color: '#000', // Darker color for better contrast
  },
  status: {
    fontSize: 12,
    color: '#888',
  },
  // Slightly darker status text for unread messages
  unreadStatusText: {
    color: '#666',
    fontWeight: '500',
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
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default User;