import React, { useState, useEffect, useRef } from "react";
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
    Modal,
    Dimensions,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import ViewShot from "react-native-view-shot";
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
    const [primaryColor, setPrimaryColor] = useState("#2A405E");

    // QR Modal States
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [invitationCode, setInvitationCode] = useState("");
    const [qrLoading, setQrLoading] = useState(false);
    const qrRef = useRef(null);
    const viewShotRef = useRef(null);

    // Resident Detail Modal States
    const [selectedResident, setSelectedResident] = useState(null);
    const [residentModalVisible, setResidentModalVisible] = useState(false);
    const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [removeLoading, setRemoveLoading] = useState(false);

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

                    // Get unit_id and role from unitMemberships
                    if (userData?.unitMemberships?.[0]?.unit_id) {
                        const currentUnitId = userData.unitMemberships[0].unit_id;
                        const userRole = userData.unitMemberships[0].role;
                        setUnitId(currentUnitId);
                        setCurrentUserRole(userRole);
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

    // Handle QR Code generation - Show Modal
    const handleCreateQRCode = async () => {
        if (!unitId) {
            Alert.alert("ผิดพลาด", "ไม่พบข้อมูลบ้าน");
            return;
        }

        try {
            setQrLoading(true);
            const response = await ResidentService.generateInvitationQR(unitId);
            if (response && response.invitation_code) {
                setInvitationCode(response.invitation_code);
                setQrModalVisible(true);
            } else {
                Alert.alert("ผิดพลาด", "ไม่สามารถสร้าง QR Code ได้");
            }
        } catch (err) {
            console.error("Error generating QR:", err);
            Alert.alert("ผิดพลาด", "ไม่สามารถสร้าง QR Code ได้");
        } finally {
            setQrLoading(false);
        }
    };

    // Copy invitation code to clipboard
    const handleCopyCode = async () => {
        try {
            await Clipboard.setStringAsync(invitationCode);
            Alert.alert("สำเร็จ", "คัดลอกรหัสเรียบร้อยแล้ว");
        } catch (err) {
            console.error("Error copying:", err);
            Alert.alert("ผิดพลาด", "ไม่สามารถคัดลอกรหัสได้");
        }
    };

    // Download QR Code
    const handleDownloadQR = async () => {
        try {
            // Request media library permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("ผิดพลาด", "กรุณาอนุญาตการเข้าถึงแกลเลอรี่");
                return;
            }

            // Capture QR Code using ViewShot
            if (viewShotRef.current) {
                const uri = await viewShotRef.current.capture();
                await MediaLibrary.saveToLibraryAsync(uri);
                Alert.alert("สำเร็จ", "บันทึก QR Code ลงแกลเลอรี่เรียบร้อยแล้ว");
            }
        } catch (err) {
            console.error("Error downloading QR:", err);
            Alert.alert("ผิดพลาด", "ไม่สามารถบันทึก QR Code ได้");
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

    // Handle view resident profile - Show Modal
    const handleViewResident = (resident) => {
        setSelectedResident(resident);
        setResidentModalVisible(true);
    };

    // Handle close resident modal
    const handleCloseResidentModal = () => {
        setResidentModalVisible(false);
        setSelectedResident(null);
    };

    // Handle show remove confirmation
    const handleShowRemoveConfirmation = () => {
        setConfirmRemoveVisible(true);
    };

    // Handle cancel remove
    const handleCancelRemove = () => {
        setConfirmRemoveVisible(false);
    };

    // Handle confirm remove resident
    const handleConfirmRemove = async () => {
        if (!selectedResident) return;

        try {
            setRemoveLoading(true);
            await ResidentService.removeResident(unitId, selectedResident.user_id || selectedResident.id);

            // Close modals
            setConfirmRemoveVisible(false);
            setResidentModalVisible(false);
            setSelectedResident(null);

            // Refresh list
            await fetchResidents(unitId);
            Alert.alert("สำเร็จ", "เชิญผู้อยู่อาศัยออกเรียบร้อยแล้ว");
        } catch (err) {
            console.error("Error removing resident:", err);
            Alert.alert("ผิดพลาด", "ไม่สามารถเชิญผู้อยู่อาศัยออกได้");
        } finally {
            setRemoveLoading(false);
        }
    };

    // Handle edit resident (placeholder)
    const handleEditResident = () => {
        // TODO: Implement edit functionality
        Alert.alert("แจ้งเตือน", "ฟีเจอร์นี้กำลังพัฒนา");
    };

    // Check if current user can remove residents (only owner can remove)
    const canRemoveResident = () => {
        return currentUserRole === "owner";
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

                {/* View Profile Button */}
                <TouchableOpacity
                    style={[styles.viewProfileButton, { backgroundColor: primaryColor }]}
                    onPress={() => handleViewResident(resident)}
                >
                    {/* <Ionicons name="person" size={18} color="#fff" />
                     */}
                    <Text style={styles.viewProfileButtonText}>ดู</Text>
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

            {/* QR Code Modal */}
            <Modal
                visible={qrModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setQrModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                                <Text style={styles.modalCancelText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>เพิ่มผู้อยู่อาศัย</Text>
                            <View style={{ width: 50 }} />
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScrollContent}
                        >
                            {/* QR Code Section */}
                            <Text style={[styles.qrSectionTitle, { color: primaryColor }]}>
                                QR CODE คำเชิญเข้าโครงการ
                            </Text>
                            <Text style={styles.qrSubtext}>สแกน QR CODE จากแอปพลิเคชัน</Text>
                            <Text style={styles.qrSubtext}>เพื่อเข้าโครงการ</Text>

                            {/* QR Code with Download Button */}
                            <View style={styles.qrCodeRow}>
                                <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
                                    <View style={styles.qrCodeContainer}>
                                        <QRCode
                                            value={invitationCode || "PLACEHOLDER"}
                                            size={180}
                                            backgroundColor="white"
                                            color="black"
                                        />
                                    </View>
                                </ViewShot>

                            </View>
                            <View style={styles.btnDownloadRow}>
                                <TouchableOpacity
                                    style={styles.downloadButton}
                                    onPress={handleDownloadQR}
                                >
                                    <Ionicons name="download-outline" size={32} color={primaryColor} />
                                </TouchableOpacity>
                            </View>

                            {/* Divider */}
                            <View style={styles.modalDivider} />

                            {/* Invitation Code Section */}
                            <Text style={[styles.qrSectionTitle, { color: primaryColor }]}>
                                รหัสคำเชิญเข้าโครงการ
                            </Text>
                            <Text style={styles.qrSubtext}>กรอกรหัสคำเชิญในแอปพลิเคชัน</Text>
                            <Text style={styles.qrSubtext}>เพื่อเข้าโครงการ</Text>

                            {/* Code Box with Copy Button */}
                            <View style={styles.codeBoxContainer}>
                                <View style={[styles.codeBox, { borderColor: primaryColor }]}>
                                    <Text style={[styles.codeText, { color: primaryColor }]}>
                                        {invitationCode}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.copyButton, { backgroundColor: primaryColor }]}
                                    onPress={handleCopyCode}
                                >
                                    <Ionicons name="copy-outline" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Resident Detail Modal */}
            <Modal
                visible={residentModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCloseResidentModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.residentModalContainer}>
                        {/* Modal Header */}
                        <View style={styles.residentModalHeader}>
                            <TouchableOpacity onPress={handleCloseResidentModal}>
                                <Text style={styles.cancelText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <Text style={[styles.residentModalTitle, { color: primaryColor }]}>
                                รายละเอียดผู้อาศัย
                            </Text>
                            <View style={{ width: 50 }} />
                        </View>

                        {/* Resident Info Card */}
                        {selectedResident && (
                            <View style={styles.residentInfoCard}>
                                {/* Name Row */}
                                <View style={styles.infoRow}>
                                    <View style={styles.infoColumn}>
                                        <Text style={styles.infoLabel}>ชื่อ:</Text>
                                        <Text style={styles.infoValue}>
                                            {selectedResident.full_name}
                                        </Text>
                                    </View>
                                    <View style={[styles.infoColumn, styles.infoDivider]}>
                                        <Text style={styles.infoLabel}>เบอร์โทรศัพท์:</Text>
                                        <Text style={styles.infoValue}>
                                            {selectedResident.phone || "-"}
                                        </Text>
                                    </View>
                                </View>

                                {/* Email Row */}
                                <View style={styles.emailRow}>
                                    <Text style={styles.infoLabel}>อีเมล:</Text>
                                    <Text style={styles.infoValue}>
                                        {selectedResident.email || "-"}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Spacer */}
                        <View style={{ flex: 1 }} />

                        {/* Bottom Buttons - Only show for owner */}
                        {canRemoveResident() && (
                            <View style={styles.residentModalButtons}>
                                <TouchableOpacity
                                    style={[styles.removeResidentButton, { borderColor: primaryColor }]}
                                    onPress={handleShowRemoveConfirmation}
                                >
                                    <Text style={[styles.removeResidentButtonText, { color: primaryColor }]}>
                                        เชิญออก
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Confirmation Dialog for Remove */}
            <Modal
                visible={confirmRemoveVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={handleCancelRemove}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmDialog}>
                        {/* Warning Icon */}
                        <View style={styles.confirmIconContainer}>
                            <Ionicons name="warning" size={50} color="#FF6B6B" />
                        </View>

                        {/* Title */}
                        <Text style={styles.confirmTitle}>ยืนยันการเชิญออก</Text>

                        {/* Message */}
                        <Text style={styles.confirmMessage}>
                            คุณต้องการเชิญ{'\n'}
                            <Text style={styles.confirmHighlight}>
                                {selectedResident?.full_name}
                            </Text>
                            {'\n'}ออกจากบ้านหรือไม่?
                        </Text>

                        {/* Buttons */}
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={styles.confirmCancelButton}
                                onPress={handleCancelRemove}
                            >
                                <Text style={styles.confirmCancelText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmRemoveButton}
                                onPress={handleConfirmRemove}
                                disabled={removeLoading}
                            >
                                {removeLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.confirmRemoveText}>เชิญออก</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Loading Overlay */}
            {qrLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingOverlayText}>กำลังสร้าง QR Code...</Text>
                </View>
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
    viewProfileButtonText: {
        fontSize: 12,
        fontFamily: "Kanit_500Medium",
        color: "#fff",
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
    viewProfileButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
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
    // QR Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "90%",
        paddingBottom: Platform.OS === "ios" ? 34 : 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    modalCancelText: {
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#666",
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: "Kanit_700Bold",
        color: "#333",
    },
    modalScrollContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 20,
        alignItems: "center",
    },
    qrSectionTitle: {
        fontSize: 18,
        fontFamily: "Kanit_700Bold",
        textAlign: "center",
        marginBottom: 8,
    },
    qrSubtext: {
        fontSize: 14,
        fontFamily: "Kanit_400Regular",
        color: "#888",
        textAlign: "center",
    },
    qrCodeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 24,
        marginBottom: 24,
    },
    btnDownloadRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 24,
        marginBottom: 24,
    },
    qrCodeContainer: {
        padding: 16,
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    downloadButton: {
        marginLeft: 16,
        width: 50,
        height: 50,
        justifyContent: "center",
        alignItems: "center",
    },
    modalDivider: {
        width: "100%",
        height: 1,
        backgroundColor: "#e0e0e0",
        marginVertical: 24,
    },
    codeBoxContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 20,
        width: "100%",
    },
    codeBox: {
        flex: 1,
        borderWidth: 2,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: "#fff",
    },
    codeText: {
        fontSize: 24,
        fontFamily: "Kanit_700Bold",
        textAlign: "center",
        letterSpacing: 4,
    },
    copyButton: {
        marginLeft: 12,
        width: 52,
        height: 52,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
    },
    loadingOverlayText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#666",
    },
    // Resident Detail Modal Styles
    residentModalContainer: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        height: "70%",
    },
    residentModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    cancelText: {
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#888",
    },
    residentModalTitle: {
        fontSize: 18,
        fontFamily: "Kanit_700Bold",
        textAlign: "center",
    },
    residentInfoCard: {
        backgroundColor: "#F8F9FA",
        borderRadius: 16,
        padding: 20,
    },
    infoRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5E5",
        paddingBottom: 16,
    },
    infoColumn: {
        flex: 1,
    },
    infoDivider: {
        borderLeftWidth: 1,
        borderLeftColor: "#E5E5E5",
        paddingLeft: 16,
    },
    infoLabel: {
        fontSize: 12,
        fontFamily: "Kanit_400Regular",
        color: "#888",
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontFamily: "Kanit_500Medium",
        color: "#333",
    },
    emailRow: {
        paddingTop: 16,
    },
    residentModalButtons: {
        flexDirection: "row",
        gap: 12,
        paddingTop: 20,
    },
    removeResidentButton: {
        flex: 1,
        height: 54,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#E5E5E5",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    removeResidentButtonText: {
        fontSize: 18,
        fontFamily: "Kanit_500Medium",
    },
    editButton: {
        flex: 1,
        height: 54,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    editButtonText: {
        fontSize: 18,
        fontFamily: "Kanit_500Medium",
        color: "#fff",
    },
    // Confirmation Dialog Styles
    confirmOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    confirmDialog: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: "center",
    },
    confirmIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#FFF0F0",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    confirmTitle: {
        fontSize: 20,
        fontFamily: "Kanit_700Bold",
        color: "#333",
        marginBottom: 12,
    },
    confirmMessage: {
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#666",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 24,
    },
    confirmHighlight: {
        fontFamily: "Kanit_500Medium",
        color: "#333",
    },
    confirmButtons: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    confirmCancelButton: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#E5E5E5",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    confirmCancelText: {
        fontSize: 16,
        fontFamily: "Kanit_500Medium",
        color: "#666",
    },
    confirmRemoveButton: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        backgroundColor: "#FF6B6B",
        justifyContent: "center",
        alignItems: "center",
    },
    confirmRemoveText: {
        fontSize: 16,
        fontFamily: "Kanit_500Medium",
        color: "#fff",
    },
});

export default ResidentManageScreen;
