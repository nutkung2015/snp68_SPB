import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    Alert,
    Platform,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UnitsService } from "../../services";
import SuccessDialog from "../../components/SuccessDialog";
import {
    useFonts,
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
} from "@expo-google-fonts/kanit";

const { width, height } = Dimensions.get("window");
const PRIMARY_COLOR = "#2A405E";

const JointByCode = () => {
    const [fontsLoaded] = useFonts({
        Kanit_400Regular,
        Kanit_500Medium,
        Kanit_700Bold,
    });

    const [invitationCode, setInvitationCode] = useState("");
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    // Dialog states
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [dialogLoading, setDialogLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [navigateDestination, setNavigateDestination] = useState("Home");

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

    // Refresh user data from server
    const refreshUserData = async () => {
        try {
            const storedUserData = await AsyncStorage.getItem("userData");
            if (storedUserData) {
                const currentData = JSON.parse(storedUserData);
                setUserData(currentData);
            }
        } catch (error) {
            console.error("Error refreshing user data:", error);
        }
    };

    // Navigate with delay to allow server to process
    const navigateWithDelay = (destination, delay = 1500) => {
        return new Promise((resolve) => {
            setTimeout(async () => {
                await refreshUserData();
                navigation.reset({
                    index: 0,
                    routes: [{ name: destination }],
                });
                resolve();
            }, delay);
        });
    };

    // Handle dialog button press
    const handleDialogConfirm = async () => {
        setDialogLoading(true);
        await navigateWithDelay(navigateDestination, 1500);
        setDialogLoading(false);
        setShowSuccessDialog(false);
    };

    const handleJoinUnit = async () => {
        if (!invitationCode.trim()) {
            Alert.alert("ผิดพลาด", "กรุณากรอกรหัสคำเชิญ");
            return;
        }

        setLoading(true);

        try {
            // Get user role from stored userData
            const userRole = userData?.role || userData?.roles?.[0];
            console.log("User role:", userRole);

            let data;

            if (userRole === "security" || userRole === "juristic") {
                // Security and Juristic users join project directly
                console.log("Joining project (security/juristic)...");
                data = await UnitsService.joinProject(invitationCode.trim());

                // Update AsyncStorage with new projectMembership
                const updatedUserData = { ...userData };
                if (!updatedUserData.projectMemberships) {
                    updatedUserData.projectMemberships = [];
                }
                updatedUserData.projectMemberships.push({
                    project_id: data.project_id,
                    project_name: data.project_name,
                    role: data.role || userRole
                });
                await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));

                // Set dialog states and show success dialog
                setSuccessMessage(data.message || "เข้าร่วมโครงการสำเร็จ!");
                setNavigateDestination(userRole === "security" ? "GuardHome" : "Home");
                setLoading(false);
                setShowSuccessDialog(true);
            } else {
                // Resident users join unit (which also adds them to project)
                console.log("Joining unit (resident)...");
                data = await UnitsService.joinUnit(invitationCode.trim());

                // Update AsyncStorage with new memberships from response
                const updatedUserData = { ...userData };

                // Check if response has unit_id directly or in data
                const unitId = data.unit_id || data.data?.unit_id;
                const projectId = data.project_id || data.data?.project_id;

                if (unitId) {
                    if (!updatedUserData.unitMemberships) {
                        updatedUserData.unitMemberships = [];
                    }
                    updatedUserData.unitMemberships.push({
                        unit_id: unitId,
                        unit_number: data.unit_number || data.data?.unit_number,
                    });
                }

                if (projectId) {
                    if (!updatedUserData.projectMemberships) {
                        updatedUserData.projectMemberships = [];
                    }
                    updatedUserData.projectMemberships.push({
                        project_id: projectId,
                        project_name: data.project_name || data.data?.project_name,
                    });
                }

                await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));

                // Set dialog states and show success dialog
                setSuccessMessage(data.message || "เข้าร่วมโครงการสำเร็จ!");
                setNavigateDestination("Home");
                setLoading(false);
                setShowSuccessDialog(true);
            }

            setInvitationCode("");
        } catch (error) {
            console.error("Error joining:", error);
            setLoading(false);
            Alert.alert("เกิดข้อผิดพลาด", error.message || "กรุณาลองใหม่อีกครั้ง");
        }
    };

    if (!fontsLoaded) {
        return null;
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                    <Text style={styles.backText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title */}
                    <Text style={styles.pageTitle}>รหัสคำเชิญเข้าโครงการ</Text>

                    {/* Instruction */}
                    <View style={styles.instructionContainer}>
                        <Text style={styles.instructionText}>
                            กรอกรหัสคำเชิญที่ได้รับจากนิติบุคคล
                        </Text>
                        <Text style={styles.instructionText}>
                            เพื่อเข้าสู่โครงการ
                        </Text>
                    </View>

                    {/* Code Input */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.codeInput}
                            placeholder="กรอกรหัสคำเชิญ..."
                            placeholderTextColor="#A0A0A0"
                            value={invitationCode}
                            onChangeText={setInvitationCode}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            maxLength={10}
                        />
                    </View>

                    {/* Example Code */}
                    <View style={styles.exampleContainer}>
                        <Ionicons name="information-circle-outline" size={18} color="#888" />
                        <Text style={styles.exampleText}>
                            ตัวอย่างรหัส: ABC123
                        </Text>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            !invitationCode.trim() && styles.submitButtonDisabled
                        ]}
                        onPress={handleJoinUnit}
                        disabled={loading || !invitationCode.trim()}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.submitButtonText}>เข้าสู่โครงการ</Text>
                        )}
                    </TouchableOpacity>

                    {/* Footer Note */}
                    <View style={styles.footerNote}>
                        <Text style={styles.footerNoteText}>
                            ถ้าหากคุณไม่มีรหัสคำเชิญ
                        </Text>
                        <Text style={styles.footerNoteText}>
                            โปรดติดต่อที่นิติบุคคลของโครงการ
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Success Dialog */}
            <SuccessDialog
                visible={showSuccessDialog}
                title="สำเร็จ! 🎉"
                message={`${successMessage}\n\nกดปุ่มด้านล่างเพื่อไปยังหน้าหลัก`}
                buttonText="ไปหน้าหลัก"
                onButtonPress={handleDialogConfirm}
                loading={dialogLoading}
                loadingText="กำลังโหลดข้อมูล..."
                icon="checkmark-circle"
                iconColor="#4CAF50"
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: Platform.OS === "ios" ? 10 : 16,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: "#fff",
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
    },
    backText: {
        marginLeft: 4,
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#000",
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    pageTitle: {
        fontSize: 24,
        fontFamily: "Kanit_700Bold",
        color: PRIMARY_COLOR,
        textAlign: "center",
        marginBottom: 16,
    },
    instructionContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    instructionText: {
        fontSize: 14,
        fontFamily: "Kanit_400Regular",
        color: "#888",
        textAlign: "center",
        lineHeight: 22,
    },
    inputContainer: {
        marginBottom: 16,
    },
    codeInput: {
        width: "100%",
        height: 60,
        borderWidth: 2,
        borderColor: PRIMARY_COLOR,
        borderRadius: 12,
        paddingHorizontal: 20,
        fontSize: 22,
        fontFamily: "Kanit_700Bold",
        color: PRIMARY_COLOR,
        textAlign: "center",
        letterSpacing: 4,
        backgroundColor: "#fff",
    },
    exampleContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 32,
    },
    exampleText: {
        fontSize: 13,
        fontFamily: "Kanit_400Regular",
        color: "#888",
        marginLeft: 6,
    },
    submitButton: {
        width: "100%",
        height: 54,
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        backgroundColor: "#ccc",
        shadowOpacity: 0,
        elevation: 0,
    },
    submitButtonText: {
        fontSize: 18,
        fontFamily: "Kanit_500Medium",
        color: "#fff",
    },
    footerNote: {
        flex: 1,
        justifyContent: "flex-end",
        alignItems: "center",
        paddingVertical: 32,
    },
    footerNoteText: {
        fontSize: 14,
        fontFamily: "Kanit_400Regular",
        color: "#888",
        textAlign: "center",
        lineHeight: 22,
    },
});

export default JointByCode;