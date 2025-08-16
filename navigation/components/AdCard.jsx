import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../../FirebaseConfig";

import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtom";

const AdCard = ({ ad }) => {
  const navigation = useNavigation();
  const imageUrl = ad.images?.[0]?.url || "https://dummyimage.com/300x200/cccccc/000000&text=No+Image";
  const [liked, setLiked] = useState(false);
  const [users, setUsers] = useState([]);
  const [user] = useAtom(userAtom);

  // Helper function to get price value from ad object
  const getPriceFromAd = (ad) => {
    // Try different possible field names for price
    const possiblePriceFields = ['price', 'Price', 'amount', 'cost', 'value', 'pricing'];
    
    for (const field of possiblePriceFields) {
      if (ad[field] !== undefined && ad[field] !== null) {
        return ad[field];
      }
    }
    
    return 'Free'; // Default to free if no price found
  };

  // Helper function to format price for display
  const formatPrice = (ad) => {
    const priceValue = getPriceFromAd(ad);
    
    if (!priceValue || String(priceValue).toLowerCase().trim() === 'free') {
      return 'Free';
    }
    
    // If it's a number, format it with currency
    const numericPrice = parseFloat(String(priceValue).replace(/[^0-9.-]/g, ''));
    if (!isNaN(numericPrice)) {
      return `৳${numericPrice.toLocaleString()}`; // Using Bangladeshi Taka symbol
    }
    
    // Return as is if it's already formatted
    return String(priceValue);
  };

  useEffect(() => {
    const docRef = doc(db, "favorites", ad.id);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const favUsers = snapshot.data().users || [];
        setUsers(favUsers);
        setLiked(favUsers.includes(user?.uid));
      } else {
        setUsers([]);
        setLiked(false);
      }
    });

    return () => unsubscribe();
  }, [ad.id]);

  const toggleLike = async () => {
    const docRef = doc(db, "favorites", ad.id);
    const uid = user?.uid;

    try {
      if (liked) {
        await updateDoc(docRef, {
          users: arrayRemove(uid),
        });
      } else {
        await setDoc(docRef, {
          users: arrayUnion(uid),
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("AdDetails", { adId: ad.id })}
      style={styles.card}
      activeOpacity={0.9}
    >
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{ad.title}</Text>
        <Text style={styles.price}>{formatPrice(ad)}</Text>
        <Text style={styles.meta}>
          {ad.category} · {ad.location || "Unknown"}
        </Text>
      </View>

      <TouchableOpacity onPress={toggleLike} style={styles.heartButton} disabled={!user}>
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={24}
          color={liked ? "red" : "gray"}
        />
        <Text style={styles.likeCount}>{users.length}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f8f8f8",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    position: "relative",
  },
  image: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  contentContainer: {
    marginTop: 5,
    paddingRight: 60, // Give space for the heart button
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  price: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#2e7d32", // Green color for price
    marginBottom: 2,
  },
  meta: {
    color: "#555",
    fontSize: 13,
  },
  heartButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  likeCount: {
    marginLeft: 4,
    fontSize: 13,
    color: "#555",
  },
});

export default AdCard;