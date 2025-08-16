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
} from 'react-native';
import React, { useEffect, useState } from 'react'
import { auth, db } from '../../FirebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';
import { Ionicons } from '@expo/vector-icons';

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
      
      // Update the user atom with new interests
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
    // Initialize interests from user data
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
              (user?.location?.country ? user?.location?.country : 'Not specified'),
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
              
              {/* Interests Section */}
              <View style={styles.interestsSection}>
                <Text style={styles.interestsTitle}>Interests:</Text>
                <Text style={styles.interestsText}>
                  {user?.interests?.length > 0 ? user.interests.join(", ") : "No interests selected yet."}
                </Text>
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
                <Button title="Logout" color='red' onPress={handleLogout}>Logout</Button>
              </View>
            </View>
            
            <View style={styles.profileImageContainer}>
              {profile.profileImage}
            </View>
          </View>

          <View style={styles.postsContainer}>
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
          </View>
        </ScrollView>
      ) : (
        <View style={styles.unLogged}>
          <Text style={styles.unLoggedText}>Please login to view your profile.</Text>
          <Button title="Login" onPress={() => { navigation.navigate('Login') }}>Login</Button>
        </View>
      )}
      
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
    marginTop: 15,
    alignSelf: 'flex-start',
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
});