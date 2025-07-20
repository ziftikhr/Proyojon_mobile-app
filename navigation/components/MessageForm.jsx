import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MessageForm = ({ text, setText, handleSubmit }) => {
  return (
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type here..."
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity onPress={handleSubmit} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="maroon" />
        </TouchableOpacity>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    marginLeft: 8,
  },
});

export default MessageForm;
