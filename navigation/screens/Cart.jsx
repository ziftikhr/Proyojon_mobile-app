import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, FlatList,
  Image, ActivityIndicator, TouchableOpacity, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../FirebaseConfig';
import { collection, query, where, getDocs, documentId, doc, deleteDoc } from 'firebase/firestore';
import { userAtom } from '../../atoms/userAtom';
import { useAtom } from 'jotai';
import { Ionicons } from '@expo/vector-icons';

export default function Cart() {
  const navigation = useNavigation();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useAtom(userAtom);
  const [activeTab, setActiveTab] = useState('favorites');
  const [deletingId, setDeletingId] = useState(null); // Track which ad is being deleted

  const fetchUserAds = async () => {
    try {
      setLoading(true);
      if (!user?.uid) return setAds([]);
      const adsRef = collection(db, 'ads');
      const q = query(adsRef, where('postedBy', '==', user.uid));
      const snapshot = await getDocs(q);
      const adsList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAds(adsList);
    } catch (err) {
      setError('Failed to load ads.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteAds = async () => {
    try {
      setLoading(true);
      if (!user?.uid) return setAds([]);
      const favRef = collection(db, "favorites");
      const q = query(favRef, where("users", "array-contains", user.uid));
      const favSnapshot = await getDocs(q);

      let promises = favSnapshot.docs.map((doc) => {
        const adsRef = collection(db, "ads");
        const adsQuery = query(adsRef, where(documentId(), "==", doc.id));
        return {
          adsQuery,
          usersCount: doc.data().users.length,
        };
      });

      const docs = await Promise.all(
        promises.map(({ adsQuery }) => getDocs(adsQuery))
      );

      let ads = [];
      docs.forEach((dSnap, i) => {
        dSnap.forEach((adDoc) => {
          ads.push({
            id: adDoc.id,
            ...adDoc.data(),
            usersCount: promises[i].usersCount,
          });
        });
      });

      setAds(ads);
    } catch (err) {
      setError('Failed to load favorites.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAd = async (adId, adTitle) => {
    Alert.alert(
      'Delete Ad',
      `Are you sure you want to delete "${adTitle}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(adId);
              
              // Delete the ad document
              const adDocRef = doc(db, 'ads', adId);
              await deleteDoc(adDocRef);
              
              // Also delete from favorites collection if it exists
              try {
                const favDocRef = doc(db, 'favorites', adId);
                await deleteDoc(favDocRef);
              } catch (favError) {
                // It's okay if favorites document doesn't exist
                console.log('No favorites document to delete');
              }
              
              // Remove from local state
              setAds(prevAds => prevAds.filter(ad => ad.id !== adId));
              
              Alert.alert('Success', 'Ad deleted successfully!');
            } catch (error) {
              console.error('Error deleting ad:', error);
              Alert.alert('Error', 'Failed to delete ad. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (activeTab === 'myAds') {
      fetchUserAds();
    } else {
      fetchFavoriteAds();
    }
  }, [user, activeTab]);

  const renderAdItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.adCard}
      onPress={() => navigation.navigate('AdDetails', { adId: item.id })}
    >
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
          {item.Price?.toLowerCase() === 'free' ? 'Free' : `৳${item.Price}`}
        </Text>
        {item.usersCount && (
          <View style={styles.favoriteCount}>
            <Ionicons name="heart" size={14} color="#ff4444" />
            <Text style={styles.favoriteCountText}>{item.usersCount}</Text>
          </View>
        )}
      </View>
      
      {/* Delete button - only show for user's own ads */}
      {activeTab === 'myAds' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteAd(item.id, item.title)}
            disabled={deletingId === item.id}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="trash" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'myAds' && styles.activeTab]}
        onPress={() => setActiveTab('myAds')}
      >
        <Text style={activeTab === 'myAds' ? styles.activeTabText : styles.tabText}>
          My Ads
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'favorites' && styles.activeTab]}
        onPress={() => setActiveTab('favorites')}
      >
        <Text style={activeTab === 'favorites' ? styles.activeTabText : styles.tabText}>
          Favorites
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="maroon" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (ads.length === 0) {
    return (
      <View style={styles.centered}>
        {renderTabs()}
        <Text>{activeTab === 'myAds' ? 'No ads posted by you.' : 'No favorites found.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderTabs()}
      <FlatList
        data={ads}
        keyExtractor={(item) => item.id}
        renderItem={renderAdItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  adCard: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  adImage: {
    width: 100,
    height: 100,
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ccc',
  },
  noImageText: {
    color: '#666',
  },
  adInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  adTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  adPrice: {
    marginTop: 5,
    fontSize: 14,
    color: '#333',
  },
  favoriteCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  favoriteCountText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#555',
  },
  actionsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#eee',
  },
  activeTab: {
    backgroundColor: 'maroon',
  },
  tabText: {
    color: '#555',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
});