import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ImageBackground,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { logout } from "../../services/authService";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Kanit_400Regular,
  Kanit_500Medium,
  Kanit_700Bold,
} from "@expo-google-fonts/kanit";

const { width, height } = Dimensions.get("window");
const PRIMARY_COLOR = "#2A405E";

const JoinUnitScreen = () => {
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
  });

  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();

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

  const getInitials = (fullName) => {
    if (!fullName) return "";
    const names = fullName.split(" ");
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
  };

  const handleScanQRCode = () => {
    navigation.navigate("JointByQRcode");
  };

  const handleEnterCode = () => {
    navigation.navigate("JointByCode");
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Background */}
      <ImageBackground
        source={require("../../assets/banner_header_3.png")}
        style={styles.headerBackground}
        resizeMode="cover"
        imageStyle={{
          width: "100%",
          height: "100%",
        }}
      >
        {/* Header Content */}
        <View style={styles.headerOverlay}>
          <View style={styles.headerTopRow}>
            {/* Logo */}
            <Image
              source={require("../../assets/livlink_logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            {/* Profile Circle */}
            <View style={styles.profileCircle}>
              <Text style={styles.profileText}>
                {getInitials(userData?.full_name)}
              </Text>
            </View>
          </View>

          {/* Header Text */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>เข้าสู่โครงการเพื่อ</Text>
            <Text style={styles.headerSubtitle}>ใช้รับความสะดวกที่เรามอบให้</Text>
          </View>
        </View>
      </ImageBackground>

      {/* Body Content */}
      <View style={styles.body}>
        <Text style={styles.instructionTitle}>ขณะนี้ผู้ใช้ไม่ได้อยู่ในโครงการ</Text>
        <Text style={styles.instructionSubtitle}>วิธีการเข้าสู่โครงการมีดังนี้</Text>

        {/* Scan QR Code Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleScanQRCode}
        >
          <Text style={styles.primaryButtonText}>สแกนคิวอาร์โค้ด</Text>
        </TouchableOpacity>

        {/* Enter Code Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleEnterCode}
        >
          <Text style={styles.secondaryButtonText}>รหัสคำเชิญ</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>ถ้าหากคุณไม่มีคิวอาร์โค้ดหรือรหัสคำเชิญ</Text>
        <Text style={styles.footerText}>โปรดติดต่อที่นิติบุคคล</Text>
      </View>

      {/* Logout Link */}
      <TouchableOpacity
        style={styles.bottomProfileLinkContainer}
        onPress={() => logout(navigation)}
      >
        <Text style={styles.profileLinkText}>ออกจากระบบ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerBackground: {
    width: "100%",
    height: height * 0.32,
    backgroundColor: PRIMARY_COLOR,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: "rgba(42, 64, 94, 0.7)",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileText: {
    fontSize: 16,
    fontFamily: "Kanit_700Bold",
    color: PRIMARY_COLOR,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Kanit_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: "Kanit_400Regular",
    color: "#fff",
    textAlign: "center",
    marginTop: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
  },
  instructionTitle: {
    fontSize: 20,
    fontFamily: "Kanit_700Bold",
    color: PRIMARY_COLOR,
    marginBottom: 8,
    textAlign: "center",
  },
  instructionSubtitle: {
    fontSize: 14,
    fontFamily: "Kanit_400Regular",
    color: "#888",
    marginBottom: 32,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    height: 54,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: "Kanit_500Medium",
    color: "#fff",
  },
  secondaryButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 18,
    fontFamily: "Kanit_500Medium",
    color: PRIMARY_COLOR,
  },
  footerContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Kanit_400Regular",
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomProfileLinkContainer: {
    alignItems: "center",
    paddingBottom: 24,
  },
  profileLinkText: {
    fontSize: 16,
    fontFamily: "Kanit_400Regular",
    color: "#999",
    textDecorationLine: "underline",
  },
});

export default JoinUnitScreen;
