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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SecurityBottomNavigation from "../components/SecurityBottomNavigation";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Kanit_400Regular,
  Kanit_700Bold,
} from "@expo-google-fonts/kanit";

const GuardHomeScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_700Bold,
  });

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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Background */}
      <ImageBackground
        source={require("../assets/banner_header_3.png")}
        style={styles.headerBackground}
        resizeMode="cover"
        imageStyle={{
          width: "100%",
          height: "100%",
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/logo_3_white.png")}
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

        {/* Welcome Message
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>ระบบการดีครับครับเป็นกันเองต้องการ</Text>
          <Text style={styles.welcomeSubtext}>"เสี่ยงเพื่อนบ้าน"</Text>
        </View> */}

        {/* Guard Info Card */}
        <TouchableOpacity style={[styles.guardInfoCard]}>
          <LinearGradient
            colors={["#4BB59F", "#FFD840"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientCard}
          >
            <View style={styles.guardIcon}>
              <Ionicons name="home-outline" size={24} color="#fff" />
            </View>
            <View style={styles.guardContent}>
              <Text style={[styles.guardLabel, { color: "#fff" }]}>
                โครงการของฉัน
              </Text>
              <Text style={[styles.guardText, { color: "#fff" }]}>
                {userData?.projectMemberships?.[0]?.project_name || "พฤกษ์130/1"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ImageBackground>

      <ScrollView style={styles.content}>
        {/* บริการทั้งหมด */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>บริการทั้งหมด</Text>

          {/* Menu Grid */}
          <View style={styles.menuGrid}>
            {/* รถเข้าโครงการ */}
            <TouchableOpacity
              style={[styles.menuCard, { opacity: 0.75 }]}
              onPress={() => navigation.navigate("VehicleEntry")}
            >
              <LinearGradient
                colors={["#4DB59F", "#A8C957"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.menuGradient}
              >
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="car-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuCardText}>รถเข้าโครงการ</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* แจ้งปัญหา */}
            <TouchableOpacity
              style={[styles.menuCard, { opacity: 0.75 }]}
              onPress={() => navigation.navigate("ReportIssue")}
            >
              <LinearGradient
                colors={["#4DB59F", "#A8C957"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.menuGradient}
              >
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="warning-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuCardText}>แจ้งปัญหา</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* เบอร์ฉุกเฉิน */}
            <TouchableOpacity
              style={[styles.menuCard, { opacity: 0.75 }]}
              onPress={() => navigation.navigate("EmergencyContact")}
            >
              <LinearGradient
                colors={["#4DB59F", "#A8C957"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.menuGradient}
              >
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="call-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuCardText}>เบอร์ฉุกเฉิน</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* ขอความช่วยเหลือ */}
            <TouchableOpacity
              style={[styles.menuCard, { opacity: 0.75 }]}
              onPress={() => navigation.navigate("RequestHelp")}
            >
              <LinearGradient
                colors={["#4DB59F", "#A8C957"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.menuGradient}
              >
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="hand-right-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuCardText}>ขอความช่วยเหลือ</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* รายงานประจำวัน */}
            <TouchableOpacity
              style={[styles.menuCard, styles.menuCardWide, { opacity: 0.75 }]}
              onPress={() => navigation.navigate("DailyReport")}
            >
              <LinearGradient
                colors={["#4DB59F", "#A8C957"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.menuGradient}
              >
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="document-text-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuCardText}>รายงานประจำวัน</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  headerBackground: {
    width: "100%",
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 50, // กำหนดความกว้างของรูปภาพ
    height: 50, // กำหนดความสูงของรูปภาพ
    resizeMode: "contain",
  },
  notificationButton: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Kanit_700Bold",
  },
  welcomeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 16,
    color: "#fff",
    fontFamily: "Kanit_400Regular",
    textAlign: "center",
  },
  welcomeSubtext: {
    fontSize: 28,
    color: "#fff",
    fontFamily: "Kanit_700Bold",
    textAlign: "center",
    marginTop: 5,
  },
  guardInfoCard: {
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradientCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  guardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  guardContent: {
    flex: 1,
  },
  guardLabel: {
    fontSize: 14,
    fontFamily: "Kanit_400Regular",
    marginBottom: 2,
  },
  guardText: {
    fontSize: 18,
    fontFamily: "Kanit_700Bold",
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
    fontFamily: "Kanit_700Bold",
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
    fontFamily: "Kanit_700Bold",
    color: "#fff",
    textAlign: "center",
  },
});

export default GuardHomeScreen;
