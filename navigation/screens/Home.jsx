import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from '../../FirebaseConfig';
import AdCard from "../components/AdCard";

const HomeScreen = () => {
  const [ads, setAds] = useState([]);

  const getAds = async () => {
    const adsRef = collection(db, "ads");
    const q = query(adsRef, orderBy("publishedAt", "desc"));
    const adDocs = await getDocs(q);
    const adsData = adDocs.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    setAds(adsData);
  };

  useEffect(() => {
    getAds();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Posts</Text>
      <FlatList
        data={ads}
        keyExtractor={(item) => item.adId || item.id}
        renderItem={({ item }) => <AdCard ad={item} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
});

export default HomeScreen;
