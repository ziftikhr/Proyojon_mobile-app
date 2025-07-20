
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, Image, ActivityIndicator } from 'react-native';
import { auth, db } from '../../FirebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Cart() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserAds = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
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
  }, []);

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
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
        <Text>No ads posted by you.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    padding: 10,
  },
  listContent: {
    paddingBottom: 20,
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
});
