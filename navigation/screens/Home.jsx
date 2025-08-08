import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import AdCard from "../components/AdCard";

const HomeScreen = () => {
  const [ads, setAds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const ADS_PER_PAGE = 10;

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

  // Fetch first batch
  const getAds = async () => {
    try {
      setRefreshing(true);
      const adsRef = collection(db, "ads");
      const q = selectedCategory
        ? query(
            adsRef,
            where("category", "==", selectedCategory),
            orderBy("publishedAt", "desc"),
            limit(ADS_PER_PAGE)
          )
        : query(
            adsRef,
            orderBy("publishedAt", "desc"),
            limit(ADS_PER_PAGE)
          );

      const adDocs = await getDocs(q);
      const adsData = adDocs.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      setAds(adsData);
      setLastVisible(adDocs.docs[adDocs.docs.length - 1] || null);
      setHasMore(adDocs.docs.length === ADS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch next batch
  const loadMoreAds = async () => {
    if (!hasMore || loadingMore || !lastVisible) return;

    try {
      setLoadingMore(true);
      const adsRef = collection(db, "ads");
      const q = selectedCategory
        ? query(
            adsRef,
            where("category", "==", selectedCategory),
            orderBy("publishedAt", "desc"),
            startAfter(lastVisible),
            limit(ADS_PER_PAGE)
          )
        : query(
            adsRef,
            orderBy("publishedAt", "desc"),
            startAfter(lastVisible),
            limit(ADS_PER_PAGE)
          );

      const adDocs = await getDocs(q);
      const adsData = adDocs.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      setAds((prevAds) => [...prevAds, ...adsData]);
      setLastVisible(adDocs.docs[adDocs.docs.length - 1] || null);
      setHasMore(adDocs.docs.length === ADS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more ads:", error);
    } finally {
      setLoadingMore(false);
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
        {selectedCategory ? selectedCategory : "All Recent Posts"}
      </Text>

      <FlatList
        data={ads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AdCard ad={item} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreAds}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={getAds}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color="#800d0dff" /> : null
        }
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
    height: 50,
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
    backgroundColor: "sienna",
  },
  categoryLabel: {
    color: "#000",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default HomeScreen;
