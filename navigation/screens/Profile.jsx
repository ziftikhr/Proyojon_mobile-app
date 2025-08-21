import { Button, Text } from '@react-navigation/elements';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import React, { useEffect, useState } from 'react'
import { auth, db, storage } from '../../FirebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const categories = ["Stationaries", "Books", "Clothes", "Electronics", "Furniture", "Vehicles & Parts", "Games & Hobbies", "Miscellaneous"];

export default function Profile({ navigation }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useAtom(userAtom);
  const [visibleCount, setVisibleCount] = useState(3);
  const [interests, setInterests] = useState([]);
  const [interestModalVisible, setInterestModalVisible] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  
  // Edit Profile states
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    facebook: '',
    instagram: '',
    linkedin: ''
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5);
  };

  const handleInterestChange = (category) => {
    setInterests((prev) =>
      prev.includes(category)
        ? prev.filter((interest) => interest !== category)
        : [...prev, category]
    );
  };

  const saveInterests = async () => {
    try {
      setSavingInterests(true);
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        interests,
      });
      
      setUser(prev => ({ ...prev, interests }));
      
      Alert.alert("Success", "Interests updated successfully");
      setInterestModalVisible(false);
    } catch (error) {
      console.error("Error updating interests:", error);
      Alert.alert("Error", "Failed to update interests");
    } finally {
      setSavingInterests(false);
    }
  };

  // Image picker function
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0]);
    }
  };

  // Upload image function (adapted from your web app)
  const uploadImage = async (imageAsset) => {
    try {
      setUploadingImage(true);
      
      // Convert image to blob
      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();
      
      // Create image reference
      const imgRef = ref(storage, `profile/${Date.now()} - ${imageAsset.fileName || 'profile.jpg'}`);
      
      // Delete old image if exists
      if (user.photoPath) {
        try {
          await deleteObject(ref(storage, user.photoPath));
        } catch (deleteError) {
          console.log("Old image not found or couldn't be deleted:", deleteError);
        }
      }
      
      // Upload image
      const result = await uploadBytes(imgRef, blob);
      
      // Get download URL
      const url = await getDownloadURL(ref(storage, result.ref.fullPath));
      
      // Update user document
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        photoUrl: url,
        photoPath: result.ref.fullPath,
      });

      // Update local user state
      setUser(prev => ({
        ...prev,
        photoUrl: url,
        photoPath: result.ref.fullPath
      }));

      Alert.alert("Success", "Profile photo updated successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Initialize edit profile form
  const openEditProfileModal = () => {
    setProfileForm({
      name: user?.name || '',
      facebook: user?.facebook || '',
      instagram: user?.instagram || '',
      linkedin: user?.linkedin || ''
    });
    setEditProfileModalVisible(true);
  };

  // Save profile changes
  const saveProfileChanges = async () => {
    try {
      setEditingProfile(true);
      
      const updateData = {
        name: profileForm.name,
        facebook: profileForm.facebook,
        instagram: profileForm.instagram,
        linkedin: profileForm.linkedin
      };

      await updateDoc(doc(db, "users", auth.currentUser.uid), updateData);

      // Update local user state
      setUser(prev => ({
        ...prev,
        ...updateData
      }));

      Alert.alert("Success", "Profile updated successfully");
      setEditProfileModalVisible(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setEditingProfile(false);
    }
  };

  const fetchUserAds = async () => {
    try {
      setLoading(true);
      const userId = user?.uid;
      if (!userId) {
        setAds([]);
        setLoading(false);
        return;
      }
      const adsRef = collection(db, 'ads');
      const q = query(adsRef, where('postedBy', '==', userId));
      const querySnapshot = await getDocs(q);
      const adsList = [];
      querySnapshot.forEach((doc) => {
        adsList.push({ id: doc.id, ...doc.data() });
      });
      setAds(adsList);
    } catch (err) {
      setError('Failed to load ads.');
      console.error('Error fetching user ads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAds();
    if (user?.interests) {
      setInterests(user.interests);
    }
  }, [user]);
  
  const renderAdItem = ({ item }) => (
    <View style={styles.adCard}>
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0].url }} style={styles.adImage} />
      ) : (
        <View style={[styles.adImage, styles.noImage]}>
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      )}
      <View style={styles.adInfo}>
        <Text style={styles.adTitle}>{item.title}</Text>
        <Text style={styles.adPrice}>
          {item.Price && item.Price.toLowerCase() === 'free' ? 'Free' : `৳${item.Price}`}
        </Text>
      </View>
    </View>
  );

  const renderEditProfileModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editProfileModalVisible}
      onRequestClose={() => setEditProfileModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.editModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={() => setEditProfileModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.editFormContainer}>
            {/* Profile Image Section */}
            <View style={styles.imageEditSection}>
              <View style={styles.profileImageEdit}>
                {user?.photoUrl ? (
                  <Image source={{ uri: user.photoUrl }} style={styles.editProfileImage} />
                ) : (
                  <View style={styles.editProfileImagePlaceholder}>
                    <Ionicons name="person" size={60} color="#ccc" />
                  </View>
                )}
                {uploadingImage && (
                  <View style={styles.imageUploadOverlay}>
                    <ActivityIndicator color="white" size="large" />
                  </View>
                )}
              </View>
              <TouchableOpacity 
                style={styles.changePhotoButton} 
                onPress={pickImage}
                disabled={uploadingImage}
              >
                <Ionicons name="camera" size={16} color="white" />
                <Text style={styles.changePhotoButtonText}>
                  {uploadingImage ? 'Uploading...' : 'Change Photo'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={profileForm.name}
                onChangeText={(text) => setProfileForm(prev => ({ ...prev, name: text }))}
                placeholder="Enter your name"
              />
            </View>

            {/* Social Media */}
            <View style={styles.socialSection}>
              <Text style={styles.sectionTitle}>Social Media</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Facebook</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileForm.facebook}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, facebook: text }))}
                  placeholder="Facebook profile URL"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Instagram</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileForm.instagram}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, instagram: text }))}
                  placeholder="Instagram profile URL"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>LinkedIn</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileForm.linkedin}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, linkedin: text }))}
                  placeholder="LinkedIn profile URL"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.saveButton, { marginBottom: 10 }]}
              onPress={saveProfileChanges}
              disabled={editingProfile}
            >
              {editingProfile ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditProfileModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderInterestModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={interestModalVisible}
      onRequestClose={() => setInterestModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Your Interests</Text>
            <TouchableOpacity
              onPress={() => setInterestModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.categoriesContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.categoryItem}
                onPress={() => handleInterestChange(category)}
              >
                <View style={styles.checkboxContainer}>
                  <View style={[
                    styles.checkbox,
                    interests.includes(category) && styles.checkboxChecked
                  ]}>
                    {interests.includes(category) && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveInterests}
              disabled={savingInterests}
            >
              {savingInterests ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Interests</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const profile = {
    name: user?.name,
    username: `@${user?.email.split('@')[0]}`,
    bio: user?.interests?.length > 0 ? user.interests.join(" | ") : 'No interests selected yet.',
    profileImage: user?.photoUrl ? (
      <Image
        source={{ uri: user.photoUrl }}
        style={styles.profileImage}
      />
    ) : (
      <Ionicons name="person" size={100} color="#ccc" />
    ),
    location: (user?.location?.city ? user?.location?.city + ', ' : '') + 
              (user?.location?.state ? user?.location?.state + ', ' : '') + 
              (user?.location?.country ? user?.location?.country : 'Not Specified'),
    website: `${user?.email || 'https://example.com'}`,
    social: {
      facebook: user?.facebook || 'https://facebook.com',
      instagram: user?.instagram || 'https://instagram.com',
      linkedin: user?.linkedin || 'https://linkedin.com',
    },
  };

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {user ? (
        <ScrollView>
          <View style={styles.profileHeader}>
            <View style={styles.profileDetails}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.username}>{profile.username}</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
              
              {/* Edit Profile Button */}
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={openEditProfileModal}
              >
                <Ionicons name="create" size={16} color="white" />
                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              
              {/* Interests Section */}
              <View style={styles.interestsSection}>
                <TouchableOpacity
                  style={styles.editInterestsButton}
                  onPress={() => setInterestModalVisible(true)}
                >
                  <Ionicons name="settings" size={16} color="white" />
                  <Text style={styles.editInterestsButtonText}>Edit Interests</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.locationContainer}>
                <Text style={styles.location}>{profile.location}</Text>
              </View>
              
              {profile.website && (
                <TouchableOpacity onPress={() => openLink(profile.website)}>
                  <Text style={styles.website}>{profile.website}</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.socialRow}>
                <View style={styles.socialIcons}>
                  {profile.social.facebook && (
                    <TouchableOpacity onPress={() => openLink(profile.social.facebook)}>
                      <Ionicons name="logo-facebook" size={30} color="black" />
                    </TouchableOpacity>
                  )}
                  {profile.social.instagram && (
                    <TouchableOpacity onPress={() => openLink(profile.social.instagram)}>
                      <Ionicons name="logo-instagram" size={30} color="black" />
                    </TouchableOpacity>
                  )}
                  {profile.social.linkedin && (
                    <TouchableOpacity onPress={() => openLink(profile.social.linkedin)}>
                      <Ionicons name="logo-linkedin" size={30} color="black" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.logoutButton}>
                  <Button title="Logout" color="red" onPress={handleLogout}>Logout</Button>
                </View>
              </View>

            </View>
            
            <View style={styles.profileImageContainer}>
              {profile.profileImage}
            </View>
          </View>

          {/* <View style={styles.postsContainer}>
            <Text style={styles.adsTitle}>My Ads</Text>
            {loading ? (
              <ActivityIndicator size="large" color="maroon" />
            ) : (
              <>
                {ads.slice(0, visibleCount).map((item) => (
                  <View key={item.id} style={styles.adCard}>
                    {item.images?.[0]?.url ? (
                      <Image source={{ uri: item.images[0].url }} style={styles.adImage} />
                    ) : (
                      <View style={[styles.adImage, styles.noImage]}>
                        <Text style={styles.noImageText}>No Image</Text>
                      </View>
                    )}
                    <View style={styles.adInfo}>
                      <Text style={styles.adTitle}>{item.title}</Text>
                      <Text style={styles.adPrice}>
                        {item.Price?.toLowerCase() === 'free' ? 'Free' : `৳${item.Price}`}
                      </Text>
                    </View>
                  </View>
                ))}

                {ads.length > visibleCount && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={handleLoadMore}
                  >
                    <Text style={styles.loadMoreText}>Load More</Text>
                  </TouchableOpacity>
                )}

                {ads.length === 0 && (
                  <Text style={styles.noAdsText}>No ads found.</Text>
                )}
              </>
            )}
          </View> */}
        </ScrollView>
      ) : (
        <View style={styles.unLogged}>
          <Text style={styles.unLoggedText}>Please login to view your profile.</Text>
          <Button title="Login" onPress={() => { navigation.navigate('Login') }}>Login</Button>
        </View>
      )}
      
      {renderEditProfileModal()}
      {renderInterestModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileDetails: {
    flex: 1,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginLeft: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoutButton: {
    marginLeft: 'auto',
    paddingLeft: 115,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 0,
  },
  username: {
    fontSize: 16,
    color: 'gray',
  },
  bio: {
    marginTop: 10,
    textAlign: 'left',
    paddingRight: 20,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 15,
  },
  editProfileButtonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 5,
  },
  interestsSection: {
    marginTop: 15,
    paddingRight: 20,
  },
  interestsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  interestsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  editInterestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  editInterestsButtonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 5,
  },
  locationContainer: {
    marginTop: 10,
  },
  location: {
    fontSize: 16,
    color: 'gray',
  },
  website: {
    marginTop: 10,
    color: 'blue',
    textDecorationLine: 'underline',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingRight: 10,
  },
  socialIcons: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 20,
  },
  postsContainer: {
    padding: 10,
  },
  adsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  unLogged: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unLoggedText: {
    padding: 20,
    textAlign: 'center',
    fontSize: 18,
  },
  adCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  adImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#888',
    fontSize: 12,
  },
  adInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  adTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  adPrice: {
    color: 'green',
    fontSize: 14,
  },
  loadMoreButton: {
    marginTop: 16,
    backgroundColor: '#eee',
    padding: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  loadMoreText: {
    color: '#333',
  },
  noAdsText: {
    textAlign: 'center',
    color: 'gray',
    marginTop: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  editModalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '95%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  editFormContainer: {
    padding: 20,
  },
  imageEditSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageEdit: {
    position: 'relative',
    marginBottom: 15,
  },
  editProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editProfileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
  },
  changePhotoButtonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  locationSection: {
    marginBottom: 25,
  },
  socialSection: {
    marginBottom: 25,
  },
  categoriesContainer: {
    maxHeight: 300,
  },
  categoryItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 3,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  categoryText: {
    fontSize: 16,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});