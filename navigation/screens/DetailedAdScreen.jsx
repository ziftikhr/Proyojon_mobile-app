import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  increment, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs 
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { Ionicons } from '@expo/vector-icons';
import moment from "moment";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtom";
import SellerProfile from "../components/SellerProfile";

const DetailedAdScreen = ({ navigation }) => {
  const route = useRoute();
  const { adId } = route.params;

  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNumber, setShowNumber] = useState(false);
  const [user] = useAtom(userAtom);
  const [publisher, setPublisher] = useState({});
  
  // Bidding states
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bidHistory, setBidHistory] = useState([]);
  const [showBidHistory, setShowBidHistory] = useState(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const docSnap = await getDoc(doc(db, "ads", adId));
        if (docSnap.exists()) {
          const adData = docSnap.data();
          setAd(adData);
          const docSnapP = await getDoc(doc(db, "users", adData.postedBy));
          if (docSnapP.exists()) {
            setPublisher(docSnapP.data());
          }
          
          // Set initial bid amount if it's an auction
          if (adData.isAuction && adData.auction) {
            const currentBid = adData.auction.currentBid || 0;
            const startingPrice = adData.auction.startingPrice || 0;
            const bidIncrement = adData.auction.bidIncrement || 1;
            const minBid = Math.max(currentBid, startingPrice) + 1;
            setBidAmount(minBid.toString());
          }
          
          // Fetch bid history for auctions
          if (adData.isAuction) {
            await fetchBidHistory();
          }
        }
      } catch (err) {
        console.error("Error loading ad:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [adId]);

  const fetchBidHistory = async () => {
    try {
      const bidsRef = collection(db, "bids");
      const bidsQuery = query(
        bidsRef,
        where("adId", "==", adId),
        limit(10)
      );
      
      const bidsSnapshot = await getDocs(bidsQuery);
      const bidsData = bidsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }))
      // Sort in JavaScript after fetching to avoid index requirement
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.timestamp);
        const bTime = b.createdAt?.toDate?.() || new Date(b.timestamp);
        return bTime - aTime; // Descending order (newest first)
      });
      
      setBidHistory(bidsData);
    } catch (error) {
      console.error("Error fetching bid history:", error);
      // Fallback: try to get bids from ad.auction.bidders if available
      if (ad?.auction?.bidders) {
        const sortedBidders = [...ad.auction.bidders].sort((a, b) => {
          const aTime = new Date(a.timestamp);
          const bTime = new Date(b.timestamp);
          return bTime - aTime;
        });
        setBidHistory(sortedBidders.map((bidder, index) => ({
          id: `bidder-${index}`,
          ...bidder,
          bidderId: bidder.bidderId,
          bidderName: bidder.bidderName,
          bidAmount: bidder.bidAmount,
          createdAt: null, // Will use timestamp field
        })));
      }
    }
  };

  const createChatroom = async () => {
    const loggedInUser = user?.uid;
    const chatId =
      loggedInUser > ad.postedBy
        ? `${loggedInUser}.${ad.postedBy}.${adId}`
        : `${ad.postedBy}.${loggedInUser}.${adId}`;
        try {
          await setDoc(doc(db, "messages", chatId), {
            ad: adId,
            users: [loggedInUser, ad.postedBy],
            lastUpdated: new Date(),
          }, { merge: true });
        } catch (error) {
          console.error("Error creating chatroom:", error);
        }

    navigation.navigate("ChatMessages", { chatUser: { ad: ad, other: publisher } });
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
    
    // Regular ad price
    if (ad.Price === "Free" || ad.Price === "0") return "Free";
    if (!ad.Price) return "Price not set";
    return `৳${ad.Price}`;
  };

  const getTimeRemaining = () => {
    if (!ad?.isAuction || !ad.auction?.endTime) return null;
    
    try {
      const endTime = new Date(ad.auction.endTime);
      const now = new Date();
      const timeLeft = endTime - now;
      
      if (timeLeft <= 0) return "Auction Ended";
      
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) return `${days} days, ${hours} hours`;
      if (hours > 0) return `${hours} hours, ${minutes} minutes`;
      return `${minutes} minutes`;
    } catch (error) {
      console.error("Error calculating time remaining:", error);
      return "Time calculation error";
    }
  };

  const validateBid = () => {
    if (!ad.auction) {
      Alert.alert("Error", "This is not a valid auction");
      return false;
    }

    const currentBid = ad.auction.currentBid || 0;
    const startingPrice = ad.auction.startingPrice || 0;
    const bidIncrement = ad.auction.bidIncrement || 50;
    const minBid = Math.max(currentBid, startingPrice) + bidIncrement;
    const bidValue = parseFloat(bidAmount);

    if (isNaN(bidValue)) {
      Alert.alert("Invalid Bid", "Please enter a valid number");
      return false;
    }

    if (bidValue < minBid) {
      Alert.alert(
        "Bid Too Low", 
        `Your bid must be at least ৳${minBid.toLocaleString()}`
      );
      return false;
    }

    // Check auction status and end time
    if (ad.auction.status !== 'active') {
      Alert.alert("Auction Closed", "This auction is no longer active");
      return false;
    }

    const endTime = new Date(ad.auction.endTime);
    if (endTime <= new Date()) {
      Alert.alert("Auction Ended", "This auction has already ended");
      return false;
    }

    // Check if user is bidding against themselves
    if (ad.auction.currentBidderId === user.uid) {
      Alert.alert(
        "Already Highest Bidder", 
        "You are already the highest bidder on this item"
      );
      return false;
    }

    return true;
  };

  const handlePlaceBid = async () => {
    if (!validateBid()) return;

    try {
      setIsSubmitting(true);

      const bidValue = parseFloat(bidAmount);
      const now = new Date();
      
      // Create bid record
      const bidData = {
        adId: adId,
        bidderId: user.uid,
        bidderName: user.displayName || user.email || "Anonymous",
        bidAmount: bidValue,
        createdAt: serverTimestamp(),
        timestamp: now,
      };

      // Add bid to bids collection
      await addDoc(collection(db, "bids"), bidData);

      // Create new bidder entry for auction.bidders array
      const newBidder = {
        bidderId: user.uid,
        bidderName: user.displayName || user.email || "Anonymous",
        bidAmount: bidValue,
        timestamp: now.toISOString(), // Use ISO string instead of serverTimestamp
      };

      // Update ad with new auction data using nested structure
      const adRef = doc(db, "ads", adId);
      
      await updateDoc(adRef, {
        "auction.currentBid": bidValue,
        "auction.currentBidderId": user.uid,
        "auction.bidders": [...(ad.auction?.bidders || []), newBidder],
        bidCount: increment(1),
        lastBidTime: serverTimestamp(), // Add this field for sorting/tracking
      });

      // Auto-extend auction if bid placed in last 5 minutes
      const endTime = new Date(ad.auction?.endTime);
      const timeLeft = endTime - now;
      if (timeLeft <= 5 * 60 * 1000 && timeLeft > 0) { // 5 minutes in milliseconds
        const newEndTime = new Date(now.getTime() + 5 * 60 * 1000); // Extend by 5 minutes
        await updateDoc(adRef, {
          "auction.endTime": newEndTime.toISOString(),
          "auction.extended": true,
        });
      }

      // Update local state
      setAd(prev => ({
        ...prev,
        auction: {
          ...prev.auction,
          currentBid: bidValue,
          currentBidderId: user.uid,
        },
        bidCount: (prev.bidCount || 0) + 1,
      }));

      // Refresh bid history
      await fetchBidHistory();

      setShowBidModal(false);
      Alert.alert(
        "Bid Placed Successfully!",
        `Your bid of ৳${bidValue.toLocaleString()} has been placed.`
      );

      // Update minimum bid for next bid
      const newMinBid = bidValue + (ad.auction?.bidIncrement || 50);
      setBidAmount(newMinBid.toString());

    } catch (error) {
      console.error("Error placing bid:", error);
      Alert.alert("Error", "Could not place bid. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openBidModal = () => {
    if (user.uid === ad.postedBy) {
      Alert.alert("Error", "You cannot bid on your own auction.");
      return;
    }
    setShowBidModal(true);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Unknown time";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleString();
    } catch (error) {
      return "Unknown time";
    }
  };

  const getMinBid = () => {
    if (!ad?.isAuction || !ad.auction) return 0;
    const currentBid = ad.auction.currentBid || 0;
    const startingPrice = ad.auction.startingPrice || 0;
    const bidIncrement = ad.auction.bidIncrement || 50;
    return Math.max(currentBid, startingPrice) + bidIncrement;
  };

const navigateToSellerProfile = () => {
  if (publisher && ad) {
    // Navigate to SellerProfile screen with seller data
    navigation.navigate("SellerProfile", { 
      sellerId: ad.postedBy,
      sellerData: publisher 
    });
  } else {
    Alert.alert("Error", "Seller information not available");
  }
};

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!ad) {
    return (
      <View style={styles.center}>
        <Text>Ad not found.</Text>
      </View>
    );
  }

  const timeRemaining = getTimeRemaining();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScrollView horizontal pagingEnabled>
        {ad.images.map((img, idx) => (
          <Image
            key={idx}
            source={{ uri: img.url }}
            style={styles.image}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      <View style={styles.headerInfo}>
        <Text style={styles.title}>{ad.title}</Text>
        
        {ad.isAuction && (
          <View style={styles.auctionBadge}>
            <Ionicons name="hammer" size={16} color="#fff" />
            <Text style={styles.auctionBadgeText}>AUCTION</Text>
          </View>
        )}

        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {ad.isAuction && ad.auction?.currentBid > 0 
              ? `Current Bid: ${formatPrice(ad)}`
              : ad.isAuction
              ? `Starting Price: ${formatPrice(ad)}`
              : formatPrice(ad)
            }
          </Text>
          
          {ad.isAuction && user && timeRemaining !== "Auction Ended" && user.uid !== ad.postedBy && (
            <TouchableOpacity style={styles.bidButton} onPress={openBidModal}>
              <Ionicons name="add-circle" size={24} color="#800d0d" />
            </TouchableOpacity>
          )}
        </View>

        {ad.isAuction && (
          <View style={styles.auctionDetails}>
            {(ad.bidCount || ad.bidCount === 0) && (
              <TouchableOpacity 
                style={styles.auctionStat}
                onPress={() => setShowBidHistory(true)}
              >
                <Ionicons name="people" size={16} color="#666" />
                <Text style={styles.auctionStatText}>{ad.bidCount || 0} bids</Text>
              </TouchableOpacity>
            )}
            
            {timeRemaining && (
              <View style={styles.auctionStat}>
                <Ionicons name="time" size={16} color="#666" />
                <Text style={styles.auctionStatText}>{timeRemaining}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.location}>{ad.location || "Location not specified"}</Text>
        <Text style={styles.time}>
          {ad.publishedAt ? moment(ad.publishedAt.toDate()).fromNow() : "Time unknown"}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.description}>{ad.description || "No description available"}</Text>

      {/* Seller Information Section */}
      <Text style={styles.sectionTitle}>Owner's Information</Text>
      <View style={styles.sellerCard}>
        <TouchableOpacity 
          style={styles.sellerInfo} 
          onPress={navigateToSellerProfile}
          activeOpacity={0.7}
        >
          {publisher.photoUrl ? (
            <Image
              source={{ uri: publisher.photoUrl }}
              style={styles.sellerAvatar}
            />
          ) : (
            <View style={styles.defaultAvatar}>
              <Ionicons name="person" size={24} color="#666" />
            </View>
          )}
          <View style={styles.sellerDetails}>
            <Text style={styles.sellerName}>{publisher.name || "Anonymous Seller"}</Text>
            <Text style={styles.sellerJoined}>
              Member since {publisher.createdAt ? moment(publisher.createdAt.toDate()).format('MMM YYYY') : 'Unknown'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Contact</Text>
      {showNumber ? (
        <>
          {user ? (
            <View style={styles.contactContainer}>
              <Ionicons name="call" size={16} color="#000" style={styles.contactIcon} />
              <Text style={styles.contactText}>{ad.contactnum || "No contact number"}</Text>
            </View>
          ) : (
            <Text style={styles.contactText}>Login to see contact info</Text>
          )}
        </>
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowNumber(true)}
        >
          <Text style={styles.buttonText}>Show Contact Info</Text>
        </TouchableOpacity>
      )}

      {user && !ad.isAuction && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "maroon" }]}
          onPress={() => {
            if (user.uid === ad.postedBy) {
              alert("You cannot chat with yourself.");
            } else {
              createChatroom();
            }
          }}
        >
          <Text style={styles.buttonText}>Chat with Seller</Text>
        </TouchableOpacity>
      )}

      {user && ad.isAuction && user.uid === ad.postedBy && (
        <View style={styles.ownerActions}>
          <Text style={styles.ownerText}>You are the seller of this auction</Text>
        </View>
      )}

      {/* Bid Modal */}
      <Modal
        visible={showBidModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Place Bid</Text>
              <TouchableOpacity onPress={() => setShowBidModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.currentBidText}>
              Current Bid: {formatPrice(ad) || "N/A"}
            </Text>
            <Text style={styles.minBidText}>
              Minimum Bid: ৳{getMinBid().toLocaleString() || "0"}
            </Text>
            
            <View style={styles.bidInputContainer}>
              <Text style={styles.currencySymbol}>৳</Text>
              <TextInput
                style={styles.bidInput}
                value={bidAmount}
                onChangeText={setBidAmount}
                keyboardType="numeric"
                placeholder={getMinBid().toString()}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowBidModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.placeBidButton, isSubmitting && styles.disabledButton]}
                onPress={handlePlaceBid}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.placeBidButtonText}>Place Bid</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bid History Modal */}
      <Modal
        visible={showBidHistory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.bidHistoryModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bid History</Text>
            <TouchableOpacity onPress={() => setShowBidHistory(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.bidHistoryList}>
            {bidHistory.length > 0 ? (
              bidHistory.map((bid, index) => (
                <View key={bid.id || `bid-${index}`} style={styles.bidHistoryItem}>
                  <View style={styles.bidHistoryInfo}>
                    <Text style={styles.bidderName}>
                      {bid.bidderId === user?.uid ? "You" : (bid.bidderName || "Anonymous")}
                    </Text>
                    <Text style={styles.bidHistoryAmount}>
                      ৳{(bid.bidAmount || 0).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.bidHistoryTime}>
                    {formatTime(bid.createdAt || bid.timestamp)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.noBidsContainer}>
                <Text style={styles.noBidsText}>No bids yet. Be the first!</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
    padding: 16,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 350,
    height: 250,
    borderRadius: 10,
    marginRight: 10,
  },
  headerInfo: {
    marginTop: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  auctionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#800d0d",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  auctionBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    color: "#2e7d32",
    fontWeight: "bold",
    flex: 1,
  },
  bidButton: {
    marginLeft: 10,
  },
  auctionDetails: {
    flexDirection: "row",
    marginBottom: 8,
  },
  auctionStat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  auctionStatText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  location: {
    fontSize: 14,
    color: "#555",
  },
  time: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  sectionTitle: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#333",
    marginTop: 5,
    lineHeight: 20,
    marginBottom: 10,
  },
  // Seller Information Styles
  sellerCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sellerInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  sellerJoined: {
    fontSize: 12,
    color: "#666",
  },
  button: {
    backgroundColor: "sienna",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  contactIcon: {
    marginRight: 5,
  },
  contactText: {
    fontSize: 16,
    color: "#000",
  },
  ownerActions: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    alignItems: "center",
  },
  ownerText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 15,
    minWidth: 300,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  currentBidText: {
    fontSize: 16,
    color: "#2e7d32",
    fontWeight: "bold",
    marginBottom: 5,
  },
  minBidText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  bidInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginRight: 5,
  },
  bidInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
  },
  placeBidButton: {
    flex: 1,
    backgroundColor: "#800d0d",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  placeBidButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Bid History Modal styles
  bidHistoryModal: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  bidHistoryList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bidHistoryItem: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  bidHistoryInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  bidderName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  bidHistoryAmount: {
    fontSize: 16,
    color: "#2e7d32",
    fontWeight: "bold",
  },
  bidHistoryTime: {
    fontSize: 12,
    color: "#999",
  },
  noBidsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  noBidsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

export default DetailedAdScreen;