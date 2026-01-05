import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    Alert,
    Platform,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UnitsService } from "../../services";
import { CameraView, useCameraPermissions } from "expo-camera";
import SuccessDialog from "../../components/SuccessDialog";
import {
    useFonts,
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
} from "@expo-google-fonts/kanit";

const { width, height } = Dimensions.get("window");
const PRIMARY_COLOR = "#2A405E";
const SCAN_AREA_SIZE = width * 0.7;

const JointByQRcode = () => {
    const [fontsLoaded] = useFonts({
        Kanit_400Regular,
        Kanit_500Medium,
        Kanit_700Bold,
    });

    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);
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

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned || loading) return;

        setScanned(true);
        setLoading(true);

        try {
            const userRole = userData?.role || userData?.roles?.[0];
            console.log("Scanned code:", data);
            console.log("User role:", userRole);

            let response;

            if (userRole === "security" || userRole === "juristic") {
                // Security and Juristic users join project directly
                console.log("Joining project (security/juristic)...");
                response = await UnitsService.joinProject(data);

                // Update AsyncStorage with new projectMembership
                const updatedUserData = { ...userData };
                if (!updatedUserData.projectMemberships) {
                    updatedUserData.projectMemberships = [];
                }
                updatedUserData.projectMemberships.push({
                    project_id: response.project_id,
                    project_name: response.project_name,
                    role: response.role || userRole
                });
                await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));

                // Set dialog states and show success dialog
                setSuccessMessage(response.message || "เข้าร่วมโครงการสำเร็จ!");
                setNavigateDestination(userRole === "security" ? "GuardHome" : "Home");
                setLoading(false);
                setShowSuccessDialog(true);
            } else {
                // Resident users join unit
                console.log("Joining unit (resident)...");
                response = await UnitsService.joinUnit(data);

                // Update AsyncStorage with new memberships from response
                const updatedUserData = { ...userData };

                // Check if response has unit_id directly or in data
                const unitId = response.unit_id || response.data?.unit_id;
                const projectId = response.project_id || response.data?.project_id;

                if (unitId) {
                    if (!updatedUserData.unitMemberships) {
                        updatedUserData.unitMemberships = [];
                    }
                    updatedUserData.unitMemberships.push({
                        unit_id: unitId,
                        unit_number: response.unit_number || response.data?.unit_number,
                    });
                }

                if (projectId) {
                    if (!updatedUserData.projectMemberships) {
                        updatedUserData.projectMemberships = [];
                    }
                    updatedUserData.projectMemberships.push({
                        project_id: projectId,
                        project_name: response.project_name || response.data?.project_name,
                    });
                }

                await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));

                // Set dialog states and show success dialog
                setSuccessMessage(response.message || "เข้าร่วมโครงการสำเร็จ!");
                setNavigateDestination("Home");
                setLoading(false);
                setShowSuccessDialog(true);
            }
        } catch (error) {
            console.error("Error joining:", error);
            setLoading(false);
            Alert.alert(
                "เกิดข้อผิดพลาด",
                error.message || "กรุณาลองใหม่อีกครั้ง",
                [
                    {
                        text: "สแกนใหม่",
                        onPress: () => setScanned(false)
                    },
                    {
                        text: "ย้อนกลับ",
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        }
    };

    if (!fontsLoaded) {
        return null;
    }

    // Permission not determined yet
    if (!permission) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    <Text style={styles.loadingText}>กำลังเตรียมกล้อง...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Permission denied
    if (!permission.granted) {
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

                <View style={styles.centerContainer}>
                    <Ionicons name="camera-outline" size={80} color="#ccc" />
                    <Text style={styles.permissionTitle}>ต้องการเข้าถึงกล้อง</Text>
                    <Text style={styles.permissionText}>
                        กรุณาอนุญาตให้แอปเข้าถึงกล้อง
                    </Text>
                    <Text style={styles.permissionText}>
                        เพื่อสแกน QR Code
                    </Text>
                    <TouchableOpacity
                        style={styles.permissionButton}
                        onPress={requestPermission}
                    >
                        <Text style={styles.permissionButtonText}>อนุญาตเข้าถึงกล้อง</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Camera View */}
            <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            >
                {/* Overlay */}
                <View style={styles.overlay}>
                    {/* Header */}
                    <View style={styles.cameraHeader}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Title */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>สแกน QR Code</Text>
                        <Text style={styles.subtitle}>
                            วาง QR Code ไว้ในกรอบเพื่อสแกน
                        </Text>
                    </View>

                    {/* Scan Area */}
                    <View style={styles.scanAreaContainer}>
                        <View style={styles.scanArea}>
                            {/* Corner Decorations */}
                            <View style={[styles.corner, styles.cornerTopLeft]} />
                            <View style={[styles.corner, styles.cornerTopRight]} />
                            <View style={[styles.corner, styles.cornerBottomLeft]} />
                            <View style={[styles.corner, styles.cornerBottomRight]} />

                            {/* Loading Indicator */}
                            {loading && (
                                <View style={styles.scanningOverlay}>
                                    <ActivityIndicator size="large" color="#fff" />
                                    <Text style={styles.scanningText}>กำลังตรวจสอบ...</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Bottom Instructions */}
                    <View style={styles.bottomContainer}>
                        <View style={styles.instructionBox}>
                            <Ionicons name="qr-code-outline" size={24} color={PRIMARY_COLOR} />
                            <Text style={styles.instructionText}>
                                QR Code คำเชิญเข้าโครงการ
                            </Text>
                        </View>

                        {scanned && !loading && !showSuccessDialog && (
                            <TouchableOpacity
                                style={styles.rescanButton}
                                onPress={() => setScanned(false)}
                            >
                                <Ionicons name="refresh" size={20} color="#fff" />
                                <Text style={styles.rescanButtonText}>สแกนใหม่</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </CameraView>

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
        backgroundColor: "#000",
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
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#666",
    },
    permissionTitle: {
        marginTop: 20,
        fontSize: 20,
        fontFamily: "Kanit_700Bold",
        color: "#333",
    },
    permissionText: {
        fontSize: 14,
        fontFamily: "Kanit_400Regular",
        color: "#888",
        textAlign: "center",
    },
    permissionButton: {
        marginTop: 24,
        paddingHorizontal: 32,
        paddingVertical: 14,
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 12,
    },
    permissionButtonText: {
        fontSize: 16,
        fontFamily: "Kanit_500Medium",
        color: "#fff",
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: "transparent",
    },
    cameraHeader: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingTop: Platform.OS === "ios" ? 50 : 40,
        paddingHorizontal: 20,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    titleContainer: {
        alignItems: "center",
        paddingTop: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: "Kanit_700Bold",
        color: "#fff",
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: "Kanit_400Regular",
        color: "#fff",
        marginTop: 4,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    scanAreaContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scanArea: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        position: "relative",
    },
    corner: {
        position: "absolute",
        width: 40,
        height: 40,
        borderColor: "#fff",
    },
    cornerTopLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 12,
    },
    cornerTopRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 12,
    },
    cornerBottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 12,
    },
    cornerBottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 12,
    },
    scanningOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
    },
    scanningText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: "Kanit_500Medium",
        color: "#fff",
    },
    bottomContainer: {
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === "ios" ? 50 : 30,
        alignItems: "center",
    },
    instructionBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    instructionText: {
        fontSize: 14,
        fontFamily: "Kanit_500Medium",
        color: PRIMARY_COLOR,
    },
    rescanButton: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 10,
        gap: 8,
    },
    rescanButtonText: {
        fontSize: 14,
        fontFamily: "Kanit_500Medium",
        color: "#fff",
    },
});

export default JointByQRcode;