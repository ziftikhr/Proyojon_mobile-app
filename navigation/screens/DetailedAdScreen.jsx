import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import moment from "moment";

const DetailedAdScreen = () => {
  const route = useRoute();
  const { adId } = route.params;

  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNumber, setShowNumber] = useState(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const docSnap = await getDoc(doc(db, "ads", adId));
        if (docSnap.exists()) {
          setAd(docSnap.data());
        }
      } catch (err) {
        console.error("Error loading ad:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [adId]);

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

      <Text style={styles.title}>{ad.title}</Text>
      <Text style={styles.price}>{ad.Price === "Free" ? "Free" : `৳${ad.Price}`}</Text>
      <Text style={styles.location}>{ad.location}</Text>
      <Text style={styles.time}>{moment(ad.publishedAt.toDate()).fromNow()}</Text>

      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.description}>{ad.description}</Text>

      <Text style={styles.sectionTitle}>Contact</Text>
      {showNumber ? (
        <Text style={styles.contactText}>📞 {ad.contactnum}</Text>
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowNumber(true)}
        >
          <Text style={styles.buttonText}>Show Contact Info</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#ccc" }]}
        disabled
      >
        <Text style={styles.buttonText}>Chat with Donor</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
  },
  price: {
    fontSize: 18,
    color: "green",
    marginVertical: 5,
  },
  location: {
    fontSize: 14,
    color: "#555",
  },
  time: {
    fontSize: 12,
    color: "#999",
    marginBottom: 10,
  },
  sectionTitle: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "bold",
  },
  description: {
    fontSize: 14,
    color: "#333",
    marginTop: 5,
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
  },
  contactText: {
    fontSize: 16,
    marginTop: 10,
    color: "#000",
  },
});

export default DetailedAdScreen;
