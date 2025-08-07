import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../../FirebaseConfig"; 

const AdCard = ({ ad }) => {
  const navigation = useNavigation();
  const imageUrl = ad.images?.[0]?.url || "https://via.placeholder.com/150";
  const [liked, setLiked] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const docRef = doc(db, "favorites", ad.id);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const favUsers = snapshot.data().users || [];
        setUsers(favUsers);
        setLiked(favUsers.includes(auth.currentUser.uid));
      } else {
        setUsers([]);
        setLiked(false);
      }
    });

    return () => unsubscribe();
  }, [ad.id]);

  const toggleLike = async () => {
    const docRef = doc(db, "favorites", ad.id);
    const uid = auth.currentUser.uid;

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
      <Text style={styles.title}>{ad.title}</Text>
      <Text style={styles.meta}>
        {ad.category} · {ad.location || "Unknown"}
      </Text>

      <TouchableOpacity onPress={toggleLike} style={styles.heartButton}>
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
  title: {
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 5,
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
