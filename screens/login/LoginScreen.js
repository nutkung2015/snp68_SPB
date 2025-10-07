import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // const handleLogin = async () => {
  //   // ใช้ token mockup ชั่วคราว
  //   if (email === "test@email.com" && password === "1234") {
  //     setError("");
  //     navigation.navigate("Home");
  //   } else {
  //     setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  //   }

  //   const mockToken = "mock-token-12345";
  //   await AsyncStorage.setItem("authToken", mockToken);
  //   navigation.replace("Home");
  // };

  const handleLogin = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await AsyncStorage.setItem("authToken", data.data.token); // Store the token
        console.log("Stored authToken (Login):", data.data.token); // Add this line
        setError("");
        navigation.replace("Home");
      } else {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (error) {
      console.error("Error during login", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>บริการดีครบครับเป็นกันเองต้องที่</Text>
        <View style={styles.logoCircle}>
          <Image
            source={require("../../assets/logo_1.png")}
            style={styles.logo}
          />
        </View>
        <Text style={styles.appName}>"เสียงเพื่อนบ้าน"</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.loginTitle}>ล็อกอินเพื่อเข้าสู่ระบบ</Text>
        <TextInput
          style={styles.input}
          placeholder="email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="password"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
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
          ถ้าคุณไม่มีรหัส <Text style={{ color: "#3ec6a8" }}>สมัครที่นี่</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 24,
  },
  headerText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logo: {
    width: 60,
    height: 60,
  },
  appName: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 16,
  },
  form: {
    width: "90%",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 18,
    color: "#222",
    marginBottom: 16,
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    height: 48,
    backgroundColor: "#f6f6f6",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
    color: "#222",
  },
  loginButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#3ec6a8",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
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
});
