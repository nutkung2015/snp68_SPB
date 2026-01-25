import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Modal,
    StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { WebView } from 'react-native-webview';
// import { getApiBaseUrl } from '../../utils/config'; // ย้ายไปใช้ใน Service แทน
import ProjectDocumentsService from "../../services/projectDocumentsService";
import ProjectCustomizationsService from "../../services/projectCustomizationsService";

export default function HouseDetailScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [houseModelData, setHouseModelData] = useState(null);
    const [primaryColor, setPrimaryColor] = useState("#2A405E");
    const [error, setError] = useState(null);
    const [userData, setUserData] = useState(null);
    const [viewerUrl, setViewerUrl] = useState(null);
    const [showFullscreen, setShowFullscreen] = useState(false);

    // โหลดข้อมูล user จาก AsyncStorage
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const storedUserData = await AsyncStorage.getItem("userData");
                if (storedUserData) {
                    setUserData(JSON.parse(storedUserData));
                }
            } catch (err) {
                console.error("Failed to load user data:", err);
                setError({ message: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้" });
                setLoading(false);
            }
        };
        loadUserData();
    }, []);

    // ดึงข้อมูลแบบบ้านของ user
    useEffect(() => {
        const fetchData = async () => {
            if (!userData?.projectMemberships?.[0]?.project_id) {
                setLoading(false);
                setError({ message: "ไม่พบข้อมูลโครงการ" });
                return;
            }

            const projectId = userData.projectMemberships[0].project_id;

            try {
                setLoading(true);

                // ดึง customizations สำหรับ theme
                try {
                    const customizations = await ProjectCustomizationsService.getProjectCustomizations(projectId);
                    if (customizations?.primary_color) {
                        setPrimaryColor(customizations.primary_color);
                    }
                } catch (e) {
                    console.log("Could not load project customizations");
                }

                // ดึงข้อมูลแบบบ้านของ user - ใช้ V2 API ที่ส่ง raw Cloudinary URLs
                const response = await ProjectDocumentsService.getMyHouseModelV2(projectId);

                console.log("=== HouseDetailScreen Debug (V2) ===");
                console.log("Full response:", JSON.stringify(response.data, null, 2));
                console.log("detail_file_url:", response.data?.house_model?.detail_file_url);

                if (response?.status === "success" && response.data?.house_model) {
                    setHouseModelData(response.data);

                    // Prepare Viewer URL immediately - ใช้ Google Drive Viewer
                    if (response.data.house_model.detail_file_url) {
                        try {
                            const firebaseUrl = response.data.house_model.detail_file_url;

                            // ใช้ Google Drive Viewer (ทำงานได้ดีกว่า PDF.js บน Android WebView)
                            const googleDriveViewerUrl = `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(firebaseUrl)}`;
                            setViewerUrl(googleDriveViewerUrl);
                        } catch (e) {
                            console.error("Failed to set viewer url", e);
                        }
                    }
                } else {
                    setError({
                        message: response?.message || "ไม่พบข้อมูลแบบบ้าน",
                        data: response?.data
                    });
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                setError({
                    message: err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล"
                });
            } finally {
                setLoading(false);
            }
        };

        if (userData) {
            fetchData();
        }
    }, [userData]);

    // ดึง raw Cloudinary URL สำหรับรายละเอียดบ้าน (จาก V2 API)
    const getDetailFileUrl = () => {
        return houseModelData?.house_model?.detail_file_url || null;
    };

    // กำหนด projectId
    const getProjectId = () => {
        return userData?.projectMemberships?.[0]?.project_id || null;
    };

    // กำหนดชื่อไฟล์
    const getDetailTitle = () => {
        if (!houseModelData?.house_model) return "รายละเอียดบ้าน";
        return `${houseModelData.house_model.model_name} - รายละเอียด`;
    };

    // เปิด PDF (ดูรายละเอียดบ้าน) - เปิด Modal Fullscreen
    const handleViewPdf = () => {
        const detailFileUrl = getDetailFileUrl();

        if (!detailFileUrl) {
            Alert.alert("ไม่พบไฟล์", "ยังไม่มีไฟล์รายละเอียดบ้านสำหรับดู");
            return;
        }

        // เปิด Modal Fullscreen แทนการเปิด browser ภายนอก
        setShowFullscreen(true);
    };

    // ดาวน์โหลด PDF (รายละเอียดบ้าน) - ใช้ Firebase URL ตรงๆ
    const handleDownloadPdf = async () => {
        const detailFileUrl = getDetailFileUrl();
        const fileName = `${getDetailTitle()}.pdf`;

        if (!detailFileUrl) {
            Alert.alert("ไม่พบไฟล์", "ยังไม่มีไฟล์ PDF สำหรับดาวน์โหลด");
            return;
        }

        try {
            setDownloading(true);

            console.log("Downloading from Firebase:", detailFileUrl);

            const isAvailable = await Sharing.isAvailableAsync();

            if (Platform.OS === "web" || !isAvailable) {
                await Linking.openURL(detailFileUrl);
            } else {
                const fileUri = FileSystem.documentDirectory + fileName.replace(/\s/g, "_");
                const downloadResult = await FileSystem.downloadAsync(detailFileUrl, fileUri);

                if (downloadResult.status === 200) {
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: "application/pdf",
                        dialogTitle: `บันทึกหรือแชร์ ${fileName}`,
                        UTI: 'com.adobe.pdf'
                    });
                } else {
                    Alert.alert("ดาวน์โหลดไม่สำเร็จ", "ไม่สามารถดาวน์โหลดไฟล์ได้");
                }
            }
        } catch (err) {
            console.error("Error downloading PDF:", err);
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถดาวน์โหลดไฟล์ได้: " + (err.message || ""));
        } finally {
            setDownloading(false);
        }
    };

    // ย้อนกลับ
    const handleGoBack = () => {
        navigation.goBack();
    };

    const detailFileUrl = getDetailFileUrl();

    // สถานะ Loading
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingText}>กำลังโหลดข้อมูลรายละเอียดบ้าน...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // สถานะ Error
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="black" />
                        <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.headerSecond}>
                    <Text style={styles.headerTitle}>รายละเอียดบ้าน</Text>
                </View>

                <View style={styles.centerContainer}>
                    <Ionicons name="document-text-outline" size={80} color="#ccc" />
                    <Text style={styles.errorText}>{error.message}</Text>
                    {error.data?.unit_number && (
                        <Text style={styles.errorSubtext}>
                            บ้านเลขที่: {error.data.unit_number}
                        </Text>
                    )}
                    {error.data?.building && (
                        <Text style={styles.errorSubtext}>
                            แบบบ้าน: {error.data.building}
                        </Text>
                    )}
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: primaryColor }]}
                        onPress={handleGoBack}
                    >
                        <Text style={styles.buttonText}>กลับ</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ไม่มีไฟล์ (ตรวจสอบจาก detail file url)
    if (!detailFileUrl) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="black" />
                        <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.headerSecond}>
                    <Text style={styles.headerTitle}>
                        {houseModelData?.house_model?.model_name || "รายละเอียดบ้าน"}
                    </Text>
                </View>

                <View style={styles.centerContainer}>
                    <Ionicons name="document-text-outline" size={80} color="#ccc" />
                    <Text style={styles.errorText}>ยังไม่มีไฟล์รายละเอียดบ้าน</Text>
                    <Text style={styles.errorSubtext}>
                        โครงการยังไม่ได้อัพโหลดเอกสารรายละเอียดบ้าน
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: primaryColor }]}
                        onPress={handleGoBack}
                    >
                        <Text style={styles.buttonText}>กลับ</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // หน้าแสดงรายละเอียดบ้านและปุ่มดู/ดาวน์โหลด
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="black" />
                    <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.headerSecond}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {getDetailTitle()}
                    </Text>
                    {houseModelData?.unit_number && (
                        <Text style={styles.headerSubtitle}>
                            บ้านเลขที่ {houseModelData.unit_number}
                        </Text>
                    )}
                </View>
            </View>

            {/* Content */}
            <View style={styles.centerContainer}>
                {/* Info */}
                <View style={styles.houseInfoContainer}>
                    {/* <Text style={styles.titleText}>{getDetailTitle()}</Text>
                        <Text style={[styles.subtitleText, { marginBottom: 0 }]}>
                            {houseModelData?.unit_number && `บ้านเลขที่ ${houseModelData.unit_number} `}
                            {houseModelData?.zone && ` • ${houseModelData.zone} `}
                        </Text> */}
                </View>

                {/* Embedded PDF Viewer */}
                <View style={styles.viewerContainer}>
                    {viewerUrl ? (
                        Platform.OS === 'web' ? (
                            <iframe
                                src={viewerUrl}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="PDF Viewer"
                            />
                        ) : (
                            <WebView
                                source={{ uri: viewerUrl }}
                                style={{ flex: 1 }}
                                originWhitelist={['*']}
                                useWebKit={true}
                                startInLoadingState={true}
                                renderLoading={() => (
                                    <View style={styles.loadingOverlay}>
                                        <ActivityIndicator size="large" color={primaryColor} />
                                    </View>
                                )}
                            />
                        )
                    ) : (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="small" color={primaryColor} />
                            <Text style={{ marginTop: 10, color: '#666', fontFamily: 'Kanit_400Regular' }}>
                                กำลังโหลดเอกสาร...
                            </Text>
                        </View>
                    )}
                </View>

                {/* Android Warning (Only in Dev) */}
                {Platform.OS === 'android' && viewerUrl?.includes('docs.google.com') && (
                    <Text style={styles.warningText}>
                        * หากเอกสารไม่แสดง (จอขาว) แสดงว่า Google เข้าถึงไฟล์ Local ไม่ได้
                    </Text>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, { borderColor: primaryColor, backgroundColor: 'white', borderWidth: 1 }]}
                        onPress={handleDownloadPdf}
                        disabled={downloading}
                    >
                        {downloading ? (
                            <ActivityIndicator size="small" color={primaryColor} />
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={20} color={primaryColor} />
                                <Text style={[styles.actionButtonText, { color: primaryColor }]}>
                                    ดาวน์โหลด
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: primaryColor }]}
                        onPress={() => handleViewPdf()}
                    >
                        <Ionicons name="eye-outline" size={20} color="white" />
                        <Text style={[styles.actionButtonText, { color: 'white' }]}>
                            เต็มจอ
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Fullscreen PDF Modal */}
            <Modal
                visible={showFullscreen}
                animationType="slide"
                onRequestClose={() => setShowFullscreen(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
                    {/* Modal Header */}
                    <View style={[styles.modalHeader, { backgroundColor: primaryColor }]}>
                        <TouchableOpacity
                            onPress={() => setShowFullscreen(false)}
                            style={styles.modalCloseButton}
                        >
                            <Ionicons name="close" size={28} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle} numberOfLines={1}>
                            {getDetailTitle()}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* PDF Viewer */}
                    {viewerUrl ? (
                        <WebView
                            source={{ uri: viewerUrl }}
                            style={{ flex: 1 }}
                            originWhitelist={['*']}
                            useWebKit={true}
                            startInLoadingState={true}
                            renderLoading={() => (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="large" color={primaryColor} />
                                    <Text style={{ marginTop: 10, color: '#666', fontFamily: 'Kanit_400Regular' }}>
                                        กำลังโหลดเอกสาร...
                                    </Text>
                                </View>
                            )}
                        />
                    ) : (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={primaryColor} />
                        </View>
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
        fontFamily: "Kanit_400Regular",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#fff",
    },
    headerSecond: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
    },
    backButtonText: {
        fontSize: 16,
        color: "black",
        marginLeft: 4,
        fontFamily: "Kanit_400Regular",
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#000",
        textAlign: "left",
        fontFamily: "Kanit_600SemiBold",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#666",
        textAlign: "left",
        fontFamily: "Kanit_400Regular",
    },
    centerContainer: {
        flex: 1,
        padding: 16,
    },
    houseInfoContainer: {
        alignItems: 'center',
        marginBottom: 16
    },
    viewerContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee',
        minHeight: 300
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    warningText: {
        color: 'orange',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: "Kanit_400Regular",
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    actionButtonText: {
        fontFamily: "Kanit_600SemiBold",
        fontSize: 14,
        marginLeft: 8,
        fontWeight: 'bold'
    },
    iconWrapper: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    titleText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center",
        fontFamily: "Kanit_600SemiBold",
        marginBottom: 4,
    },
    subtitleText: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        fontFamily: "Kanit_400Regular",
        marginBottom: 32,
    },
    errorText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginTop: 16,
        textAlign: "center",
        fontFamily: "Kanit_600SemiBold",
    },
    errorSubtext: {
        fontSize: 14,
        color: "#666",
        marginTop: 8,
        textAlign: "center",
        fontFamily: "Kanit_400Regular",
    },
    button: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "white",
        fontFamily: "Kanit_600SemiBold",
    },
    primaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: "100%",
        marginBottom: 16,
        gap: 12,
    },
    primaryButtonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "white",
        fontFamily: "Kanit_600SemiBold",
    },
    secondaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: "100%",
        borderWidth: 2,
        gap: 12,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: "bold",
        fontFamily: "Kanit_600SemiBold",
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 12,
    },
    modalCloseButton: {
        padding: 5,
        width: 40,
    },
    modalTitle: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        fontFamily: 'Kanit_600SemiBold',
    },
});