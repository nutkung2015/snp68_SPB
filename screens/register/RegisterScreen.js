import React, { useState, useRef, useEffect } from "react";
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
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { register } from "../../services/authService";
import { sendOTP, verifyOTP, formatPhoneNumber } from "../../services/firebaseService";

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [firebaseToken, setFirebaseToken] = useState(null);

  // OTP input refs for individual boxes
  const otpInputRefs = useRef([]);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Validate phone number
  const isValidPhone = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/[\s-]/g, '');
    // Thai phone: 10 digits starting with 0, or with +66/66 prefix
    const pattern = /^(0[0-9]{9}|\+66[0-9]{9}|66[0-9]{9})$/;
    return pattern.test(cleaned);
  };

  // Handle Send OTP
  const handleSendOTP = async () => {
    if (!phone) {
      setError("กรุณากรอกเบอร์โทรศัพท์");
      return;
    }

    if (!isValidPhone(phone)) {
      setError("กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (10 หลัก)");
      return;
    }

    setSendingOtp(true);
    setError("");

    try {
      const result = await sendOTP(phone);

      if (result.success) {
        setOtpSent(true);
        setCountdown(60); // 60 seconds countdown
        Alert.alert("สำเร็จ", "ส่ง OTP ไปยังเบอร์ " + formatPhoneNumber(phone) + " แล้ว");
      } else {
        setError(result.message);
        Alert.alert("ข้อผิดพลาด", result.message);
      }
    } catch (err) {
      console.error("Error sending OTP:", err);
      setError("ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่");
    } finally {
      setSendingOtp(false);
    }
  };

  // Handle OTP digit input
  const handleOtpDigitChange = (text, index) => {
    const newDigits = [...otpDigits];
    newDigits[index] = text;
    setOtpDigits(newDigits);
    setOtpCode(newDigits.join(''));

    // Auto focus next input
    if (text && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Verify OTP
  const handleVerifyOTP = async () => {
    const code = otpDigits.join('');

    if (code.length !== 6) {
      setError("กรุณากรอก OTP 6 หลัก");
      return;
    }

    setVerifyingOtp(true);
    setError("");

    try {
      const result = await verifyOTP(code);

      if (result.success) {
        setOtpVerified(true);
        setFirebaseToken(result.token);
        Alert.alert("สำเร็จ", "ยืนยันเบอร์โทรศัพท์สำเร็จ!");
        Keyboard.dismiss();
      } else {
        setError(result.message);
        // Clear OTP inputs on error
        setOtpDigits(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setError("ไม่สามารถยืนยัน OTP ได้ กรุณาลองใหม่");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRegister = async () => {
    // Validate inputs
    if (!fullName || !email || !password || !phone) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (!otpVerified) {
      setError("กรุณายืนยันเบอร์โทรศัพท์ด้วย OTP");
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

  // Check if form is valid for registration
  const isFormValid = fullName && email && password && confirmPassword && phone && otpVerified;

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../../assets/baner_new_r5.png")}
        style={styles.headerBackground}
        resizeMode="cover"
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}></View>
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
            keyboardType="email-address"
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

          {/* Phone Input with OTP Button */}
          <View style={styles.phoneContainer}>
            <TextInput
              style={[
                styles.phoneInput,
                otpVerified && styles.inputVerified,
                otpSent && !otpVerified && styles.inputPending,
              ]}
              placeholder="เบอร์โทรศัพท์"
              placeholderTextColor="#07354E"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                // Reset OTP states if phone changes
                if (otpSent || otpVerified) {
                  setOtpSent(false);
                  setOtpVerified(false);
                  setOtpDigits(["", "", "", "", "", ""]);
                  setOtpCode("");
                }
              }}
              keyboardType="phone-pad"
              editable={!otpVerified}
            />
            {otpVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.otpButton,
                  (sendingOtp || countdown > 0) && styles.otpButtonDisabled,
                ]}
                onPress={handleSendOTP}
                disabled={sendingOtp || countdown > 0}
              >
                {sendingOtp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.otpButtonText}>
                    {countdown > 0
                      ? `${countdown}s`
                      : otpSent
                        ? "ส่งอีกครั้ง"
                        : "ขอ OTP"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* OTP Input Section */}
          {otpSent && !otpVerified && (
            <View style={styles.otpSection}>
              <Text style={styles.otpLabel}>กรอกรหัส OTP 6 หลัก</Text>
              <View style={styles.otpInputContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (otpInputRefs.current[index] = ref)}
                    style={styles.otpDigitInput}
                    value={otpDigits[index]}
                    onChangeText={(text) =>
                      handleOtpDigitChange(
                        text.replace(/[^0-9]/g, "").slice(-1),
                        index
                      )
                    }
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[
                  styles.verifyOtpButton,
                  verifyingOtp && styles.verifyOtpButtonDisabled,
                ]}
                onPress={handleVerifyOTP}
                disabled={verifyingOtp || otpDigits.join("").length !== 6}
              >
                {verifyingOtp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.verifyOtpButtonText}>ยืนยัน OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Verified Badge */}
          {otpVerified && (
            <View style={styles.verifiedMessage}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.verifiedText}>
                เบอร์โทรศัพท์ได้รับการยืนยันแล้ว
              </Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.registerButton,
              !isFormValid && styles.registerButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading || !isFormValid}
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
      </KeyboardAwareScrollView>

      {/* Hidden reCAPTCHA container for Firebase */}
      <View id="recaptcha-container" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerBackground: {
    height: "20%",
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
    // flex: 1, removed to support ScrollView
    alignItems: "center",
  },
  form: {
    width: "90%",
    alignItems: "center",
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    marginTop: 40,
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
    backgroundColor: "#fff",
  },
  inputVerified: {
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E9",
  },
  inputPending: {
    borderColor: "#FF9800",
  },
  phoneContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  phoneInput: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#205248",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#205248",
    fontFamily: "Kanit_400Regular",
    backgroundColor: "#fff",
  },
  otpButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: "#07354E",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  otpButtonDisabled: {
    backgroundColor: "#999",
  },
  otpButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Kanit_500Medium",
  },
  verifiedBadge: {
    marginLeft: 8,
    padding: 12,
  },
  otpSection: {
    width: "100%",
    marginBottom: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  otpLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "Kanit_400Regular",
  },
  otpInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  otpDigitInput: {
    width: 45,
    height: 50,
    borderWidth: 2,
    borderColor: "#205248",
    borderRadius: 8,
    fontSize: 24,
    fontFamily: "Kanit_600SemiBold",
    color: "#205248",
    backgroundColor: "#fff",
  },
  verifyOtpButton: {
    width: "100%",
    height: 44,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  verifyOtpButtonDisabled: {
    backgroundColor: "#A5D6A7",
  },
  verifyOtpButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Kanit_500Medium",
  },
  verifiedMessage: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    width: "100%",
  },
  verifiedText: {
    marginLeft: 8,
    color: "#4CAF50",
    fontSize: 14,
    fontFamily: "Kanit_500Medium",
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
  registerButtonDisabled: {
    backgroundColor: "#B0BEC5",
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Kanit_600SemiBold",
  },
  errorText: {
    color: "red",
    marginBottom: 8,
    fontFamily: "Kanit_400Regular",
  },
  loginLink: {
    marginTop: 16,
  },
  loginText: {
    color: "#222",
    fontSize: 14,
    fontFamily: "Kanit_400Regular",
  },
});
