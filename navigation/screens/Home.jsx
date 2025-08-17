import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
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
import AdCardAuction from "../components/AdCard_auction";

const HomeScreen = () => {
  const [ads, setAds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceSort, setPriceSort] = useState("");
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [auctionModalVisible, setAuctionModalVisible] = useState(false);
  const [showAuctionAds, setShowAuctionAds] = useState("all"); // "all" | "regular" | "auction"

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

  // ✅ Helper to get price
  const getPriceFromAd = (ad) => {
    if (ad.isAuction) {
      return ad.currentBid || ad.startingBid || 0;
    }
    const possiblePriceFields = ["price", "Price", "amount", "cost", "value", "pricing"];
    for (const field of possiblePriceFields) {
      if (ad[field] !== undefined && ad[field] !== null) {
        return ad[field];
      }
    }
    return "free";
  };

  // ✅ Convert price to number
  const priceToNumber = (ad) => {
    if (ad.isAuction) {
      const auctionPrice = ad.currentBid || ad.startingBid || 0;
      return parseFloat(auctionPrice) || 0;
    }
    const priceStr = getPriceFromAd(ad);
    if (!priceStr) return 0;
    const priceString = String(priceStr).toLowerCase().trim();
    if (priceString === "free") return 0;
    const cleanPrice = priceString.replace(/[^0-9.-]/g, "");
    const numericValue = parseFloat(cleanPrice);
    return isNaN(numericValue) ? 0 : numericValue;
  };

  // ✅ Fetch first batch
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
        : query(adsRef, orderBy("publishedAt", "desc"), limit(ADS_PER_PAGE));

      const adDocs = await getDocs(q);
      let adsData = adDocs.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      // Search filter
      if (searchQuery.trim() !== "") {
        adsData = adsData.filter(
          (ad) =>
            ad.title &&
            ad.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Auction filter
      if (showAuctionAds === "regular") {
        adsData = adsData.filter((ad) => !ad.isAuction);
      } else if (showAuctionAds === "auction") {
        adsData = adsData.filter((ad) => ad.isAuction);
      }

      // Price sorting
      if (priceSort === "free") {
        adsData = adsData.filter(
          (ad) =>
            !getPriceFromAd(ad) ||
            String(getPriceFromAd(ad)).toLowerCase().trim() === "free" ||
            priceToNumber(ad) === 0
        );
      } else if (priceSort === "lowtohigh") {
        adsData.sort((a, b) => priceToNumber(a) - priceToNumber(b));
      } else if (priceSort === "hightolow") {
        adsData.sort((a, b) => priceToNumber(b) - priceToNumber(a));
      }

      setAds(adsData);
      setLastVisible(adDocs.docs[adDocs.docs.length - 1] || null);
      setHasMore(adDocs.docs.length === ADS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Pagination load
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
      let adsData = adDocs.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      // Search filter
      if (searchQuery.trim() !== "") {
        adsData = adsData.filter(
          (ad) =>
            ad.title &&
            ad.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Auction filter
      if (showAuctionAds === "regular") {
        adsData = adsData.filter((ad) => !ad.isAuction);
      } else if (showAuctionAds === "auction") {
        adsData = adsData.filter((ad) => ad.isAuction);
      }

      const allAds = [...ads, ...adsData];

      // Price sorting
      let finalAds = allAds;
      if (priceSort === "free") {
        finalAds = allAds.filter(
          (ad) =>
            !getPriceFromAd(ad) ||
            String(getPriceFromAd(ad)).toLowerCase().trim() === "free" ||
            priceToNumber(ad) === 0
        );
      } else if (priceSort === "lowtohigh") {
        finalAds = allAds.sort((a, b) => priceToNumber(a) - priceToNumber(b));
      } else if (priceSort === "hightolow") {
        finalAds = allAds.sort((a, b) => priceToNumber(b) - priceToNumber(a));
      }

      setAds(finalAds);
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
  }, [selectedCategory, searchQuery, priceSort, showAuctionAds]);

  // ✅ Category rendering
  const renderCategory = ({ item }) => (
    <TouchableOpacity
      onPress={() => setSelectedCategory(item.value)}
      style={[
        styles.categoryItem,
        selectedCategory === item.value && styles.selectedCategory,
      ]}
    >
      <Text
        style={[
          styles.categoryLabel,
          selectedCategory === item.value && styles.selectedCategoryText,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  // ✅ Modals
  const selectPriceSort = (value) => {
    setPriceSort(value);
    setPriceModalVisible(false);
  };

  const toggleAuctionAds = (value) => {
    setShowAuctionAds(value);
    setAuctionModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Row: Price + Auction + Search */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <TouchableOpacity style={styles.priceButton} onPress={() => setPriceModalVisible(true)}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Price{" "}
            {priceSort &&
              (priceSort === "lowtohigh"
                ? "(Low→High)"
                : priceSort === "hightolow"
                ? "(High→Low)"
                : priceSort === "free"
                ? "(Free Only)"
                : "")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.priceButton, { marginLeft: 8 }]}
          onPress={() => setAuctionModalVisible(true)}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Auction{" "}
            {showAuctionAds === "all"
              ? "(All)"
              : showAuctionAds === "regular"
              ? "(Regular)"
              : "(Auction Only)"}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.searchInput, { flex: 1, marginLeft: 8 }]}
          placeholder="Search by title..."
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
        />
      </View>

      {/* Price Sort Modal */}
      <Modal transparent animationType="fade" visible={priceModalVisible} onRequestClose={() => setPriceModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPriceModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sort by Price</Text>
            <TouchableOpacity onPress={() => selectPriceSort("")} style={styles.modalOption}>
              <Text style={[styles.modalOptionText, priceSort === "" && styles.selectedOption]}>
                All Prices
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => selectPriceSort("free")} style={styles.modalOption}>
              <Text style={[styles.modalOptionText, priceSort === "free" && styles.selectedOption]}>
                Free Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => selectPriceSort("lowtohigh")} style={styles.modalOption}>
              <Text style={[styles.modalOptionText, priceSort === "lowtohigh" && styles.selectedOption]}>
                Low to High
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => selectPriceSort("hightolow")} style={styles.modalOption}>
              <Text style={[styles.modalOptionText, priceSort === "hightolow" && styles.selectedOption]}>
                High to Low
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPriceModalVisible(false)} style={[styles.modalOption, styles.closeButton]}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Auction Modal */}
      <Modal transparent animationType="fade" visible={auctionModalVisible} onRequestClose={() => setAuctionModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAuctionModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Show Auction Ads</Text>
            <TouchableOpacity onPress={() => toggleAuctionAds("all")} style={styles.modalOption}>
              <Text style={[styles.modalOptionText, showAuctionAds === "all" && styles.selectedOption]}>
                Show All (Auction + Regular)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleAuctionAds("regular")} style={styles.modalOption}>
              <Text style={[styles.modalOptionText, showAuctionAds === "regular" && styles.selectedOption]}>
                Regular Ads Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleAuctionAds("auction")} style={styles.modalOption}>
              <Text style={[styles.modalOptionText, showAuctionAds === "auction" && styles.selectedOption]}>
                Auction Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAuctionModalVisible(false)} style={[styles.modalOption, styles.closeButton]}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Filter */}
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

      {/* Ads List */}
      <Text style={styles.title}>
        {selectedCategory ? selectedCategory : "All Recent Posts"}
      </Text>
      <FlatList
        data={ads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (showAuctionAds === "all") {
            return item.isAuction ? (
              <AdCardAuction ad={item} />
            ) : (
              <AdCard ad={item} />
            );
          }
          if (showAuctionAds === "regular" && !item.isAuction) {
            return <AdCard ad={item} />;
          }
          if (showAuctionAds === "auction" && item.isAuction) {
            return <AdCardAuction ad={item} />;
          }
          return null;
        }}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreAds}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={getAds}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#800d0dff" />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "No ads found matching your search"
                : "No ads available"}
            </Text>
          </View>
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

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  priceButton: {
    backgroundColor: "sienna",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
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
  selectedCategoryText: {
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 250,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalOption: {
    paddingVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedOption: {
    fontWeight: "bold",
    color: "sienna",
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#666",
  },
});

export default HomeScreen;