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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { WebView } from 'react-native-webview';
import ProjectDocumentsService from "../../services/projectDocumentsService";
import ProjectCustomizationsService from "../../services/projectCustomizationsService";

export default function HousePlanScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [houseModelData, setHouseModelData] = useState(null);
    const [primaryColor, setPrimaryColor] = useState("#4BB59F");
    const [error, setError] = useState(null);
    const [userData, setUserData] = useState(null);
    const [viewerUrl, setViewerUrl] = useState(null);

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

                // ดึงข้อมูลแบบบ้านของ user ตาม unit ที่อยู่
                const response = await ProjectDocumentsService.getMyHouseModel(projectId);

                console.log("=== HousePlanScreen Debug ===");
                console.log("Full response:", JSON.stringify(response.data, null, 2));
                console.log("plan_file_url:", response.data?.house_model?.plan_file_url);

                if (response?.status === "success" && response.data?.house_model) {
                    setHouseModelData(response.data);

                    // Prepare Viewer URL immediately (ใช้ plan_view_url สำหรับแปลนบ้าน)
                    if (response.data.house_model.plan_view_url) {
                        try {
                            const rawUrl = response.data.house_model.plan_view_url;
                            const authUrl = await ProjectDocumentsService.getAuthenticatedProxyUrl(rawUrl);

                            if (Platform.OS === 'android') {
                                // Android WebView workaround using Google Docs Viewer
                                setViewerUrl(`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(authUrl)}`);
                            } else {
                                setViewerUrl(authUrl);
                            }
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

    // ดึง URL สำหรับ View (แปลนบ้าน)
    const getPlanViewUrl = () => {
        return houseModelData?.house_model?.plan_view_url || null;
    };

    // ดึง URL สำหรับ Download (แปลนบ้าน)
    const getPlanDownloadUrl = () => {
        return houseModelData?.house_model?.plan_download_url || null;
    };

    // กำหนดชื่อไฟล์
    const getPlanTitle = () => {
        if (!houseModelData?.house_model) return "แปลนบ้าน";
        return `${houseModelData.house_model.model_name} - แปลนบ้าน`;
    };

    // เปิด PDF (ดูแปลนบ้าน)
    const handleViewPdf = async () => {
        const viewPath = getPlanViewUrl();

        if (!viewPath) {
            Alert.alert("ไม่พบไฟล์", "ยังไม่มีไฟล์แปลนบ้านสำหรับดู");
            return;
        }

        try {
            const finalViewUrl = await ProjectDocumentsService.getAuthenticatedProxyUrl(viewPath);
            await WebBrowser.openBrowserAsync(finalViewUrl);
        } catch (err) {
            console.error("Error opening PDF view:", err);
            const finalViewUrl = await ProjectDocumentsService.getAuthenticatedProxyUrl(viewPath);
            if (finalViewUrl) await Linking.openURL(finalViewUrl);
        }
    };

    // ดาวน์โหลด PDF (แปลนบ้าน)
    const handleDownloadPdf = async () => {
        const downloadPath = getPlanDownloadUrl();
        const fileName = `${getPlanTitle()}.pdf`;

        if (!downloadPath) {
            Alert.alert("ไม่พบไฟล์", "ยังไม่มีไฟล์ PDF สำหรับดาวน์โหลด");
            return;
        }

        try {
            setDownloading(true);

            const finalUrl = await ProjectDocumentsService.getAuthenticatedProxyUrl(downloadPath);

            if (!finalUrl) {
                Alert.alert("ผิดพลาด", "ไม่สามารถสร้างลิงก์ดาวน์โหลดได้");
                return;
            }

            console.log("Downloading from:", finalUrl);

            const isAvailable = await Sharing.isAvailableAsync();

            if (Platform.OS === "web" || !isAvailable) {
                await Linking.openURL(finalUrl);
            } else {
                const fileUri = FileSystem.documentDirectory + fileName.replace(/\s/g, "_");
                const downloadResult = await FileSystem.downloadAsync(finalUrl, fileUri);

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

    const planViewUrl = getPlanViewUrl();

    // สถานะ Loading
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingText}>กำลังโหลดข้อมูลแปลนบ้าน...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // สถานะ Error
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.header, { backgroundColor: primaryColor }]}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>แปลนบ้าน</Text>
                    <View style={styles.headerButton} />
                </View>

                <View style={styles.centerContainer}>
                    <Ionicons name="map-outline" size={80} color="#ccc" />
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

    // ไม่มีไฟล์ (ตรวจสอบจาก plan view url)
    if (!planViewUrl) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.header, { backgroundColor: primaryColor }]}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {houseModelData?.house_model?.model_name || "แปลนบ้าน"}
                    </Text>
                    <View style={styles.headerButton} />
                </View>

                <View style={styles.centerContainer}>
                    <Ionicons name="map-outline" size={80} color="#ccc" />
                    <Text style={styles.errorText}>ยังไม่มีไฟล์แปลนบ้าน</Text>
                    <Text style={styles.errorSubtext}>
                        โครงการยังไม่ได้อัพโหลดเอกสารแปลนบ้าน
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

    // หน้าแสดงแปลนบ้านและปุ่มดู/ดาวน์โหลด
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: primaryColor }]}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {getPlanTitle()}
                    </Text>
                    {houseModelData?.unit_number && (
                        <Text style={styles.headerSubtitle}>
                            บ้านเลขที่ {houseModelData.unit_number}
                        </Text>
                    )}
                </View>
                <View style={styles.headerButton} />
            </View>

            {/* Content */}
            <View style={styles.centerContainer}>
                {/* Info */}
                <View style={styles.houseInfoContainer}>
                    <Text style={styles.titleText}>{getPlanTitle()}</Text>
                    <Text style={[styles.subtitleText, { marginBottom: 0 }]}>
                        {houseModelData?.unit_number && `บ้านเลขที่ ${houseModelData.unit_number} `}
                        {houseModelData?.zone && ` • ${houseModelData.zone} `}
                    </Text>
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
        justifyContent: "space-between",
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    headerButton: {
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "white",
        textAlign: "center",
        fontFamily: "Kanit_600SemiBold",
    },
    headerSubtitle: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.8)",
        textAlign: "center",
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
});
