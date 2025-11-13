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
import {
  useFonts,
  Kanit_400Regular,
  Kanit_700Bold,
} from "@expo-google-fonts/kanit";
import { AnnouncementsService } from "../services";
import apiService from "../services/apiService"; // Import API service

const HomeScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_700Bold,
  });

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customizationData, setCustomizationData] = useState(null); // State for ProjectCustomizations

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
    if (userData?.projectMemberships?.[0]?.project_id) {
      fetchProjectCustomizations(userData.projectMemberships[0].project_id);
    }
    fetchAnnouncements();
  }, [userData]);

  const fetchProjectCustomizations = async (projectId) => {
    try {
      setLoading(true);
      const response = await apiService.get(`/projectCustomizations/${projectId}`); // Fetch customization data
      setCustomizationData(response.data);
    } catch (err) {
      console.error("Error fetching project customizations:", err);
      setError("Failed to fetch project customizations");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await AnnouncementsService.getAnnouncements({
        limit: 5,
        status: "published",
      });

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

  const renderNewsItem = ({ item }) => (
    <TouchableOpacity
      style={styles.newsCard}
      onPress={() => navigation.navigate("NewsDetail", { announcementId: item.id })}
    >
      <Image
        source={{ uri: item.attachment_urls || "https://picsum.photos/300/200" }}
        style={styles.newsImage}
      />
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.newsDescription} numberOfLines={2}>
          {formatDate(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../assets/banner_header_3.png")}
        style={styles.headerBackground}
        resizeMode="cover"
        imageStyle={{
          width: "100%",
          height: "100%",
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: customizationData?.logo_url || require("../assets/logo_3_white.png") }}
                style={styles.logoImage}
              />
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>5</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.homeAddressCard}>
          <LinearGradient
            colors={[customizationData?.primary_color || "#4BB59F", customizationData?.secondary_color || "#FFD840"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientCard}
          >
            <View style={styles.addressIcon}>
              <Ionicons name="home-outline" size={24} color="#fff" />
            </View>
            <View style={styles.addressContent}>
              <Text style={[styles.addressLabel, { color: "#fff" }]}>บ้านของฉัน</Text>
              <Text style={[styles.addressText, { color: "#fff" }]}>
                {userData?.unitMemberships?.[0]?.unit_number} {userData?.projectMemberships?.[0]?.project_name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ImageBackground>

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {!customizationData && !loading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ไม่มีข้อมูลการปรับแต่ง</Text>
          </View>
        )}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ข่าวสารและประกาศ</Text>
            <FlatList
              data={announcements}
              renderItem={renderNewsItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newsListContainer}
            />
          </View>
        )}
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
    padding: 8,
    borderRadius: 8,
  },
  logoImage: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },
  content: {
    flex: 1,
  },
  homeAddressCard: {
    margin: 16,
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },
  gradientCard: {
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
    backgroundColor: "#205248",
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
  errorContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  errorText: {
    color: "#ff6b6b",
    fontFamily: "Kanit_400Regular",
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    color: "#666",
    fontFamily: "Kanit_400Regular",
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Kanit_700Bold",
    marginBottom: 16,
  },
  newsListContainer: {
    paddingHorizontal: 4,
  },
  newsCard: {
    width: 280,
    backgroundColor: "#B2DAD2",
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
    color: "#205248",
  },
  newsDescription: {
    fontSize: 14,
    color: "#205248",
    lineHeight: 20,
    fontFamily: "Kanit_400Regular",
  },
});

export default HomeScreen;
