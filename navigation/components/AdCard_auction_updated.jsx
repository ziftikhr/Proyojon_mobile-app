// import React, { useState, useEffect } from "react";
// import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
// import { useNavigation } from "@react-navigation/native";
// import { Ionicons } from "@expo/vector-icons";
// import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
// import { db, auth } from "../../FirebaseConfig";

// import { useAtom } from "jotai";
// import { userAtom } from "../../atoms/userAtom";

// const AdCard = ({ ad }) => {
//   const navigation = useNavigation();
//   const imageUrl = ad.images?.[0]?.url || "https://dummyimage.com/300x200/cccccc/000000&text=No+Image";
//   const [liked, setLiked] = useState(false);
//   const [users, setUsers] = useState([]);
//   const [user] = useAtom(userAtom);
//   const [isLoading, setIsLoading] = useState(false);

//   // Helper function to get price value from ad object
//   const getPriceFromAd = (ad) => {
//     if (ad.isAuction && ad.auction) {
//       return ad.auction.currentBid || ad.auction.startingPrice || 0;
//     }
    
//     // Try different possible field names for price
//     const possiblePriceFields = ['price', 'Price', 'amount', 'cost', 'value', 'pricing'];
    
//     for (const field of possiblePriceFields) {
//       if (ad[field] !== undefined && ad[field] !== null) {
//         return ad[field];
//       }
//     }
    
//     return 'Free'; // Default to free if no price found
//   };

//   // Helper function to format price for display
//   const formatPrice = (ad) => {
//     if (ad.isAuction && ad.auction) {
//       const currentBid = ad.auction.currentBid || ad.auction.startingPrice || 0;
//       return `৳${currentBid.toLocaleString()} (Auction)`;
//     }
    
//     const priceValue = getPriceFromAd(ad);
    
//     if (!priceValue || String(priceValue).toLowerCase().trim() === 'free') {
//       return 'Free';
//     }
    
//     // if it's a number, format it with currency
//     const numericPrice = parseFloat(String(priceValue).replace(/[^0-9.-]/g, ''));
//     if (!isNaN(numericPrice)) {
//       return `৳${numericPrice.toLocaleString()}`;
//     }
    
//     // Return as is if it's already formatted
//     return String(priceValue);
//   };

//   useEffect(() => {
//     if (!ad?.id) {
//       console.error('AdCard - No ad.id provided');
//       return;
//     }

//     const docRef = doc(db, "favorites", ad.id);

//     const unsubscribe = onSnapshot(docRef, (snapshot) => {
//       console.log('AdCard - Firestore snapshot received:', snapshot.exists());
      
//       if (snapshot.exists()) {
//         const data = snapshot.data();
//         const favUsers = data.users || [];
//         console.log('AdCard - Favorite users from Firestore:', favUsers);
        
//         setUsers(favUsers);
        
//         // Check if current user is in the favorites list
//         const isCurrentUserLiked = user?.uid ? favUsers.includes(user.uid) : false;
//         console.log('AdCard - Is current user liked?', isCurrentUserLiked);
//         setLiked(isCurrentUserLiked);
//       } else {
//         console.log('AdCard - No favorites document exists for this ad');
//         setUsers([]);
//         setLiked(false);
//       }
//     }, (error) => {
//       console.error('AdCard - Firestore listener error:', error);
//     });

//     return () => unsubscribe();
//   }, [ad.id, user?.uid]); // Added user?.uid to dependencies

//   const toggleLike = async () => {
//     if (!user?.uid) {
//       console.error('AdCard - No user logged in');
//       return;
//     }

//     if (isLoading) {
//       console.log('AdCard - Toggle already in progress');
//       return;
//     }

//     setIsLoading(true);
//     const docRef = doc(db, "favorites", ad.id);
//     const uid = user.uid;

//     console.log('AdCard - Toggling like. Current liked state:', liked);

//     try {
//       if (liked) {
//         console.log('AdCard - Removing user from favorites');
//         await updateDoc(docRef, {
//           users: arrayRemove(uid),
//         });
//       } else {
//         console.log('AdCard - Adding user to favorites');
//         await setDoc(docRef, {
//           users: arrayUnion(uid),
//           adId: ad.id, // Store ad ID for reference
//           createdAt: new Date().toISOString(),
//         }, { merge: true });
//       }
//       console.log('AdCard - Toggle operation completed successfully');
//     } catch (error) {
//       console.error("AdCard - Error toggling like:", error);
//       // Optionally show an error message to user
//       // Alert.alert('Error', 'Failed to update favorite status');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Early return if no user is logged in
//   if (!user?.uid) {
//     console.log('AdCard - No user logged in, hiding favorite button');
//   }

//   return (
//     <TouchableOpacity
//       onPress={() => navigation.navigate("AdDetails", { adId: ad.id })}
//       style={styles.card}
//       activeOpacity={0.9}
//     >
//       <Image source={{ uri: imageUrl }} style={styles.image} />
//       <View style={styles.contentContainer}>
//         <Text style={styles.title}>{ad.title}</Text>
//         {ad.isAuction && (
//           <View style={styles.auctionBadge}>
//             <Text style={styles.auctionText}>AUCTION</Text>
//           </View>
//         )}
//         <Text style={styles.price}>{formatPrice(ad)}</Text>
//         {ad.isAuction && ad.auction?.endTime && (
//           <Text style={styles.auctionMeta}>
//             Ends: {new Date(ad.auction.endTime).toLocaleString()}
//           </Text>
//         )}
//         <Text style={styles.meta}>
//           {ad.category} · {ad.location || "Unknown"}
//         </Text>
//       </View>

//       {user?.uid && (
//         <TouchableOpacity 
//           onPress={toggleLike} 
//           style={[
//             styles.heartButton,
//             isLoading && styles.heartButtonDisabled
//           ]} 
//           disabled={isLoading}
//         >
//           <Ionicons
//             name={liked ? "heart" : "heart-outline"}
//             size={24}
//             color={liked ? "#ff4757" : "#747d8c"} // Changed colors for better visibility
//           />
//           <Text style={[
//             styles.likeCount,
//             liked && styles.likeCountActive
//           ]}>
//             {users.length}
//           </Text>
//         </TouchableOpacity>
//       )}
//     </TouchableOpacity>
//   );
// };

// const styles = StyleSheet.create({
//   card: {
//     backgroundColor: "#f8f8f8",
//     padding: 10,
//     borderRadius: 10,
//     marginBottom: 10,
//     position: "relative",
//   },
//   image: {
//     width: "100%",
//     height: 150,
//     borderRadius: 10,
//     backgroundColor: "#eee",
//   },
//   contentContainer: {
//     marginTop: 5,
//     paddingRight: 60, // Give space for the heart button
//   },
//   title: {
//     fontWeight: "bold",
//     fontSize: 16,
//     marginBottom: 2,
//   },
//   price: {
//     fontWeight: "bold",
//     fontSize: 18,
//     color: "#2e7d32", // Green color for price
//     marginBottom: 2,
//   },
//   meta: {
//     color: "#555",
//     fontSize: 13,
//   },
//   heartButton: {
//     position: "absolute",
//     bottom: 10,
//     right: 10,
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: 'rgba(255, 255, 255, 0.9)',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 15,
//     shadowColor: "#000",
//     shadowOffset: {
//       width: 0,
//       height: 1,
//     },
//     shadowOpacity: 0.22,
//     shadowRadius: 2.22,
//     elevation: 3,
//   },
//   heartButtonDisabled: {
//     opacity: 0.6,
//   },
//   likeCount: {
//     marginLeft: 4,
//     fontSize: 13,
//     color: "#555",
//   },
//   likeCountActive: {
//     color: "#ff4757",
//     fontWeight: "600",
//   },
//   auctionBadge: {
//     backgroundColor: "#800d0d",
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 12,
//     alignSelf: "flex-start",
//     marginBottom: 4,
//   },
//   auctionText: {
//     color: "#fff",
//     fontSize: 12,
//     fontWeight: "bold",
//   },
//   auctionMeta: {
//     fontSize: 12,
//     color: "#666",
//     marginBottom: 4,
//   },
// });

// export default AdCard;
