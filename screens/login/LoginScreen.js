import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ImageBackground,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login } from "../../services/authService";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import NotificationService from "../../services/notificationService";

export default function LoginScreen({ navigation, recheckLoginStatus }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // เพิ่ม state สำหรับ loading
  const [showPassword, setShowPassword] = useState(false);

  // const handleLogin = async () => {
  //   // ใช้ token mockup ชั่วคราว
  //   if (email === "test@email.com" && password === "1234") {
  //     setError("");
  //     navigation.navigate("Home");
  //   }

  //   const mockToken = "mock-token-12345";
  //   await AsyncStorage.setItem("authToken", mockToken);
  //   navigation.replace("Home");
  // };

  // ... (โค้ดส่วนอื่นๆ)

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await login(email, password);
      if (response.status === "success") {
        // Register for push notifications after successful login (non-blocking)
        // Use setTimeout to ensure it runs after navigation completes
        setTimeout(async () => {
          try {
            const pushToken = await NotificationService.registerForPushNotifications();
            if (pushToken) {
              console.log("[Login] Push token registered:", pushToken);
            }
          } catch (pushError) {
            console.error("[Login] Push notification registration error:", pushError);
          }
        }, 1000);

        await recheckLoginStatus(); // Trigger recheck to navigate to Home
      } else {
        setError(response.message || "Login failed");
      }
    } catch (error) {
      console.error("LoginScreen handleLogin error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../../assets/baner_new_r5.png")}
        style={styles.headerBackground}
        resizeMode="cover"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              {/* <Image
                source={require("../../assets/logo_1.png")}
                style={styles.logoImage}
              /> */}
            </View>
          </View>
        </View>
      </ImageBackground>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 20 : 100}
        enableAutomaticScroll={true}
      >
        <View style={styles.form}>
          <Text style={styles.loginTitle}>ล็อกอินเพื่อเข้าสู่ระบบ</Text>
          <View style={styles.emailContainer}>
            <TextInput
              style={styles.emailInput}
              placeholder="อีเมลหรือเบอร์โทรศัพท์"
              placeholderTextColor="#2f3f47ff"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="รหัสผ่าน"
              placeholderTextColor="#2f3f47ff"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color="#2f3f47ff"
              />
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.registerText}>
            ถ้าคุณไม่มีรหัส <Text style={{ color: "#07354E" }}>สมัครที่นี่</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerBackground: {
    height: 200,  // หรือค่าที่เหมาะสม
    width: "100%",
    // ลบ backgroundColor: "#666" ออก
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

  logoContainer: {
    // backgroundColor: "#666",
    padding: 8,
    borderRadius: 8,
  },
  logoImage: {
    width: 50, // กำหนดความกว้างของรูปภาพ
    height: 50, // กำหนดความสูงของรูปภาพ
    resizeMode: "contain", // ปรับขนาดรูปภาพให้พอดีโดยไม่ตัดส่วนใดส่วนหนึ่งออก
  },
  formContainer: {
    // flex: 1, removed to support ScrollView
    // justifyContent: "center",
    alignItems: "center",
  },

  form: {
    // alignItems: "center",
    width: "90%",
    alignItems: "center",
    // backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    marginTop: 70, // ดึง form ขึ้นมาทับ headerBackground เล็กน้อย
    zIndex: 1, // ให้ form อยู่ด้านบน
  },
  loginTitle: {
    fontSize: 18,
    color: "#222",
    marginBottom: 16,
    fontFamily: "Kanit_600SemiBold",
    // fontWeight: "bold",
  },
  loginButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#07354E",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Kanit_600SemiBold",
    // fontWeight: "bold",
  },
  emailContainer: {
    width: "100%",
    position: "relative",
    marginBottom: 12,
  },
  emailInput: {
    width: "100%",
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#205248",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#205248",
    fontFamily: "Kanit_400Regular",
  },
  passwordContainer: {
    width: "100%",
    position: "relative",
    marginBottom: 12,
  },
  passwordInput: {
    width: "100%",
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#205248",
    paddingHorizontal: 16,
    paddingRight: 50, // เพิ่มพื้นที่สำหรับไอคอน
    fontSize: 16,
    color: "#205248",
    fontFamily: "Kanit_400Regular",
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 8,
    padding: 4,
  },
  errorText: {
    color: "red",
    marginBottom: 8,
  },
  registerLink: {
    marginTop: 16,
  },
  registerText: {
    color: "#222",
    fontSize: 14,
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
    // fontFamily: "Kanit_400Regular", // ต้อง import font ก่อน
  },
  addressText: {
    fontSize: 16,
    // fontFamily: "Kanit_700Bold", // ต้อง import font ก่อน
  },
});
