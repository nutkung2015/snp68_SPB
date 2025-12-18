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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HomeOptionScreen } from "./Myhome/HomeOptionScreen";
import apiService from "../services/apiService"; // Import API service

import {
  useFonts,
  Kanit_400Regular,
  Kanit_700Bold,
} from "@expo-google-fonts/kanit";
import { AnnouncementsService } from "../services";
import ProjectCustomizationsService from "../services/projectCustomizationsService";

const HomeScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_700Bold,
  });

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customizationData, setCustomizationData] = useState(null); // State for ProjectCustomizations
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true); // Loading state for announcements

  const [secondaryColor, setSecondaryColor] = useState("#155B5B"); // Default color
  const [primaryColor, setPrimaryColor] = useState("#14336B"); // Default color
  const [logoUrl, setLogoUrl] = useState(null); // Logo URL from project customization

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const thaiMonths = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist year
    return `${day} ${month} ${year}`;
  };

  const [userData, setUserData] = useState(null);

  // useEffect(() => {
  //   const loadUserData = async () => {
  //     try {
  //       const storedUserData = await AsyncStorage.getItem("userData");
  //       if (storedUserData) {
  //         setUserData(JSON.parse(storedUserData));
  //       }
  //     } catch (error) {
  //       console.error("Failed to load user data from AsyncStorage", error);
  //     }
  //   };
  //   loadUserData();
  // }, []);

  // // Fetch announcements from API
  // useEffect(() => {
  //   if (userData?.projectMemberships?.[0]?.project_id) {
  //     fetchProjectCustomizations(userData.projectMemberships[0].project_id);
  //   }
  //   fetchAnnouncements(); // ตรวจสอบว่า fetchAnnouncements() ทำงานได้ถูกต้อง
  // }, [userData]);



  const fetchProjectCustomizations = async (projectId) => {
    try {
      setLoading(true);
      const response = await ProjectCustomizationsService.getProjectCustomizations(projectId);
      console.log("RESPONSE FROM API:", response); // แทรก debug
      // นี่คือเจาะชั้น response ที่ถูกต้อง
      if (response) {
        setCustomizationData(response);
        if (response.primary_color, response.secondary_color, response.logo_url) {
          setPrimaryColor(response.primary_color);
          setSecondaryColor(response.secondary_color);
          setLogoUrl(response.logo_url);
        }

      }
    } catch (err) {
      console.error("Error fetching project customizations:", err);
      setError("Failed to fetch project customizations");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true); // Separate loading state for announcements

      // Get user data to find project_id
      const userDataStr = await AsyncStorage.getItem('userData');
      let projectId = null;
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.projectMemberships && userData.projectMemberships.length > 0) {
          projectId = userData.projectMemberships[0].project_id;
        }
      }

      const params = {
        limit: 5,
        status: "published",
        projectId: projectId // Add projectId to params
      };

      const data = await AnnouncementsService.getAnnouncements(params);

      if (data.status === "success") {
        setAnnouncements(data.data);
      } else {
        setError("Failed to fetch announcements");
      }
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setError("Network error");
    } finally {
      setLoadingAnnouncements(false); // Ensure loading state is updated
    }
  };



  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          setUserData(JSON.parse(storedUserData));
        }
      } catch (error) {
        console.error("Failed to load user data from AsyncStorage", error);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (userData?.projectMemberships?.[0]?.project_id) {
        await fetchProjectCustomizations(
          userData.projectMemberships[0].project_id
        );
      }
      await fetchAnnouncements(); // Always fetch announcements
    };
    fetchData();
  }, [userData]);

  // ในตัว component (นอก useEffect)
  console.log("Render primaryColor:", primaryColor);

  <TouchableOpacity
    style={[styles.menuButton, { backgroundColor: primaryColor }]} // ใช้ primaryColor
    onPress={() => navigation.navigate("HomeOption")}
  >
    <Ionicons name="home-outline" size={24} color="#fff" />
    <Text style={styles.menuText}>บ้านของฉัน</Text>
  </TouchableOpacity>;

  const renderMenuItem = (icon, label, onPress) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={28} color={primaryColor || "#155B5B"} />
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

  // Get type label and color
  const getTypeInfo = (type) => {
    const typeMap = {
      'announcement': { label: 'ประกาศ', color: '#3B82F6', bgColor: '#EFF6FF' },
      'event': { label: 'กิจกรรม', color: '#10B981', bgColor: '#ECFDF5' },
      'maintenance': { label: 'การบำรุงรักษา', color: '#F59E0B', bgColor: '#FEF3C7' },
      'emergency': { label: 'เหตุฉุกเฉิน', color: '#EF4444', bgColor: '#FEE2E2' },
    };
    return typeMap[type] || { label: 'ทั่วไป', color: '#6B7280', bgColor: '#F3F4F6' };
  };

  const renderNewsItem = ({ item }) => {
    const typeInfo = getTypeInfo(item.type);

    return (
      <TouchableOpacity
        style={styles.newsCard}
        onPress={() =>
          navigation.navigate("NewsDetail", { announcementId: item.id })
        }
        activeOpacity={0.7}
      >
        <View style={styles.newsImageContainer}>
          <Image
            source={{ uri: getImageUrl(item.attachment_urls) }}
            style={styles.newsImage}
          />
          {/* Gradient Overlay */}
          <View style={styles.imageGradient} />

          {/* Type Badge on Image */}
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
            <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
          </View>
        </View>

        <View style={styles.newsContent}>
          <Text style={styles.newsTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.newsMetaRow}>
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={styles.newsDate}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* แทนที่ View ด้วย ImageBackground */}
      {/* <ImageBackground
        source={require("../assets/banner_header_3.png")}
        style={styles.headerBackground}
        resizeMode="cover"
        imageStyle={{
          // เพิ่ม style สำหรับรูปภาพ
          width: "100%",
          height: "100%",
        }}
      >
      </ImageBackground> */}
      {/* Header */}
      <LinearGradient
        colors={[primaryColor || "#4BB59F", secondaryColor || "#155B5B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientCardHeader}
      >
        {/* Row 1: Logo (ซ้าย) - Actions (ขวา) */}
        <View style={styles.headerRowTop}>
          <Image
            source={logoUrl ? { uri: logoUrl } : require("../assets/logo_3_white.png")}
            style={styles.logoImage}
          />
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#18545d" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>5</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileCircle} onPress={() => navigation.navigate("Profile")}>
              <Text style={styles.profileText}>NC</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Row 2: ไอคอนบ้าน + user info */}
        <View style={styles.headerRowBottom}>
          <Ionicons
            name="home"
            size={32}
            color="#fff"
            style={styles.headerHouseIcon}
          />
          <View style={styles.headerUserBox}>
            <Text style={styles.headerUserName}>สวัสดีคุณ {userData?.full_name}</Text>
            <Text style={styles.headerUserAddress}>{" "}
              {userData?.unitMemberships?.[0]?.unit_number}{" "}
              {userData?.projectMemberships?.[0]?.project_name}</Text>
          </View>
        </View>
        {/* ข้อมูลหมู่บ้านและบ้าน */}
        <View style={styles.sectionHome}>
          <Text style={styles.sectionTitleHome}>ข้อมูลหมู่บ้านและบ้าน</Text>
          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={styles.menuButton} // ใช้ primaryColor
              onPress={() => navigation.navigate("HomeOption")}
            >
              <Ionicons name="home" size={24} color={primaryColor || "#155B5B"} />
              <Text style={[styles.menuText, { color: primaryColor || "#155B5B" }]}>บ้านของฉัน</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate("VilageOption")}
            >
              <Ionicons name="people" size={24} color={primaryColor || "#155B5B"} />
              <Text style={[styles.menuText, { color: primaryColor || "#155B5B" }]}>หมู่บ้านของฉัน</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>


      {/* บ้านของฉัน */}



      <ScrollView style={styles.content}>
        {/* รายการโปรด */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>บริการทั้งหมด</Text>
            {/* <TouchableOpacity>
              <Text style={styles.seeAllText}>ดูเพิ่มเติม {">"}</Text>
            </TouchableOpacity> */}
          </View>
          <View style={styles.favoriteGrid}>
            {renderMenuItem("megaphone", "ข่าวสาร", () =>
              navigation.navigate("News")
            )}
            {renderMenuItem("warning", "แจ้งปัญหา", () =>
              navigation.navigate("IssueMenu")
            )}
            {renderMenuItem("car", "ผู้มาเยี่ยม", () =>
              navigation.navigate("Estamp")
            )}
            {renderMenuItem("chatbubble", "ขอความช่วยเหลือ", () =>
              navigation.navigate("HelpRequest")
            )}
            {renderMenuItem("call", "เบอร์ฉุกเฉิน", () =>
              navigation.navigate("NumberEmergency")
            )}
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
      {/* <BottomNavigation navigation={navigation} activeScreen="Home" /> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  gradientCardHeader: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 14,
    marginTop: 0,
    marginHorizontal: 0,
    // marginBottom: 18,
    position: "relative",
    minHeight: 144,
    justifyContent: "flex-end"
  },
  headerRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    // ไม่มี position absolute แล้ว
  },
  logoImage: {
    width: 42,
    height: 42,
    resizeMode: "contain",
  },
  notificationButton: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 10,
    marginRight: 9,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationBadge: {
    position: "absolute",
    top: 3,
    right: 2,
    backgroundColor: "#18545d",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "Kanit_700Bold",
    textAlign: "center",
  },
  profileCircle: {
    width: 47,
    height: 47,
    borderRadius: 25,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  profileText: {
    color: "#205248",
    fontWeight: "bold",
    fontSize: 16,
    fontFamily: "Kanit_700Bold",
  },
  headerRowBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerHouseIcon: {
    marginRight: 10,
    marginBottom: 2,
  },
  headerUserBox: {
    justifyContent: "center",
  },
  headerUserName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Kanit_700Bold",
    marginBottom: 1,
  },
  headerUserAddress: {
    color: "#fff",
    fontSize: 13.5,
    fontFamily: "Kanit_400Regular",
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  sectionHome: {
    // paddingHorizontal: 20,
    paddingTop: 20,
    // backgroundColor: "#fff",
    // marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Kanit_700Bold",
    color: "#000000ff",
  },
  sectionTitleHome: {
    fontSize: 20,
    fontFamily: "Kanit_700Bold",
    color: "#fff",
  },
  seeAllText: {
    color: "#666",
    fontFamily: "Kanit_400Regular",
  },
  menuGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  menuButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
    backgroundColor: "#ffffffff",
    borderRadius: 12,
    width: "48%",
  },
  menuText: {
    marginLeft: 8,
    color: "#fff",
    fontFamily: "Kanit_600SemiBold",
  },
  favoriteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  menuItem: {
    width: "23%",
    alignItems: "center",
    marginBottom: 10,
  },
  menuIconContainer: {
    // borderWidth: 2.2, 
    // borderColor: "#4BB59F",
    backgroundColor: "#f5f5f5",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuLabel: {
    fontSize: 14,
    color: "#205248",
    textAlign: "center",
    fontFamily: "Kanit_500Medium",
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
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: 8,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  newsImageContainer: {
    height: 180,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  newsImage: {
    width: "100%",
    height: "100%",
    resizeMode: 'cover',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    // backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: 'Kanit_700Bold',
    color: '#fff',
  },
  newsContent: {
    padding: 16,
  },
  newsTitle: {
    fontSize: 16,
    fontFamily: "Kanit_700Bold",
    marginBottom: 8,
    color: "#1F2937",
    lineHeight: 24,
  },
  newsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newsDate: {
    fontSize: 13,
    fontFamily: 'Kanit_400Regular',
    color: '#6B7280',
  },
  newsDescription: {
    fontSize: 14,
    color: "#205248",
    lineHeight: 20,
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
