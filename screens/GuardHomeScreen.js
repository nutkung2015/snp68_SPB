import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SecurityBottomNavigation from "../components/SecurityBottomNavigation";
import { useFocusEffect } from "@react-navigation/native";
import { NotificationService } from "../services";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ProjectCustomizationsService from "../services/projectCustomizationsService";

const GuardHomeScreen = ({ navigation }) => {
  

  const [userData, setUserData] = useState(null);
  const [secondaryColor, setSecondaryColor] = useState("#155B5B");
  const [primaryColor, setPrimaryColor] = useState("#14336B");
  const [logoUrl, setLogoUrl] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);
          if (parsedUserData?.projectMemberships?.[0]?.project_id) {
            fetchProjectCustomizations(parsedUserData.projectMemberships[0].project_id);
          }
        }
      } catch (error) {
        console.error("Failed to load user data from AsyncStorage", error);
      }
    };
    loadUserData();
  }, []);

  const fetchProjectCustomizations = async (projectId) => {
    try {
      const response = await ProjectCustomizationsService.getProjectCustomizations(projectId);
      if (response) {
        if (response.primary_color) setPrimaryColor(response.primary_color);
        if (response.secondary_color) setSecondaryColor(response.secondary_color);
        if (response.logo_url) setLogoUrl(response.logo_url);
      }
    } catch (err) {
      console.error("Error fetching project customizations:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchUnreadCount = async () => {
        const count = await NotificationService.getUnreadCount();
        setUnreadNotificationCount(count);
      };
      fetchUnreadCount();
    }, [])
  );

  

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View
        style={[styles.gradientCardHeader, { backgroundColor: primaryColor || "#2A405E" }]}
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
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileCircle} onPress={() => navigation.navigate("Profile")}>
              <Text style={styles.profileText}>
                {userData?.full_name ? userData.full_name.substring(0, 2).toUpperCase() : "GD"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Row 2: ไอคอนบ้าน + user info */}
        <View style={styles.headerRowBottom}>
          <Ionicons
            name="shield-checkmark"
            size={32}
            color="#fff"
            style={styles.headerHouseIcon}
          />
          <View style={styles.headerUserBox}>
            <Text style={styles.headerUserName}>สวัสดีคุณ {userData?.full_name || "รปภ."}</Text>
            <Text style={styles.headerUserAddress}>
              {userData?.projectMemberships?.[0]?.project_name || "โครงการ"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* บริการทั้งหมด */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>บริการทั้งหมด</Text>

          {/* Menu Grid */}
          <View style={styles.menuGrid}>
            {/* รถเข้าโครงการ */}
            <TouchableOpacity
              style={[styles.menuCard, { opacity: 0.75, borderColor: primaryColor || "#205248" }]}
              onPress={() => navigation.navigate("GuardDashboard")}
            >
              <View style={[styles.menuGradient, { backgroundColor: primaryColor || "#4DB59F" }]}>
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="car-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuCardText}>รถเข้าโครงการ</Text>
              </View>
            </TouchableOpacity>

            {/* แจ้งปัญหา */}
            <TouchableOpacity
              style={[styles.menuCard, { opacity: 0.75, borderColor: primaryColor || "#205248" }]}
              onPress={() => navigation.navigate("IssueMenu")}
            >
              <View style={[styles.menuGradient, { backgroundColor: primaryColor || "#4DB59F" }]}>
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="warning-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuCardText}>แจ้งปัญหา</Text>
              </View>
            </TouchableOpacity>

            {/* เบอร์ฉุกเฉิน */}
            <TouchableOpacity
              style={[styles.menuCard, { opacity: 0.75, borderColor: primaryColor || "#205248" }]}
              onPress={() => navigation.navigate("NumberEmergency")}
            >
              <View style={[styles.menuGradient, { backgroundColor: primaryColor || "#4DB59F" }]}>
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="call-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuCardText}>เบอร์ฉุกเฉิน</Text>
              </View>
            </TouchableOpacity>

            {/* ขอความช่วยเหลือ */}
            {/* <TouchableOpacity
              style={[styles.menuCard, { opacity: 0.75, borderColor: primaryColor || "#205248" }]}
              onPress={() => navigation.navigate("RequestHelp")}
            >
              <View style={[styles.menuGradient, { backgroundColor: primaryColor || "#4DB59F" }]}>
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="hand-right-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuCardText}>ขอความช่วยเหลือ</Text>
              </View>
            </TouchableOpacity> */}

            {/* รายงานประจำวัน */}
            {/* <TouchableOpacity
              style={[styles.menuCard, styles.menuCardWide, { opacity: 0.75, borderColor: primaryColor || "#205248" }]}
              onPress={() => navigation.navigate("DailyReport")}
            >
              <View style={[styles.menuGradient, { backgroundColor: primaryColor || "#4DB59F" }]}>
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="document-text-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuCardText}>รายงานประจำวัน</Text>
              </View>
            </TouchableOpacity> */}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      {/* <SecurityBottomNavigation navigation={navigation} activeScreen="GuardHome" /> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
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
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
    borderWidth: 1,
    borderColor: "#fff",
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
    fontFamily: "NotoSansThai_700Bold",
    marginBottom: 1,
  },
  headerUserAddress: {
    color: "#fff",
    fontSize: 13.5,
    fontFamily: "NotoSansThai_400Regular",
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "NotoSansThai_700Bold",
    color: "#333",
    marginBottom: 15,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuCard: {
    width: "48%",
    marginBottom: 15,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 3,
    borderColor: "#205248",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuCardWide: {
    width: "48%",
  },
  menuGradient: {
    padding: 20,
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconWrapper: {
    marginBottom: 10,
  },
  menuCardText: {
    fontSize: 16,
    fontFamily: "NotoSansThai_700Bold",
    color: "#fff",
    textAlign: "center",
  },
});

export default GuardHomeScreen;
