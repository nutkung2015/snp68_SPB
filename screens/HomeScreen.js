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
import Footer from "../components/Footer";
import CallGuardModal from "../components/CallGuardModal";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HomeOptionScreen } from "./Myhome/HomeOptionScreen";
import apiService from "../services/apiService"; // Import API service


import { AnnouncementsService } from "../services";
import ProjectCustomizationsService from "../services/projectCustomizationsService";
import NotificationService from "../services/notificationService";
import { useFocusEffect } from "@react-navigation/native";

const HomeScreen = ({ navigation }) => {


  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customizationData, setCustomizationData] = useState(null); // State for ProjectCustomizations
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true); // Loading state for announcements

  const [secondaryColor, setSecondaryColor] = useState("#2A405E"); // Default color
  const [primaryColor, setPrimaryColor] = useState("#2A405E"); // Default color
  const [logoUrl, setLogoUrl] = useState(null); // Logo URL from project customization
  const [callGuardModalVisible, setCallGuardModalVisible] = useState(false); // State for CallGuardModal
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0); // Unread notification count

  // Fetch unread count and register push token when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const fetchUnreadCount = async () => {
        const count = await NotificationService.getUnreadCount();
        setUnreadNotificationCount(count);
      };
      fetchUnreadCount();

      // Register push token (in case it wasn't registered during login)
      const registerPush = async () => {
        try {
          await NotificationService.registerForPushNotifications();
        } catch (err) {
          console.log('[Home] Push registration skipped:', err.message);
        }
      };
      registerPush();
    }, [])
  );

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

  // Get initials from user name
  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
      const response = await ProjectCustomizationsService.getProjectCustomizations(projectId);
      console.log("RESPONSE FROM API:", response); // แทรก debug
      // นี่คือเจาะชั้น response ที่ถูกต้อง
      if (response) {
        setCustomizationData(response);
        if (response.primary_color && response.secondary_color) {
          setPrimaryColor(response.primary_color);
          setSecondaryColor(response.secondary_color);
        }
        if (response.logo_url) {
          setLogoUrl(response.logo_url);
        }
      }
    } catch (err) {
      // ไม่แสดง error - ใช้สีเริ่มต้นแทน
      console.error("Error fetching project customizations:", err);
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

      // Fetch both project announcements and global announcements in parallel
      const [projectAnnouncementsResult, globalAnnouncementsResult] = await Promise.all([
        // Project announcements
        AnnouncementsService.getAnnouncements({
          limit: 5,
          status: "published",
          projectId: projectId
        }),
        // Global announcements
        projectId ? AnnouncementsService.getGlobalAnnouncements(projectId) : Promise.resolve({ status: "success", data: [] })
      ]);

      // Merge announcements
      let allAnnouncements = [];

      // Add project announcements
      if (projectAnnouncementsResult.status === "success" && projectAnnouncementsResult.data) {
        allAnnouncements = [...projectAnnouncementsResult.data.map(item => ({ ...item, source: 'project' }))];
      }

      // Add global announcements
      if (globalAnnouncementsResult.status === "success" && globalAnnouncementsResult.data) {
        const globalItems = globalAnnouncementsResult.data.map(item => ({
          ...item,
          source: 'global',
          // Map global announcement fields to match project announcement structure if needed
          type: item.type || 'announcement'
        }));
        allAnnouncements = [...allAnnouncements, ...globalItems];
      }

      // Sort by created_at descending and take first 5
      allAnnouncements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      allAnnouncements = allAnnouncements.slice(0, 5);

      setAnnouncements(allAnnouncements);
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

      // ถ้าไม่มีรูปภาพ ให้ return null
      return null;
    } catch (error) {
      console.error("Error parsing attachment_urls:", error);
      return null;
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
    const imageUrl = getImageUrl(item.attachment_urls);

    return (
      <TouchableOpacity
        style={styles.newsCard}
        onPress={() =>
          navigation.navigate("NewsDetail", {
            announcementId: item.id,
            isGlobal: item.source === 'global'
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.newsImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.newsImage}
            />
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Ionicons name="image-outline" size={48} color="#9CA3AF" />
              <Text style={styles.noImageText}>ไม่มีรูปภาพ</Text>
            </View>
          )}
          {/* Gradient Overlay */}
          <View style={styles.imageGradient} />

          {/* Global/System Badge */}
          {item.source === 'global' && (
            <View style={styles.globalBadge}>
              <Ionicons name="globe-outline" size={12} color="#fff" />
              <Text style={styles.globalBadgeText}>ประกาศจากระบบ</Text>
            </View>
          )}

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
      {/* Header - เช็คว่ามี customizationData หรือไม่ */}
      {customizationData ? (
        // Header with Custom Color (when projectCustomization exists)
        <View
          style={[styles.gradientCardHeader, { backgroundColor: primaryColor || "#1F7EFF" }]}
        >
          {/* Row 1: Logo (ซ้าย) - Actions (ขวา) */}
          <View style={styles.headerRowTop}>
            <Image
              source={logoUrl ? { uri: logoUrl } : require("../assets/logo_3_white.png")}
              style={styles.logoImage}
            />
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => navigation.navigate("Notifications")}
              >
                <Ionicons name="notifications-outline" size={24} color="#18545d" />
                {unreadNotificationCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: secondaryColor || "#1F7EFF" }]}>
                    <Text style={[styles.badgeText, { color: primaryColor || "#1F7EFF" }]}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileCircle} onPress={() => navigation.navigate("Profile")}>
                <Text style={[styles.profileText, { color: primaryColor || "#1F7EFF" }]}>
                  {getInitials(userData?.full_name)}
                </Text>
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
                style={styles.menuButton}
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
                <Text style={[styles.menuText, { color: primaryColor || "#155B5B" }]}>โครงการ</Text>
                {/* โครงการ */}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // HeaderOriginal - ใช้รูป header_bg_new.png แทน primaryColor
        <ImageBackground
          // source={require("../assets/webp/header_bg_new_1.webp")}
          style={styles.headerOriginalBackground}
          resizeMode="stretch"
          imageStyle={styles.headerOriginalImage}
        >
          {/* Row 1: Logo (ซ้าย) - Actions (ขวา) */}
          <View style={styles.headerRowTop}>
            <Image
              source={require("../assets/livlink_logo.png")}
              style={styles.logoImage}
            />
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => navigation.navigate("Notifications")}
              >
                <Ionicons name="notifications-outline" size={24} color="#18545d" />
                {unreadNotificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileCircle} onPress={() => navigation.navigate("Profile")}>
                <Text style={styles.profileText}>{getInitials(userData?.full_name)}</Text>
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
                style={styles.menuButton}
                onPress={() => navigation.navigate("HomeOption")}
              >
                <Ionicons name="home" size={24} color="#2A405E" />
                <Text style={[styles.menuText, { color: "#2A405E" }]}>บ้านของฉัน</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => navigation.navigate("VilageOption")}
              >
                <Ionicons name="people" size={24} color="#2A405E" />
                <Text style={[styles.menuText, { color: "#2A405E" }]}>หมู่บ้านของฉัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      )
      }


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
            {/* {renderMenuItem("megaphone", "ข่าวสาร", () =>
              navigation.navigate("News")
            )} */}
            {renderMenuItem("warning", "แจ้งปัญหา", () =>
              navigation.navigate("IssueMenu")
            )}
            {renderMenuItem("car", "ผู้มาเยี่ยม", () =>
              navigation.navigate("Estamp")
            )}
            {renderMenuItem("chatbubble", "เรียกรปภ.", () =>
              setCallGuardModalVisible(true)
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

          {loadingAnnouncements ? (
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

        {/* Footer Section */}
        <Footer />
      </ScrollView>

      {/* Call Guard Modal */}
      <CallGuardModal
        visible={callGuardModalVisible}
        onClose={() => setCallGuardModalVisible(false)}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
      {/* <BottomNavigation navigation={navigation} activeScreen="Home" /> */}
    </SafeAreaView >
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
  // Styles for HeaderOriginal with background image
  headerOriginalBackground: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 14,
    marginTop: 0,
    marginHorizontal: 0,
    position: "relative",
    minHeight: 280,
    justifyContent: "flex-end",
    overflow: "hidden",
    backgroundColor: "#2A405E",
  },
  headerOriginalImage: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    width: "100%",
    height: "100%",
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
    top: -7,
    right: 0,
    backgroundColor: "#217FFF",
    borderRadius: 15,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "NotoSansThai_700Bold",
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
    fontFamily: "NotoSansThai_700Bold",
  },
  headerRowBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 16,
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
    fontFamily: "NotoSansThai_700Bold",
    marginBottom: 1,
  },
  headerUserAddress: {
    color: "#fff",
    fontSize: 13.5,
    fontFamily: "NotoSansThai_400Regular",
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
    fontFamily: "NotoSansThai_700Bold",
    color: "#000000ff",
  },
  sectionTitleHome: {
    fontSize: 20,
    fontFamily: "NotoSansThai_700Bold",
    color: "#fff",
  },
  seeAllText: {
    color: "#666",
    fontFamily: "NotoSansThai_400Regular",
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
    fontFamily: "NotoSansThai_600SemiBold",
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
    // borderColor: "#2A405E",
    backgroundColor: "#f5f5f5",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuLabel: {
    fontSize: 14,
    color: "#205248",
    textAlign: "center",
    fontFamily: "NotoSansThai_500Medium",
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
  noImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  noImageText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'NotoSansThai_400Regular',
    color: '#9CA3AF',
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
    fontFamily: 'NotoSansThai_700Bold',
    color: '#fff',
  },
  globalBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  globalBadgeText: {
    fontSize: 11,
    fontFamily: 'NotoSansThai_700Bold',
    color: '#fff',
  },
  newsContent: {
    padding: 16,
  },
  newsTitle: {
    fontSize: 16,
    fontFamily: "NotoSansThai_700Bold",
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
    fontFamily: 'NotoSansThai_400Regular',
    color: '#6B7280',
  },
  newsDescription: {
    fontSize: 14,
    color: "#205248",
    lineHeight: 20,
    fontFamily: "NotoSansThai_400Regular",
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
    fontFamily: "NotoSansThai_400Regular",
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  errorText: {
    color: "#ff6b6b",
    fontFamily: "NotoSansThai_400Regular",
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
    fontFamily: "NotoSansThai_400Regular",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    color: "#666",
    fontFamily: "NotoSansThai_400Regular",
  },
});

export default HomeScreen;
