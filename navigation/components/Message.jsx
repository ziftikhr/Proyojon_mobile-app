import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const Message = ({ msg, user1 }) => {
  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(scrollAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [msg]);

  const isSender = msg.sender === user1;

  // Format date to a readable string
  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : date;
    return d.toLocaleString();
  };

  return (
    <Animated.View
      style={[
        styles.messageContainer,
        isSender ? styles.messageRight : styles.messageLeft,
        { opacity: scrollAnim },
      ]}
    >
      <View style={[styles.bubble, isSender ? styles.bubbleRight : styles.bubbleLeft]}>
        <Text style={[styles.messageText, isSender ? styles.textRight : styles.textLeft]}>
          {msg.text}
        </Text>
        {msg.createdAt && (
          <Text style={styles.timeText}>
            {formatDate(msg.createdAt)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    marginHorizontal: 10,
    maxWidth: '75%',
  },
  messageLeft: {
    alignSelf: 'flex-start',
  },
  messageRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bubbleLeft: {
    backgroundColor: '#e5e5ea',
  },
  bubbleRight: {
    backgroundColor: '#007aff',
  },
  messageText: {
    fontSize: 16,
  },
  textLeft: {
    color: '#000',
  },
  textRight: {
    color: '#fff',
  },
  timeText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
});

export default Message;
