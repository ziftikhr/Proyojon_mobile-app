import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtom';

const { width } = Dimensions.get('window');

const SellerProfile = ({ navigation }) => {
  const route = useRoute();
  const { sellerId, sellerData } = route.params;
  
  const [seller, setSeller] = useState(sellerData || null);
  const [loading, setLoading] = useState(!sellerData);
  const [sellerAds, setSellerAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [user] = useAtom(userAtom);

  useEffect(() => {
    const fetchSellerInfo = async () => {
      if (!sellerData) {
        try {
          const sellerDoc = await getDoc(doc(db, 'users', sellerId));
          if (sellerDoc.exists()) {
            setSeller(sellerDoc.data());
          }
        } catch (error) {
          console.error('Error fetching seller:', error);
        } finally {
          setLoading(false);
        }
      }
      
      // Fetch seller's ads
      try {
        const adsQuery = query(
          collection(db, 'ads'),
          where('postedBy', '==', sellerId),
          orderBy('publishedAt', 'desc'),
          limit(10)
        );
        
        const adsSnapshot = await getDocs(adsQuery);
        const ads = adsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setSellerAds(ads);
      } catch (error) {
        console.error('Error fetching seller ads:', error);
      } finally {
        setAdsLoading(false);
      }
    };

    fetchSellerInfo();
  }, [sellerId, sellerData]);

  const openSocialLink = (platform, username) => {
    if (!username) return;
    
    let url = '';
    switch (platform) {
      case 'facebook':
        url = `https://facebook.com/${username}`;
        break;
      case 'instagram':
        url = `https://instagram.com/${username}`;
        break;
      case 'twitter':
        url = `https://twitter.com/${username}`;
        break;
      case 'linkedin':
        url = `https://linkedin.com/in/${username}`;
        break;
      case 'whatsapp':
        // Assuming username is a phone number
        url = `https://wa.me/${username}`;
        break;
      case 'telegram':
        url = `https://t.me/${username}`;
        break;
      default:
        return;
    }
    
    Linking.openURL(url).catch(err => {
      Alert.alert('Error', `Could not open ${platform}`);
    });
  };

  const navigateToAd = (adId) => {
    navigation.navigate('AdDetails', { adId });
  };

  const formatPrice = (ad) => {
    if (!ad) return "N/A";
    
    if (ad.isAuction && ad.auction) {
      const currentBid = ad.auction.currentBid || 0;
      const startingPrice = ad.auction.startingPrice || 0;
      
      if (currentBid > 0) {
        return `৳${currentBid.toLocaleString()}`;
      } else {
        return `৳${startingPrice.toLocaleString()}`;
      }
    }
    
    if (ad.Price === "Free" || ad.Price === "0") return "Free";
    if (!ad.Price) return "Price not set";
    return `৳${ad.Price}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#800d0d" />
      </View>
    );
  }

  if (!seller) {
    return (
      <View style={styles.center}>
        <Text>Seller not found</Text>
      </View>
    );
  }

  const socialPlatforms = [
    { key: 'facebook', icon: 'logo-facebook', color: '#1877F2' },
    { key: 'instagram', icon: 'logo-instagram', color: '#E4405F' },
    { key: 'twitter', icon: 'logo-twitter', color: '#1DA1F2' },
    { key: 'linkedin', icon: 'logo-linkedin', color: '#0077B5' },
    { key: 'whatsapp', icon: 'logo-whatsapp', color: '#25D366' },
    { key: 'telegram', icon: 'paper-plane', color: '#0088CC' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {seller.photoUrl ? (
            <Image
              source={{ uri: seller.photoUrl }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.defaultProfileImage}>
              <Ionicons name="person" size={50} color="#666" />
            </View>
          )}
          
          <View style={styles.profileInfo}>
            <Text style={styles.sellerName}>{seller.name || 'Anonymous Seller'}</Text>
            <Text style={styles.sellerEmail}>{seller.email}</Text>
            <Text style={styles.joinDate}>
              Member since {seller.createdAt ? moment(seller.createdAt.toDate()).format('MMMM YYYY') : 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Bio Section */}
        {seller.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioTitle}>About</Text>
            <Text style={styles.bioText}>{seller.bio}</Text>
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          {seller.phone && (
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => Linking.openURL(`tel:${seller.phone}`)}
            >
              <Ionicons name="call" size={20} color="#800d0d" />
              <Text style={styles.contactText}>{seller.phone}</Text>
            </TouchableOpacity>
          )}
          
          {seller.location && (
            <View style={styles.contactItem}>
              <Ionicons name="location" size={20} color="#800d0d" />
              <Text style={styles.contactText}>{seller.location}</Text>
            </View>
          )}
          
          {seller.website && (
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => Linking.openURL(seller.website)}
            >
              <Ionicons name="globe" size={20} color="#800d0d" />
              <Text style={styles.contactText}>{seller.website}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Social Media Links */}
        <View style={styles.socialSection}>
          <Text style={styles.sectionTitle}>Social Media</Text>
          <View style={styles.socialContainer}>
            {socialPlatforms.map(platform => {
              const username = seller.socials?.[platform.key];
              if (!username) return null;
              
              return (
                <TouchableOpacity
                  key={platform.key}
                  style={[styles.socialButton, { backgroundColor: platform.color }]}
                  onPress={() => openSocialLink(platform.key, username)}
                >
                  <Ionicons name={platform.icon} size={24} color="#fff" />
                </TouchableOpacity>
              );
            })}
            
            {socialPlatforms.every(platform => !seller.socials?.[platform.key]) && (
              <Text style={styles.noSocialText}>No social media links available</Text>
            )}
          </View>
        </View>
      </View>

      {/* Seller's Ads */}
      <View style={styles.adsSection}>
        <Text style={styles.sectionTitle}>
          Recent Ads ({sellerAds.length})
        </Text>
        
        {adsLoading ? (
          <ActivityIndicator size="small" color="#800d0d" />
        ) : sellerAds.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sellerAds.map((ad) => (
              <TouchableOpacity
                key={ad.id}
                style={styles.adCard}
                onPress={() => navigateToAd(ad.id)}
              >
                {ad.images && ad.images.length > 0 ? (
                  <Image
                    source={{ uri: ad.images[0].url }}
                    style={styles.adImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.noImageContainer}>
                    <Ionicons name="image" size={40} color="#ccc" />
                  </View>
                )}
                
                <View style={styles.adInfo}>
                  <Text style={styles.adTitle} numberOfLines={2}>
                    {ad.title}
                  </Text>
                  <Text style={styles.adPrice}>
                    {formatPrice(ad)}
                  </Text>
                  <Text style={styles.adLocation} numberOfLines={1}>
                    {ad.location}
                  </Text>
                  {ad.isAuction && (
                    <View style={styles.auctionBadge}>
                      <Ionicons name="hammer" size={10} color="#fff" />
                      <Text style={styles.auctionBadgeText}>AUCTION</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noAdsText}>No ads posted yet</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#f9f9f9',
    paddingBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  defaultProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sellerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
  },
  bioSection: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  socialSection: {
    backgroundColor: '#fff',
    padding: 15,
  },
  socialContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  noSocialText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  adsSection: {
    padding: 15,
  },
  adCard: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  adImage: {
    width: 150,
    height: 100,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  noImageContainer: {
    width: 150,
    height: 100,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  adInfo: {
    padding: 10,
    position: 'relative',
  },
  adTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  adPrice: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  adLocation: {
    fontSize: 12,
    color: '#666',
  },
  auctionBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#800d0d',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  auctionBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  noAdsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SellerProfile;