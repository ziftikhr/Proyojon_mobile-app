import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { 
  doc, 
  getDoc, 
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
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtom";
import { Ionicons } from "@expo/vector-icons";

const PlaceBidScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { adId } = route.params;
  const [user] = useAtom(userAtom);
  
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bidHistory, setBidHistory] = useState([]);
  const [showBidHistory, setShowBidHistory] = useState(false);
  const [maxBid, setMaxBid] = useState("");
  const [useAutoBid, setUseAutoBid] = useState(false);
  
  // Quick bid amounts
  const [quickBids, setQuickBids] = useState([]);

  useEffect(() => {
    const fetchAdDetails = async () => {
      try {
        const adRef = doc(db, "ads", adId);
        const adDoc = await getDoc(adRef);
        
        if (adDoc.exists()) {
          const adData = { ...adDoc.data(), id: adDoc.id };
          setAd(adData);
          
          // Use new auction structure
          const currentBid = adData.auction?.currentBid || 0;
          const startingPrice = adData.auction?.startingPrice || 0;
          const bidIncrement = adData.auction?.bidIncrement || 50;
          const minBid = Math.max(currentBid, startingPrice) + bidIncrement;
          
          setBidAmount(minBid.toString());
          generateQuickBids(minBid, bidIncrement);
          
          // Fetch bid history
          await fetchBidHistory();
        }
      } catch (error) {
        console.error("Error fetching ad:", error);
        Alert.alert("Error", "Could not load auction details");
      } finally {
        setLoading(false);
      }
    };

    fetchAdDetails();
  }, [adId]);

  const fetchBidHistory = async () => {
    try {
      const bidsRef = collection(db, "bids");
      const bidsQuery = query(
        bidsRef,
        where("adId", "==", adId),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      
      const bidsSnapshot = await getDocs(bidsQuery);
      const bidsData = bidsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));
      
      setBidHistory(bidsData);
    } catch (error) {
      console.error("Error fetching bid history:", error);
    }
  };

  const generateQuickBids = (minBid, increment = 50) => {
    const quick = [
      minBid,
      minBid + increment,
      minBid + (increment * 2),
      minBid + (increment * 5),
    ];
    setQuickBids(quick);
  };

  const validateBid = () => {
    if (!ad.auction) {
      Alert.alert("Error", "This is not a valid auction");
      return false;
    }

    const currentBid = ad.auction.currentBid || 0;
    const startingPrice = ad.auction.startingPrice || 0;
    const bidIncrement = ad.auction.bidIncrement || 1;
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

    if (useAutoBid) {
      const maxBidValue = parseFloat(maxBid);
      if (isNaN(maxBidValue) || maxBidValue < bidValue) {
        Alert.alert(
          "Invalid Max Bid", 
          "Your maximum bid must be higher than your current bid"
        );
        return false;
      }
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
        maxBid: useAutoBid ? parseFloat(maxBid) : bidValue,
        isAutoBid: useAutoBid,
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
        timestamp: serverTimestamp(),
        isAutoBid: useAutoBid
      };

      // Update ad with new auction data using nested structure
      const adRef = doc(db, "ads", adId);
      
      await updateDoc(adRef, {
        "auction.currentBid": bidValue,
        "auction.currentBidderId": user.uid,
        "auction.bidders": [...(ad.auction?.bidders || []), newBidder],
        bidCount: increment(1),
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

      Alert.alert(
        "Bid Placed Successfully!",
        `Your bid of ৳${bidValue.toLocaleString()} has been placed.`,
        [
          {
            text: "View Auction",
            onPress: () => navigation.navigate("AdDetails", { adId }),
          },
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error) {
      console.error("Error placing bid:", error);
      Alert.alert("Error", "Could not place bid. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return "৳0";
    return `৳${parseFloat(price).toLocaleString()}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getTimeRemaining = () => {
    if (!ad?.auction?.endTime) return "Unknown";
    
    const endTime = new Date(ad.auction.endTime);
    const now = new Date();
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) return "Auction Ended";
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#800d0d" />
      </View>
    );
  }

  if (!ad || !ad.isAuction || !ad.auction) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Auction not found or invalid</Text>
      </View>
    );
  }

  const currentBid = ad.auction.currentBid || 0;
  const startingPrice = ad.auction.startingPrice || 0;
  const bidIncrement = ad.auction.bidIncrement || 1;
  const minBid = Math.max(currentBid, startingPrice) + bidIncrement;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place Bid</Text>
        <TouchableOpacity onPress={() => setShowBidHistory(true)}>
          <Ionicons name="list" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.auctionInfo}>
        <Text style={styles.auctionTitle}>{ad.title}</Text>
        <View style={styles.priceInfo}>
          <Text style={styles.currentBidLabel}>
            {currentBid > 0 ? 'Current Bid:' : 'Starting Price:'}
          </Text>
          <Text style={styles.currentBidAmount}>
            {formatPrice(currentBid > 0 ? currentBid : startingPrice)}
          </Text>
        </View>
        <Text style={styles.bidCount}>{ad.bidCount || 0} bids placed</Text>
        <View style={styles.timeRemainingContainer}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.timeRemaining}>Time left: {getTimeRemaining()}</Text>
        </View>
      </View>

      <View style={styles.bidSection}>
        <Text style={styles.sectionTitle}>Your Bid</Text>
        <Text style={styles.minBidText}>
          Minimum bid: {formatPrice(minBid)}
        </Text>

        <View style={styles.bidInputContainer}>
          <Text style={styles.currencySymbol}>৳</Text>
          <TextInput
            style={styles.bidInput}
            value={bidAmount}
            onChangeText={setBidAmount}
            keyboardType="numeric"
            placeholder={minBid.toString()}
          />
        </View>

        {/* Quick bid buttons */}
        <View style={styles.quickBidsContainer}>
          <Text style={styles.quickBidsLabel}>Quick Bids:</Text>
          <View style={styles.quickBidsRow}>
            {quickBids.map((amount, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickBidButton}
                onPress={() => setBidAmount(amount.toString())}
              >
                <Text style={styles.quickBidText}>{formatPrice(amount)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Auto-bid option */}
        <View style={styles.autoBidContainer}>
          <TouchableOpacity 
            style={styles.autoBidToggle}
            onPress={() => setUseAutoBid(!useAutoBid)}
          >
            <Ionicons 
              name={useAutoBid ? "checkbox" : "checkbox-outline"} 
              size={20} 
              color="#800d0d" 
            />
            <Text style={styles.autoBidLabel}>Use automatic bidding</Text>
          </TouchableOpacity>
          
          {useAutoBid && (
            <View style={styles.maxBidContainer}>
              <Text style={styles.maxBidLabel}>Maximum bid:</Text>
              <View style={styles.bidInputContainer}>
                <Text style={styles.currencySymbol}>৳</Text>
                <TextInput
                  style={styles.bidInput}
                  value={maxBid}
                  onChangeText={setMaxBid}
                  keyboardType="numeric"
                  placeholder="Enter your maximum bid"
                />
              </View>
              <Text style={styles.autoBidExplanation}>
                We'll automatically bid for you up to this amount
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.placeBidButton, isSubmitting && styles.disabledButton]}
          onPress={handlePlaceBid}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeBidButtonText}>Place Bid</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Bid History Modal */}
      <Modal
        visible={showBidHistory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bid History</Text>
            <TouchableOpacity onPress={() => setShowBidHistory(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.bidHistoryList}>
            {bidHistory.length > 0 ? (
              bidHistory.map((bid, index) => (
                <View key={bid.id} style={styles.bidHistoryItem}>
                  <View style={styles.bidHistoryInfo}>
                    <Text style={styles.bidderName}>
                      {bid.bidderId === user.uid ? "You" : bid.bidderName}
                      {bid.isAutoBid && " (Auto)"}
                    </Text>
                    <Text style={styles.bidHistoryAmount}>
                      {formatPrice(bid.bidAmount)}
                    </Text>
                  </View>
                  <Text style={styles.bidHistoryTime}>
                    {formatTime(bid.createdAt)}
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
  
export default PlaceBidScreen;