import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Platform,
    SafeAreaView,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
    useFonts,
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
} from "@expo-google-fonts/kanit";
import { sendOTP, verifyOTP } from "../../services/firebaseService";
import ApiService from "../../services/apiService";
import SuccessDialog from "../../components/SuccessDialog";

const ChangePasswordScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { phone } = route.params || {};

    const [step, setStep] = useState(1); // 1: OTP, 2: New Password
    const [otpCode, setOtpCode] = useState("");
    const [firebaseToken, setFirebaseToken] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Dialog State
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    const [fontsLoaded] = useFonts({
        Kanit_400Regular,
        Kanit_500Medium,
        Kanit_700Bold,
    });

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const handleSendOTP = async () => {
        if (!phone) {
            Alert.alert("Error", "ไม่พบเบอร์โทรศัพท์");
            return;
        }

        setLoading(true);
        try {
            const result = await sendOTP(phone);
            if (result.success) {
                setOtpSent(true);
                setCountdown(60);
                Alert.alert("Success", "ส่ง OTP ไปยังเบอร์โทรศัพท์แล้ว");
            } else {
                Alert.alert("Error", result.message || "ไม่สามารถส่ง OTP ได้");
            }
        } catch (error) {
            Alert.alert("Error", "เกิดข้อผิดพลาดในการส่ง OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otpCode.length !== 6) {
            Alert.alert("Error", "กรุณากรอก OTP 6 หลัก");
            return;
        }

        setLoading(true);
        try {
            const result = await verifyOTP(otpCode);
            if (result.success) {
                setFirebaseToken(result.token);
                setStep(2); // Move to password change step
            } else {
                Alert.alert("Error", result.message || "OTP ไม่ถูกต้อง");
            }
        } catch (error) {
            Alert.alert("Error", "เกิดข้อผิดพลาดในการยืนยัน OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 6) {
            Alert.alert("Error", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "รหัสผ่านไม่ตรงกัน");
            return;
        }

        setLoading(true);
        try {
            await ApiService.post("/api/auth/reset-password-firebase", {
                firebase_token: firebaseToken,
                new_password: newPassword,
            });

            // Show success dialog instead of Alert
            setShowSuccessDialog(true);
        } catch (error) {
            console.error("Change Password Error:", error);
            Alert.alert("Error", error.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessDialogClose = () => {
        setShowSuccessDialog(false);
        navigation.goBack();
    };

    if (!fontsLoaded) {
        return <View style={styles.loadingContainer}><ActivityIndicator /></View>;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>เปลี่ยนรหัสผ่าน</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAwareScrollView
                style={styles.container}
                contentContainerStyle={{ flexGrow: 1 }}
                enableOnAndroid={true}
                extraScrollHeight={Platform.OS === "ios" ? 20 : 100}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {step === 1 ? (
                        <>
                            <Text style={styles.description}>
                                กรุณายืนยันตัวตนด้วย OTP ที่ส่งไปยังเบอร์ {phone}
                            </Text>

                            {!otpSent ? (
                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={handleSendOTP}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>ส่ง OTP</Text>
                                    )}
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="keypad-outline" size={20} color="#666" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="กรอกรหัส OTP 6 หลัก"
                                            value={otpCode}
                                            onChangeText={setOtpCode}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            editable={!loading}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.primaryButton}
                                        onPress={handleVerifyOTP}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.buttonText}>ยืนยัน OTP</Text>
                                        )}
                                    </TouchableOpacity>

                                    <View style={styles.resendContainer}>
                                        <Text style={styles.resendText}>ไม่ได้รับรหัส OTP? </Text>
                                        <TouchableOpacity
                                            onPress={handleSendOTP}
                                            disabled={countdown > 0 || loading}
                                        >
                                            <Text style={[
                                                styles.resendLink,
                                                (countdown > 0 || loading) && styles.disabledLink
                                            ]}>
                                                {countdown > 0 ? `ส่งใหม่ใน ${countdown}s` : "ส่งรหัสใหม่"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <Text style={styles.description}>
                                กรุณากรอกรหัสผ่านใหม่
                            </Text>

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry
                                    editable={!loading}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="ยืนยันรหัสผ่านใหม่"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    editable={!loading}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleChangePassword}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>บันทึกรหัสผ่าน</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </KeyboardAwareScrollView>

            {/* Success Dialog */}
            <SuccessDialog
                visible={showSuccessDialog}
                title="สำเร็จ!"
                message="เปลี่ยนรหัสผ่านเรียบร้อยแล้ว"
                buttonText="ตกลง"
                onButtonPress={handleSuccessDialogClose}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#fff",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: "Kanit_700Bold",
        color: "#333",
    },
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
        flex: 1,
    },
    description: {
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#666",
        marginBottom: 30,
        textAlign: "center",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        marginBottom: 20,
        backgroundColor: "#f9f9f9",
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontFamily: "Kanit_400Regular",
        fontSize: 16,
        color: "#333",
    },
    primaryButton: {
        backgroundColor: "#1F7EFF",
        height: 50,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
        shadowColor: "#1F7EFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Kanit_500Medium",
    },
    resendContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 20,
    },
    resendText: {
        fontFamily: "Kanit_400Regular",
        color: "#666",
    },
    resendLink: {
        fontFamily: "Kanit_500Medium",
        color: "#1F7EFF",
    },
    disabledLink: {
        color: "#999",
    }
});

export default ChangePasswordScreen;
