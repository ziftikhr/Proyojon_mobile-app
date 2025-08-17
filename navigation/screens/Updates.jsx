import { Text } from '@react-navigation/elements';
import { 
  StyleSheet, 
  View, 
  ActivityIndicator, 
  Image, 
  TouchableOpacity,
  RefreshControl, 
  FlatList
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';
import { updatesCountAtom } from '../../atoms/UpdatesCountAtom'; // Import the new atom
import { Ionicons } from '@expo/vector-icons';

export default function Updates({ navigation }) {
  const [user] = useAtom(userAtom);
  const [interestedAds, setInterestedAds] = useState([]);
  const [updatesCount, setUpdatesCount] = useAtom(updatesCountAtom); // Use the atom
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const ADS_PER_PAGE = 4;

  const fetchInterestedAds = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setLastVisible(null);
        setHasMore(true);
      }
      setError(null);

      if (!user?.interests || user.interests.length === 0) {
        setInterestedAds([]);
        setUpdatesCount(0); // Update count
        setLoading(false);
        return;
      }

      const adsRef = collection(db, 'ads');
      let q = query(
        adsRef,
        orderBy('publishedAt', 'desc'),
        limit(ADS_PER_PAGE)
      );

      if (lastVisible && !reset) {
        q = query(
          adsRef,
          orderBy('publishedAt', 'desc'),
          startAfter(lastVisible),
          limit(ADS_PER_PAGE)
        );
      }

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      const allAds = [];
      querySnapshot.forEach((doc) => {
        allAds.push({ id: doc.id, ...doc.data() });
      });

      const filteredAds = allAds.filter(
        (ad) =>
          user.interests.some(
            (interest) =>
              ad.category &&
              ad.category.includes &&
              ad.category.includes(interest)
          ) && ad.postedBy !== user.uid
      );

      // Prevent duplicate ads by filtering out existing IDs
      const existingIds = reset ? [] : interestedAds.map(ad => ad.id);
      const uniqueFilteredAds = filteredAds.filter(ad => !existingIds.includes(ad.id));
      
      const updatedAds = reset ? filteredAds : [...interestedAds, ...uniqueFilteredAds];
      setInterestedAds(updatedAds);
      
      // Update the count - if this is the first load (reset), set the count
      // Otherwise, we're loading more, so add to existing count
      if (reset) {
        setUpdatesCount(filteredAds.length);
      } else {
        setUpdatesCount(updatedAds.length);
      }

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    } catch (err) {
      setError('Failed to load updates.');
      console.error('Error fetching interested ads:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Function to get total count (for more accurate counting)
  const fetchTotalCount = async () => {
    try {
      if (!user?.interests || user.interests.length === 0) {
        setUpdatesCount(0);
        return;
      }

      const adsRef = collection(db, 'ads');
      const q = query(adsRef, orderBy('publishedAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const allAds = [];
      querySnapshot.forEach((doc) => {
        allAds.push({ id: doc.id, ...doc.data() });
      });

      const filteredAds = allAds.filter(
        (ad) =>
          user.interests.some(
            (interest) =>
              ad.category &&
              ad.category.includes &&
              ad.category.includes(interest)
          ) && ad.postedBy !== user.uid
      );

      setUpdatesCount(filteredAds.length);
    } catch (err) {
      console.error('Error fetching total count:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInterestedAds(true); // reset pagination
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      await fetchInterestedAds(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInterestedAds(true);
      // Also fetch total count for badge
      fetchTotalCount();
    } else {
      setUpdatesCount(0);
    }
  }, [user]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleAdPress = (ad) => {
    navigation.navigate('AdDetails', { adId: ad.id });
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          <Ionicons name="person-outline" size={60} color="#ccc" />
          <Text style={styles.messageText}>Please login to see updates</Text>
        </View>
      </View>
    );
  }

  if (!user.interests || user.interests.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          <Ionicons name="heart-outline" size={60} color="#ccc" />
          <Text style={styles.messageText}>
            Set your interests in Profile to see relevant updates
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.actionButtonText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading && interestedAds.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Finding ads you might like...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Updates for You</Text>
        <Text style={styles.headerSubtitle}>
          Based on your interests: {user.interests.join(', ')} ({updatesCount} ads found)
        </Text>
      </View>

      {error ? (
        <View style={styles.messageContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchInterestedAds(true)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={interestedAds}
          keyExtractor={(item, index) => `${item.id}-${index}`} // Ensure unique keys
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item: ad }) => (
            <TouchableOpacity
              style={styles.adCard}
              onPress={() => handleAdPress(ad)}
            >
              <View style={styles.adContent}>
                {ad.images && ad.images.length > 0 ? (
                  <Image
                    source={{ uri: ad.images[0].url }}
                    style={styles.adImage}
                  />
                ) : (
                  <View style={[styles.adImage, styles.noImage]}>
                    <Ionicons name="image-outline" size={30} color="#ccc" />
                  </View>
                )}

                <View style={styles.adInfo}>
                  <Text style={styles.adTitle} numberOfLines={2}>
                    {ad.title}
                  </Text>
                  <Text style={styles.adCategory}>{ad.category}</Text>
                  <Text style={styles.adPrice}>
                    {ad.Price?.toLowerCase() === 'free'
                      ? 'Free'
                      : `৳${ad.Price}`}
                  </Text>
                  <Text style={styles.adDate}>
                    {formatDate(ad.publishedAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.interestBadge}>
                <Ionicons name="heart" size={12} color="#ff4757" />
                <Text style={styles.interestBadgeText}>
                  Matches your interest
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#007bff"
                style={{ marginVertical: 10 }}
              />
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading && (
              <View style={styles.messageContainer}>
                <Ionicons name="search-outline" size={60} color="#ccc" />
                <Text style={styles.messageText}>
                  No ads match your interests yet
                </Text>
                <Text style={styles.subMessageText}>
                  Check back later or update your interests in Profile
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    paddingHorizontal: 40,
  },
  messageText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  subMessageText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statsText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: '500',
  },
  adCard: {
    backgroundColor: 'white',
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  adContent: {
    flexDirection: 'row',
  },
  adImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  adInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  adTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  adCategory: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 5,
  },
  adPrice: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '600',
    marginBottom: 5,
  },
  adDate: {
    fontSize: 12,
    color: '#999',
  },
  interestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  interestBadgeText: {
    fontSize: 12,
    color: '#ff4757',
    marginLeft: 5,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});