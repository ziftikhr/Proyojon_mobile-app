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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { storage, db, auth } from '../../FirebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, Timestamp, setDoc, doc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';

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
    Price: '', // Changed from 'price' to 'Price' to match web app
    contactnum: '',
    description: '',
    location: '',
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'We need permission to access your gallery so you can upload images.'
        );
      }
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit reached', 'You can only add up to 5 images');
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

        const newImages = selectedImages.map((asset, index) => ({
          id: `${Date.now()}_${index}`,
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
        }));

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
    const imgs = []; // Match web app structure
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        console.log('Uploading image:', image.name);
        
        // Use fetch with the file URI directly - this works in React Native
        const response = await fetch(image.uri);
        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
          throw new Error('Invalid image blob');
        }

        // Match web app naming convention: `ads/${Date.now()} - ${image.name}`
        const filename = `${Date.now()} - ${image.name}`;
        const imgRef = ref(storage, `ads/${filename}`);
        
        console.log('Uploading to Firebase Storage...');
        const result = await uploadBytes(imgRef, blob);
        const fileUrl = await getDownloadURL(ref(storage, result.ref.fullPath));
        
        // Match web app structure: { url: fileUrl, path: result.ref.fullPath }
        imgs.push({ 
          url: fileUrl, 
          path: result.ref.fullPath 
        });
        
        console.log('Upload successful, URL:', fileUrl);
        
      } catch (error) {
        console.error('Upload error for image', i + 1, ':', error);
        throw new Error(`Failed to upload image ${i + 1}: ${error.message}`);
      }
    }
    return imgs;
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to post an ad.');
      return;
    }
    
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
      
      // Match web app data structure exactly
      const adData = {
        images: imgs, // Array of { url, path } objects
        title: formData.title,
        category: formData.category,
        Price: formData.Price, // Use 'Price' not 'price'
        contactnum: formData.contactnum,
        location: formData.location || 'Location not specified',
        coordinates: null, // You can add location picker later if needed
        description: formData.description,
        isDonated: formData.Price.toLowerCase() === 'free' || formData.Price === '0',
        publishedAt: Timestamp.fromDate(new Date()),
        postedBy: currentUser.uid,
      };
      
      // Add document to 'ads' collection
      const result = await addDoc(collection(db, 'ads'), adData);
      
      // Set adId field (matching web app)
      await setDoc(doc(db, 'ads', result.id), {
        adId: result.id,
      }, { merge: true });

      // Create favorites document (matching web app)
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
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Post New Ad</Text>
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
            onPress={() => setShowCategoryModal(true)}
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
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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