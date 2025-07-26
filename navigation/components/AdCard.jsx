import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

const AdCard = ({ ad }) => {
  const imageUrl = ad.images?.[0]?.url || "https://via.placeholder.com/150";

  return (
    <View style={styles.card}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <Text style={styles.title}>{ad.title}</Text>
      <Text style={styles.meta}>
        {ad.category} · {ad.location || "Unknown"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f8f8f8",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
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
});

export default AdCard;
