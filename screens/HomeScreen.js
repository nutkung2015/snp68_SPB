import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomNavigation from "../components/BottomNavigation";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFonts,
  Kanit_400Regular,
  Kanit_700Bold,
} from "@expo-google-fonts/kanit";

const HomeScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_700Bold,
  });

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch announcements from API
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://localhost:5000/api/announcements?limit=5&status=published"
      );
      const data = await response.json();

      if (data.status === "success") {
        setAnnouncements(data.data);
      } else {
        setError("Failed to fetch announcements");
      }
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const renderMenuItem = (icon, label, onPress) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={24} color="#666" />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // Helper function to get image URL from attachment_urls
  const getImageUrl = (attachmentUrls) => {
    try {
      // ถ้ามี attachment_urls และเป็น string (JSON) ให้แปลงเป็น object
      if (attachmentUrls && typeof attachmentUrls === "string") {
        attachmentUrls = JSON.parse(attachmentUrls);
      }

      // ตรวจสอบว่ามี attachmentUrls และเป็น array
      if (
        attachmentUrls &&
        Array.isArray(attachmentUrls) &&
        attachmentUrls.length > 0
      ) {
        // หารูปภาพจาก attachment_urls
        const imageFile = attachmentUrls.find((file) => {
          // ตรวจสอบ MIME type หรือ resource_type ถ้ามี
          if (file.resource_type === "image") {
            return true;
          }

          // ถ้าไม่มี resource_type ให้เช็คจากนามสกุลไฟล์
          const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
          return (
            file.url &&
            typeof file.url === "string" &&
            imageExtensions.some((ext) => file.url.toLowerCase().includes(ext))
          );
        });

        // ถ้าเจอไฟล์รูปภาพ ให้ใช้ URL จากไฟล์นั้น
        if (imageFile && imageFile.url) {
          return imageFile.url;
        }
      }

      // ถ้าไม่มีรูปภาพ ใช้รูป default
      return "https://picsum.photos/300/200";
    } catch (error) {
      console.error("Error parsing attachment_urls:", error);
      return "https://picsum.photos/300/200";
    }
  };

  const renderNewsItem = ({ item }) => (
    <TouchableOpacity style={styles.newsCard}>
      <Image
        source={{ uri: getImageUrl(item.attachment_urls) }}
        style={styles.newsImage}
      />
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.newsDescription} numberOfLines={2}>
          {item.content}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* แทนที่ View ด้วย ImageBackground */}
      <ImageBackground
        source={require("../assets/mockup_banner_header_2.svg")}
        style={styles.headerBackground}
        resizeMode="cover"
        imageStyle={{
          // เพิ่ม style สำหรับรูปภาพ
          width: "100%",
          height: "100%",
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>logo</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>5</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* บ้านของฉัน */}

        <TouchableOpacity style={styles.homeAddressCard}>
          <LinearGradient
            colors={["#8BC34A", "#CDDC39"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientCard}
          >
            <View style={styles.addressIcon}>
              <Ionicons name="home-outline" size={24} color="#fff" />
            </View>
            <View style={styles.addressContent}>
              <Text style={[styles.addressLabel, { color: "#fff" }]}>
                บ้านของฉัน
              </Text>
              <Text style={[styles.addressText, { color: "#fff" }]}>
                77/392 พฤษภา30/1
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ImageBackground>

      <ScrollView style={styles.content}>
        {/* ข้อมูลหมู่บ้านและบ้าน */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลหมู่บ้านและบ้าน</Text>
          <View style={styles.menuGrid}>
            <TouchableOpacity style={styles.menuButton}>
              <Ionicons name="home-outline" size={24} color="#666" />
              <Text style={styles.menuText}>บ้านของฉัน</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton}>
              <Ionicons name="people-outline" size={24} color="#666" />
              <Text style={styles.menuText}>หมู่บ้านของฉัน</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* รายการโปรด */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>รายการโปรด</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>ดูเพิ่มเติม {">"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.favoriteGrid}>
            {renderMenuItem("megaphone-outline", "ข่าวสาร", () => {})}
            {renderMenuItem("warning-outline", "แจ้งปัญหา", () => {})}
            {renderMenuItem("car-outline", "ผู้มาเยี่ยม", () => {})}
            {renderMenuItem("chatbubble-outline", "ขอความช่วยเหลือ", () => {})}
          </View>
        </View>

        {/* ข่าวสารและประกาศ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ข่าวสารและประกาศ</Text>
            <TouchableOpacity onPress={() => navigation.navigate("News")}>
              <Text style={styles.seeAllText}>ดูทั้งหมด {">"}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.loadingText}>กำลังโหลด...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={fetchAnnouncements}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>ลองใหม่</Text>
              </TouchableOpacity>
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ไม่มีข่าวสารในขณะนี้</Text>
            </View>
          ) : (
            <FlatList
              data={announcements}
              renderItem={renderNewsItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newsListContainer}
            />
          )}
        </View>
      </ScrollView>
      <BottomNavigation navigation={navigation} activeScreen="Home" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerBackground: {
    backgroundColor: "#666",
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationButton: {
    position: "relative",
    padding: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "red",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Kanit_400Regular",
  },
  logoContainer: {
    backgroundColor: "#666",
    padding: 8,
    borderRadius: 8,
  },
  logoText: {
    color: "#fff",
    fontFamily: "Kanit_400Regular",
  },
  content: {
    flex: 1,
  },
  homeAddressCard: {
    // backgroundColor: 'rgba(255, 255, 255, 0.5)',
    margin: 16,
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    elevation: 3,
  },
  gradientCard: {
    // backgroundColor: 'rgba(255, 255, 255, 0.5)',
    // margin: 16,
    // marginTop: 8,
    width: "100%",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressIcon: {
    backgroundColor: "#666",
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Kanit_400Regular",
  },
  addressText: {
    fontSize: 16,
    fontFamily: "Kanit_700Bold",
  },
  section: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Kanit_700Bold",
    marginBottom: 16,
  },
  seeAllText: {
    color: "#666",
    fontFamily: "Kanit_400Regular",
  },
  menuGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  menuButton: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    width: "45%",
  },
  menuText: {
    marginTop: 8,
    color: "#666",
    fontFamily: "Kanit_400Regular",
  },
  favoriteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuItem: {
    width: "23%",
    alignItems: "center",
    marginBottom: 16,
  },
  menuIconContainer: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontFamily: "Kanit_400Regular",
  },
  newsListContainer: {
    paddingHorizontal: 4,
  },
  newsContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  newsCard: {
    width: 280,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newsImage: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  newsContent: {
    padding: 12,
  },
  newsTitle: {
    fontSize: 16,
    fontFamily: "Kanit_700Bold",
    marginBottom: 4,
  },
  newsDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    fontFamily: "Kanit_400Regular",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontFamily: "Kanit_400Regular",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: "#666",
    fontFamily: "Kanit_400Regular",
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  errorText: {
    color: "#ff6b6b",
    fontFamily: "Kanit_400Regular",
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: "#666",
    fontFamily: "Kanit_400Regular",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    color: "#666",
    fontFamily: "Kanit_400Regular",
  },
});

export default HomeScreen;
