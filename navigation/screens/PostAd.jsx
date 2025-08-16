import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Button } from '@react-navigation/elements';
import * as ImagePicker from 'expo-image-picker';
import { storage, db } from '../../FirebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, Timestamp, setDoc, doc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';

const categories = [
  'Stationaries',
  'Books',
  'Clothes',
  'Electronics',
  'Furniture',
  'Vehicles & Parts',
  'Games & Hobbies',
  'Miscellaneous',
];

const PostAd = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    Price: '',
    contactnum: '',
    description: '',
    location: '',
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [user] = useAtom(userAtom);

  // Image picker permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'We need permission to access your gallery so you can upload images.'
        );
      }
    };
    
    if (user) {
      requestPermissions();
    }
  }, [user]);

  const pickImages = async () => {

    if (images.length >= 5) {
      Alert.alert('Limit reached', 'You can only add up to 5 images');
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const remainingSlots = 5 - images.length;
        const selectedImages = result.assets.slice(0, remainingSlots);

        if (result.assets.length > remainingSlots) {
          Alert.alert(
            'Selection Limited',
            `You can only add ${remainingSlots} more image(s). Only the first ${remainingSlots} selected images will be added.`
          );
        }

        const newImages = selectedImages.map((asset, index) => {
          const uriParts = asset.uri.split('/');
          const fileName = asset.fileName || uriParts[uriParts.length - 1];

          return {
            id: `${Date.now()}_${index}`,
            uri: asset.uri,
            name: fileName,
          };
        });

        setImages(prevImages => [...prevImages, ...newImages]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images: ' + error.message);
    }
  };

  const removeImage = (imageId) => {
    setImages(prevImages => prevImages.filter(image => image.id !== imageId));
  };

  const uploadImages = async () => {
    const imgs = [];

    if (!storage) {
      throw new Error("Firebase storage is not initialized");
    }

    console.log(`Starting upload of ${images.length} images...`);

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        if (!image || !image.uri) {
          throw new Error(`Invalid image object at index ${i}`);
        }

        const uriParts = image.uri.split("/");
        const originalName = uriParts[uriParts.length - 1] || `image_${Date.now()}.jpg`;
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const filename = `${timestamp}-${randomId}-${originalName}`;

        console.log(`Uploading image ${i + 1}:`, filename);

        const response = await fetch(image.uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log(`Blob created - Size: ${blob.size}, Type: ${blob.type}`);

        if (!blob || blob.size === 0) {
          throw new Error("Invalid image blob - size is 0");
        }

        const storagePath = `ads/${filename}`;
        const imgRef = ref(storage, storagePath);
        
        const metadata = {
          contentType: blob.type || 'image/jpeg',
          customMetadata: {
            uploadedAt: new Date().toISOString(),
            originalName: originalName,
            uploadedBy: user.uid
          }
        };

        console.log(`Uploading to path: ${storagePath}`);
        const result = await uploadBytes(imgRef, blob, metadata);
        
        // Fixed: Use result.ref instead of imgRef
        const fileUrl = await getDownloadURL(result.ref);

        imgs.push({
          url: fileUrl,
          path: result.metadata.fullPath,
        });

        console.log(`✅ Upload ${i + 1} successful:`, fileUrl);
      } catch (error) {
        console.error(`❌ Upload error for image ${i + 1}:`, error);
        throw new Error(`Failed to upload image ${i + 1}: ${error.message}`);
      }
    }

    console.log(`✅ All uploads completed. Total: ${imgs.length} images`);
    return imgs;
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.Price || !formData.contactnum) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      let imgs = [];
      if (images.length > 0) {
        imgs = await uploadImages();
      }
      
      const adData = {
        images: imgs,
        title: formData.title,
        category: formData.category,
        Price: formData.Price,
        contactnum: formData.contactnum,
        location: formData.location || 'Location not specified',
        coordinates: null,
        description: formData.description,
        isDonated: formData.Price.toLowerCase() === 'free' || formData.Price === '0',
        publishedAt: Timestamp.fromDate(new Date()),
        postedBy: user.uid,
        userEmail: user.email || null, // Add user email for reference
      };
      
      const result = await addDoc(collection(db, 'ads'), adData);
      
      await setDoc(doc(db, 'ads', result.id), {
        adId: result.id,
      }, { merge: true });

      await setDoc(doc(db, 'favorites', result.id), {
        users: []
      });
      
      Alert.alert('Success', 'Your ad has been posted successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
      
      // Reset form
      setFormData({
        title: '',
        category: '',
        Price: '',
        contactnum: '',
        description: '',
        location: '',
      });
      setImages([]);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {user? (<KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Post New Ad</Text>
          <Text style={styles.userInfo}>Logged in as: {user.email}</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Image Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({images.length}/5)</Text>
            <View style={styles.imageContainer}>
              {images.map((image) => (
                <View key={image.id} style={styles.imageWrapper}>
                  <Image source={{ uri: image.uri }} style={styles.image} />
                  <TouchableOpacity 
                    style={styles.removeButton} 
                    onPress={() => removeImage(image.id)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity style={styles.imageButton} onPress={pickImages}>
                  <Text style={styles.imageButtonText}>📷 Add from Gallery</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>

            <TextInput
              style={styles.input}
              placeholder="Title *"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />

            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                  setShowCategoryModal(true);
              }}
            >
              <Text style={{ color: formData.category ? '#000' : '#888' }}>
                {formData.category || 'Select Category *'}
              </Text>
            </TouchableOpacity>

            <Modal
              visible={showCategoryModal}
              transparent
              animationType="slide"
              onRequestClose={() => setShowCategoryModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>Select Category</Text>
                  <FlatList
                    data={categories}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.modalItem}
                        onPress={() => {
                          setFormData({ ...formData, category: item });
                          setShowCategoryModal(false);
                        }}
                      >
                        <Text style={styles.modalItemText}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                    <Text style={styles.modalCancel}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <TextInput
              style={styles.input}
              placeholder="Price * (Type Free to Donate)"
              value={formData.Price}
              onChangeText={(text) => setFormData({ ...formData, Price: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Contact Number *"
              value={formData.contactnum}
              onChangeText={(text) => setFormData({ ...formData, contactnum: text })}
              keyboardType="phone-pad"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Item Description & Specific Address *"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={4}
            />

            <TextInput
              style={styles.input}
              placeholder="Location"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#800d0dff" />
            ) : (
              <Text style={styles.submitButtonText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>) : (
      <View style={styles.unLogged}>
        <Text style={{padding: 20, textAlign: 'center', fontSize: 18}}>Please login to view your profile.</Text>
        <Button title="Login" onPress={() => {navigation.navigate('Login')}} >Login</Button>
      </View>
    )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  unLogged: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#800d0dff',
    marginBottom: 20,
  },
  authMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#800d0dff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#800d0dff',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    fontSize: 12,
    color: '#ffcccc',
    marginTop: 5,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  imageButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
    minWidth: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButtonText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    justifyContent: 'center',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#800d0dff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    width: '80%',
    maxHeight: '60%',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
  modalCancel: {
    marginTop: 15,
    textAlign: 'center',
    color: '#800d0d',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PostAd;