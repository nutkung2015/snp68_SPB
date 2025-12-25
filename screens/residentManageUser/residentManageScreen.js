import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    useFonts,
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
} from "@expo-google-fonts/kanit";
import ResidentService from "../../services/residentService";
import ProjectCustomizationsService from "../../services/projectCustomizationsService";

const ResidentManageScreen = ({ navigation }) => {
    const [fontsLoaded] = useFonts({
        Kanit_400Regular,
        Kanit_500Medium,
        Kanit_700Bold,
    });

    const [residents, setResidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unitId, setUnitId] = useState(null);
    const [primaryColor, setPrimaryColor] = useState("#1F7EFF");

    // Fetch project customizations
    const fetchProjectCustomizations = async (projectId) => {
        try {
            const response = await ProjectCustomizationsService.getProjectCustomizations(projectId);
            if (response && response.primary_color) {
                setPrimaryColor(response.primary_color);
            }
        } catch (err) {
            console.error("Error fetching project customizations:", err);
        }
    };

    // Fetch residents from unit
    const fetchResidents = async (unitIdParam) => {
        try {
            setLoading(true);
            setError(null);
            const response = await ResidentService.getUnitResidents(unitIdParam);

            if (response && response.status === "success") {
                setResidents(response.data || []);
            } else if (response && Array.isArray(response)) {
                setResidents(response);
            } else {
                setResidents([]);
            }
        } catch (err) {
            console.error("Error fetching residents:", err);
            setError("ไม่สามารถโหลดข้อมูลผู้อยู่อาศัยได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const storedUserData = await AsyncStorage.getItem("userData");
                if (storedUserData) {
                    const userData = JSON.parse(storedUserData);

                    // Get unit_id from unitMemberships
                    if (userData?.unitMemberships?.[0]?.unit_id) {
                        const currentUnitId = userData.unitMemberships[0].unit_id;
                        setUnitId(currentUnitId);
                        await fetchResidents(currentUnitId);
                    }

                    // Get project customizations
                    if (userData?.projectMemberships?.[0]?.project_id) {
                        await fetchProjectCustomizations(userData.projectMemberships[0].project_id);
                    }
                }
            } catch (err) {
                console.error("Error loading user data:", err);
                setError("ไม่สามารถโหลดข้อมูลได้");
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Handle remove resident
    const handleRemoveResident = (resident) => {
        Alert.alert(
            "ยืนยันการลบ",
            `คุณต้องการลบ ${resident.full_name} ออกจากบ้านหรือไม่?`,
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ลบ",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await ResidentService.removeResident(unitId, resident.user_id || resident.id);
                            // Refresh list
                            await fetchResidents(unitId);
                            Alert.alert("สำเร็จ", "ลบผู้อยู่อาศัยเรียบร้อยแล้ว");
                        } catch (err) {
                            Alert.alert("ผิดพลาด", "ไม่สามารถลบผู้อยู่อาศัยได้");
                        }
                    },
                },
            ]
        );
    };

    // Handle QR Code generation
    const handleCreateQRCode = async () => {
        if (!unitId) {
            Alert.alert("ผิดพลาด", "ไม่พบข้อมูลบ้าน");
            return;
        }

        try {
            const response = await ResidentService.generateInvitationQR(unitId);
            if (response && response.invitation_code) {
                // Navigate to QR Code screen or show QR
                navigation.navigate("InvitationQR", {
                    invitationCode: response.invitation_code,
                    unitId: unitId
                });
            } else {
                Alert.alert("สำเร็จ", "สร้าง QR Code เรียบร้อยแล้ว");
            }
        } catch (err) {
            Alert.alert("ผิดพลาด", "ไม่สามารถสร้าง QR Code ได้");
        }
    };

    // Handle navigate to vehicles
    const handleViewVehicles = () => {
        if (!unitId) {
            Alert.alert("ผิดพลาด", "ไม่พบข้อมูลบ้าน");
            return;
        }
        navigation.navigate("UnitVehicles", { unitId: unitId });
    };

    // Get initials from name
    const getInitials = (name) => {
        if (!name) return "??";
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Render resident item
    const renderResidentItem = (resident, index) => {
        return (
            <View
                key={resident.id || resident.user_id || index}
                style={[
                    styles.residentItem,
                    index === 0 && styles.residentItemFirst,
                    index === residents.length - 1 && styles.residentItemLast,
                ]}
            >
                <View style={styles.residentInfo}>
                    {/* Avatar */}
                    {resident.profile_picture ? (
                        <Image
                            source={{ uri: resident.profile_picture }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
                            <Text style={styles.avatarText}>{getInitials(resident.full_name)}</Text>
                        </View>
                    )}

                    {/* Name */}
                    <Text style={styles.residentName}>{resident.full_name}</Text>
                </View>

                {/* Remove Button */}
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveResident(resident)}
                >
                    <Ionicons name="person-remove" size={20} color="#FF6B6B" />
                </TouchableOpacity>
            </View>
        );
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

            {/* Title */}
            <Text style={styles.pageTitle}>ผู้อยู่อาศัย</Text>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: primaryColor }]}
                    onPress={handleCreateQRCode}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionButtonText}>สร้าง QR Code</Text>
                        <Text style={styles.actionButtonSubtext}>เชิญเข้าบ้าน</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: primaryColor }]}
                    onPress={handleViewVehicles}
                >
                    <Ionicons name="car" size={24} color="#fff" />
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionButtonText}>รถที่ผูกกับบ้าน</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Residents Section */}
            <Text style={styles.sectionTitle}>ผู้อยู่อาศัย</Text>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: primaryColor }]}
                        onPress={() => unitId && fetchResidents(unitId)}
                    >
                        <Text style={styles.retryText}>ลองใหม่</Text>
                    </TouchableOpacity>
                </View>
            ) : residents.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>ไม่มีผู้อยู่อาศัยในบ้าน</Text>
                    <Text style={styles.emptySubtext}>กดปุ่ม "สร้าง QR Code" เพื่อเชิญสมาชิก</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.residentList}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.residentCard}>
                        {residents.map((resident, index) => renderResidentItem(resident, index))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: Platform.OS === "ios" ? 10 : 16,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: "#F5F5F5",
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
    pageTitle: {
        fontSize: 28,
        fontFamily: "Kanit_700Bold",
        color: "#000",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    actionContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 24,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 10,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionButtonText: {
        fontSize: 14,
        fontFamily: "Kanit_500Medium",
        color: "#fff",
    },
    actionButtonSubtext: {
        fontSize: 12,
        fontFamily: "Kanit_400Regular",
        color: "rgba(255, 255, 255, 0.8)",
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: "Kanit_500Medium",
        color: "#666",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    residentList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    residentCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    residentItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    residentItemFirst: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    residentItemLast: {
        borderBottomWidth: 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    residentInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontFamily: "Kanit_700Bold",
        color: "#fff",
    },
    residentName: {
        fontSize: 16,
        fontFamily: "Kanit_500Medium",
        color: "#333",
        flex: 1,
    },
    removeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#FFF0F0",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#666",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#FF6B6B",
        marginBottom: 16,
        textAlign: "center",
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        fontSize: 16,
        fontFamily: "Kanit_500Medium",
        color: "#fff",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: "Kanit_500Medium",
        color: "#999",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        fontFamily: "Kanit_400Regular",
        color: "#bbb",
        marginTop: 8,
        textAlign: "center",
    },
});

export default ResidentManageScreen;
