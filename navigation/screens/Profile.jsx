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
} from 'react-native';
import React, { useEffect, useState } from 'react'
import { auth, db } from '../../FirebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';
import { Ionicons } from '@expo/vector-icons';

// /**
//  * @typedef {Object} Post
//  * @property {number} id
//  * @property {string} content
//  * @property {string} [image]
//  */

/**
 * @typedef {Object} Profile
 * @property {string} name
 * @property {string} username
 * @property {string} bio
 * @property {string} profileImage
 * @property {string} location
 * @property {string} [website]
 * @property {{ twitter?: string, github?: string, linkedin?: string }} social
 /** @property {Post[]} posts
 */

export default function Profile({ navigation }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useAtom(userAtom);
  const [visibleCount, setVisibleCount] = useState(3);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      // navigation.goBack();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5); // load 5 more each time
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

  const profile = {
    name: user?.name,
    username: `@${user?.email.split('@')[0]}`,
    bio: user?.interests?.map((interest) => interest + " | ") || 'No interest provided.',
    profileImage: user?.photoUrl ? (
      <Image
        source={{ uri: user.photoUrl }}
        style={styles.profileImage}
      />
    ) : (
      <Ionicons name="person" size={100} color="#ccc" />
    ),
    location: (user?.location?.city ? user?.location?.city + ', ' : '') + (user?.location?.state ? user?.location?.state + ', ' : '') + (user?.location?.country ? user?.location?.country : 'Not specified'),
    website: `${user?.email || 'https://example.com'}`,
    social: {
      facebook: user?.facebook || 'https://facebook.com',
      instagram: user?.instagram || 'https://instagram.com',
      linkedin: user?.linkedin || 'https://linkedin.com',
    },
    // posts: [
    //   { id: 1, content: 'Hello World!', image: 'https://via.placeholder.com/150' },
    //   { id: 2, content: 'My first post!', image: 'https://via.placeholder.com/150' },
    //   { id: 3, content: 'Loving React Native!', image: 'https://via.placeholder.com/150' },
    // ],
  };

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    // <View style={styles.container}>
    //   <Text style={styles.text}>Welcome, {user?.email || 'Guest'}!</Text>
    //   {user?.email ? (
    //     <Button title="Logout" color='red' onPress={handleLogout} >Logout</Button>
    //   ) : (
    //     <Button title="Login" onPress={() => {navigation.navigate('Login')}} >Login</Button>
    //   )}
    // </View>
  <SafeAreaView style={styles.container}>
      {user ? (
        <ScrollView>
          <View style={styles.profileHeader}>
            <View style={styles.profileDetails}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.username}>{profile.username}</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
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
            <View style={styles.logoutButton}>
              <Button title="Logout" color='red' onPress={handleLogout} >Logout</Button>
            </View>
            </View>
          </View>
          <View style={styles.profileImage}>
            {profile.profileImage}
          </View>
        </View>

        <View style={styles.postsContainer}>
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
                  style={{
                    marginTop: 16,
                    backgroundColor: '#eee',
                    padding: 12,
                    alignItems: 'center',
                    borderRadius: 6,
                  }}
                  onPress={handleLoadMore}
                >
                  <Text style={{ color: '#333' }}>Load More</Text>
                </TouchableOpacity>
              )}

              {ads.length === 0 && (
                <Text style={{ textAlign: 'center', color: 'gray', marginTop: 20 }}>No ads found.</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>) : (
        <View style={styles.unLogged}>
          <Text style={{padding: 20, textAlign: 'center', fontSize: 18}}>Please login to view your profile.</Text>
          <Button title="Login" onPress={() => {navigation.navigate('Login')}} >Login</Button>
        </View>
      )}
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
    flex:1,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginLeft: 10,
  },
  logoutButton: {
    marginLeft: 100,
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
  socialIcon: {
    fontSize: 30,
    marginHorizontal: 10,
  },
  postsContainer: {
    padding: 10,
  },
  post: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
    padding: 10,
  },
  postContent: {
    fontSize: 16,
    marginBottom: 5,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 5,
  },
  unLogged: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

});