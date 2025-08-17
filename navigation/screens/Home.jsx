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
  const [showAuctionAds, setShowAuctionAds] = useState(true);

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

  // Helper function to get price value from ad object
  const getPriceFromAd = (ad) => {
    // Handle auction ads
    if (ad.isAuction) {
      return ad.currentBid || ad.startingBid || 0;
    }
    
    // Try different possible field names for price
    const possiblePriceFields = ['price', 'Price', 'amount', 'cost', 'value', 'pricing'];
    
    for (const field of possiblePriceFields) {
      if (ad[field] !== undefined && ad[field] !== null) {
        return ad[field];
      }
    }
    
    return 'free'; // Default to free if no price found
  };

  // Helper function to convert price string to number for sorting
  const priceToNumber = (ad) => {
    if (ad.isAuction) {
      const auctionPrice = ad.currentBid || ad.startingBid || 0;
      return parseFloat(auctionPrice) || 0;
    }
    
    const priceStr = getPriceFromAd(ad);
    
    if (!priceStr) return 0;
    
    // Convert to string if it's not already
    const priceString = String(priceStr).toLowerCase().trim();
    
    // Check if it's "free" (case insensitive)
    if (priceString === 'free') {
      return 0;
    }
    
    // Remove any currency symbols, commas, and spaces, then parse as number
    const cleanPrice = priceString.replace(/[^0-9.-]/g, '');
    const numericValue = parseFloat(cleanPrice);
    const result = isNaN(numericValue) ? 0 : numericValue;
    
    return result;
  };

  // Fetch first batch
  const getAds = async () => {
    try {
      setRefreshing(true);
    //  console.log('Fetching ads for category:', selectedCategory); // Debug log
      
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

      // console.log('Fetched ads count:', adsData.length); // Debug log
      // console.log('Sample ad prices:', adsData.slice(0, 3).map(ad => ad.price)); // Debug log
      
      // Debug: Check all possible price field names
      if (adsData.length > 0) {
        const firstAd = adsData[0];
        // console.log('First ad fields:', Object.keys(firstAd)); // Show all fields
        // console.log('First ad data sample:', firstAd); // Show full first ad
      }

      // Apply search filter
      if (searchQuery.trim() !== "") {
        const originalCount = adsData.length;
        adsData = adsData.filter((ad) =>
          ad.title && ad.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      //  console.log(`Search filter: ${originalCount} -> ${adsData.length} ads`); // Debug log
      }

      // Apply price sort/filter
      if (priceSort === "free") {
     //   console.log('Filtering for free items only'); // Debug log
        adsData = adsData.filter((ad) => {
          const priceStr = getPriceFromAd(ad);
          const isFree = !priceStr || String(priceStr).toLowerCase().trim() === 'free' || priceToNumber(ad) === 0;
          return isFree;
        });
       // console.log('Free items found:', adsData.length); // Debug log
      } else if (priceSort === "lowtohigh") {
       // console.log('Sorting low to high'); // Debug log
        adsData.sort((a, b) => {
          const priceA = priceToNumber(a);
          const priceB = priceToNumber(b);
          return priceA - priceB;
        });
      } else if (priceSort === "hightolow") {
      //  console.log('Sorting high to low'); // Debug log
        adsData.sort((a, b) => {
          const priceA = priceToNumber(a);
          const priceB = priceToNumber(b);
          return priceB - priceA;
        });
      }

     // console.log('Final ads count after filtering/sorting:', adsData.length); // Debug log
      if (adsData.length > 0) {
      //  console.log('First 3 ad prices after sort:', adsData.slice(0, 3).map(ad => `${ad.title}: ${getPriceFromAd(ad)}`)); // Debug log
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

  // Pagination load
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

      // Apply search filter
      if (searchQuery.trim() !== "") {
        adsData = adsData.filter((ad) =>
          ad.title && ad.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Filter auction ads based on toggle
      if (!showAuctionAds) {
        adsData = adsData.filter((ad) => !ad.isAuction);
      }

      // Apply price sort/filter - but we need to handle with existing ads
      const allAds = [...ads, ...adsData];
      let finalAds = allAds;
      
      if (priceSort === "free") {
        finalAds = allAds.filter((ad) => {
          const priceStr = getPriceFromAd(ad);
          const isFree = !priceStr || String(priceStr).toLowerCase().trim() === 'free' || priceToNumber(ad) === 0;
          return isFree;
        });
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
  //  console.log('useEffect triggered - Category:', selectedCategory, 'Search:', searchQuery, 'PriceSort:', priceSort);
    getAds();
  }, [selectedCategory, searchQuery, priceSort]);

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      onPress={() => setSelectedCategory(item.value)}
      style={[
        styles.categoryItem,
        selectedCategory === item.value && styles.selectedCategory,
      ]}
    >
      <Text style={[
        styles.categoryLabel,
        selectedCategory === item.value && styles.selectedCategoryText
      ]}>{item.label}</Text>
    </TouchableOpacity>
  );

  const openPriceModal = () => setPriceModalVisible(true);
  const closePriceModal = () => setPriceModalVisible(false);

  const selectPriceSort = (value) => {
   // console.log('Price sort selected:', value); // Debug log
    setPriceSort(value);
    closePriceModal();
  };

  const openAuctionModal = () => setAuctionModalVisible(true);
  const closeAuctionModal = () => setAuctionModalVisible(false);
  const toggleAuctionAds = (value) => {
    setShowAuctionAds(value);
    closeAuctionModal();
  };

  return (
    <View style={styles.container}>

      {/* Row: Price button + Auction button + Search */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <TouchableOpacity style={styles.priceButton} onPress={openPriceModal}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Price {priceSort && `(${
              priceSort === 'lowtohigh' ? 'Low→High' : 
              priceSort === 'hightolow' ? 'High→Low' : 
              priceSort === 'free' ? 'Free Only' : ''
            })`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.priceButton, { marginLeft: 8 }]} onPress={openAuctionModal}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Auction {showAuctionAds ? '(All)' : '(Regular)'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.searchInput, { flex: 1, marginLeft: 8 }]}
          placeholder="Search by title..."
          value={searchQuery}
          onChangeText={(text) => {
           // console.log('Search query changed:', text); // Debug log
            setSearchQuery(text);
          }}
        />
      </View>

      {/* Price Sort Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={priceModalVisible}
        onRequestClose={closePriceModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closePriceModal}
        >
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

            <TouchableOpacity onPress={closePriceModal} style={[styles.modalOption, styles.closeButton]}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Auction Toggle Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={auctionModalVisible}
        onRequestClose={closeAuctionModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeAuctionModal}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Show Auction Ads</Text>

            <TouchableOpacity onPress={() => toggleAuctionAds(true)} style={styles.modalOption}>
              <Text style={[styles.modalOptionText, showAuctionAds && styles.selectedOption]}>
                Show All (Auction + Regular)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => toggleAuctionAds(false)} style={styles.modalOption}>
              <Text style={[styles.modalOptionText, !showAuctionAds && styles.selectedOption]}>
                Regular Ads Only
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={closeAuctionModal} style={[styles.modalOption, styles.closeButton]}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
        renderItem={({ item }) => 
          item.isAuction ? (
            showAuctionAds ? <AdCardAuction ad={item} /> : null
          ) : (
            <AdCard ad={item} />
          )
        }
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreAds}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={getAds}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color="#800d0dff" /> : null
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? "No ads found matching your search" : "No ads available"}
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