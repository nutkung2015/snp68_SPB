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
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { register } from "../../services/authService";

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validate inputs
    if (!fullName || !email || !password || !phone) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userData = {
        full_name: fullName,
        email: email,
        password: password,
        phone: phone,
      };

      const data = await register(userData);

      console.log("Registration successful:", data);

      // Navigate to Login screen immediately on success
      navigation.replace("Login");

      // Show success alert (optional)
      Alert.alert(
        "สำเร็จ",
        "ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ"
      );
    } catch (error) {
      console.error("Error during registration:", error);
      setError(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      Alert.alert("ข้อผิดพลาด", error.message || "ไม่สามารถลงทะเบียนได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../../assets/mockup_banner_header_4.png")}
        style={styles.headerBackground}
        resizeMode="cover"
        imageStyle={{
          width: "100%",
          height: "100%",
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}></View>
          </View>
        </View>
      </ImageBackground>

      <SafeAreaView style={styles.formContainer}>
        <View style={styles.form}>
          <Text style={styles.registerTitle}>ลงทะเบียน</Text>

          <TextInput
            style={styles.input}
            placeholder="กรอกชื่อเต็ม"
            placeholderTextColor="#07354E"
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            style={styles.input}
            placeholder="กรอกอีเมล"
            placeholderTextColor="#07354E"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="กรอกรหัสผ่าน"
            placeholderTextColor="#07354E"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="ยืนยันรหัสผ่าน"
            placeholderTextColor="#07354E"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="เบอร์โทรศัพท์"
            placeholderTextColor="#07354E"
            value={phone}
            onChangeText={setPhone}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.loginText}>
            ถ้าคุณมีรหัสอยู่แล้ว{" "}
            <Text style={{ color: "#07354E" }}>เข้าสู่ระบบที่นี่</Text>
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerBackground: {
    height: "25%",
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
  logoContainer: {
    padding: 8,
    borderRadius: 8,
  },
  formContainer: {
    flex: 1,
    alignItems: "center",
  },
  form: {
    width: "90%",
    alignItems: "center",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    marginTop: 70,
    zIndex: 1,
  },
  registerTitle: {
    fontSize: 18,
    color: "#222",
    marginBottom: 16,
    fontFamily: "Kanit_600SemiBold",
  },
  input: {
    width: "100%",
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#205248",
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
    color: "#205248",
    fontFamily: "Kanit_400Regular",
  },
  registerButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#07354E",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Kanit_600SemiBold",
  },
  errorText: {
    color: "red",
    marginBottom: 8,
  },
  loginLink: {
    marginTop: 16,
  },
  loginText: {
    color: "#222",
    fontSize: 14,
  },
});
