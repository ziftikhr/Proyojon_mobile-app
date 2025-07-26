import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import AdCard from "../components/AdCard";

const HomeScreen = () => {
  const [ads, setAds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  const categories = [
    { value: "", label: "All" },
    { value: "Stationaries", label: "Stationaries" },
    { value: "Books", label: "Books" },
    { value: "Clothes", label: "Clothes" },
    { value: "Electronics", label: "Electronics" },
    { value: "Furniture", label: "Furniture" },
    { value: "Vehicles & Parts", label: "Vehicles & Parts" },
    { value: "Games & Hobbies", label: "Games & Hobbies" },
    { value: "Miscellaneous", label: "Miscellaneous" },
  ];

  const getAds = async () => {
    try {
      const adsRef = collection(db, "ads");
      const q = selectedCategory
        ? query(adsRef, where("category", "==", selectedCategory), orderBy("publishedAt", "desc"))
        : query(adsRef, orderBy("publishedAt", "desc"));
      const adDocs = await getDocs(q);
      const adsData = adDocs.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setAds(adsData);
    } catch (error) {
      console.error("Error fetching ads:", error);
    }
  };

  useEffect(() => {
    getAds();
  }, [selectedCategory]);

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      onPress={() => setSelectedCategory(item.value)}
      style={[
        styles.categoryItem,
        selectedCategory === item.value && styles.selectedCategory,
      ]}
    >
      <Text style={styles.categoryLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
<View style={styles.container}>
  <Text style={styles.title}>Filter by Category</Text>

  <View style={styles.categoryWrapper}>
    <FlatList
      data={categories}
      horizontal
      keyExtractor={(item) => item.value}
      renderItem={renderCategory}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryList}
    />
  </View>

  <Text style={styles.title}>
    {selectedCategory ? `${selectedCategory}` : "All Recent Posts"}
  </Text>

  <FlatList
    data={ads}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => <AdCard ad={item} />}
    contentContainerStyle={{ paddingBottom: 80 }}
  />
</View>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  categoryWrapper: {
    height: 50, // fixes cutoff issue
    marginBottom: 10,
  },
  categoryList: {
    paddingRight: 10,
  },
  categoryItem: {
    backgroundColor: "#eee",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    height: 40,
  },
  selectedCategory: {
    backgroundColor: 'sienna',
  },
  categoryLabel: {
    color: "#000",
    fontWeight: "600",
    fontSize: 14,
  },
});


export default HomeScreen;
