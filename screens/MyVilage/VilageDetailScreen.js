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

export default function VilageDetailScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [projectData, setProjectData] = useState(null);
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

    // ดึงข้อมูลโครงการ
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

                // ดึงข้อมูล project info docs
                const response = await ProjectDocumentsService.getProjectInfoDocs(projectId);

                console.log("=== VilageDetailScreen Debug ===");
                console.log("Full response:", JSON.stringify(response.data, null, 2));

                if (response?.status === "success" && response.data) {
                    setProjectData(response.data);

                    // Prepare Viewer URL สำหรับ project_detail (ใช้ proxy URL จาก backend)
                    if (response.data.project_detail_view_url) {
                        try {
                            // ใช้ proxy URL ที่ backend สร้างให้แล้ว
                            const authUrl = await ProjectDocumentsService.getAuthenticatedProxyUrl(response.data.project_detail_view_url);

                            if (Platform.OS === 'android') {
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
                        message: response?.message || "ไม่พบข้อมูลโครงการ",
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

    // ดึง URL สำหรับ View (ใช้ proxy URL จาก backend)
    const getViewUrl = () => {
        return projectData?.project_detail_view_url || null;
    };

    // ดึง URL สำหรับ Download (ใช้ proxy URL จาก backend)
    const getDownloadUrl = () => {
        return projectData?.project_detail_download_url || null;
    };

    // กำหนดชื่อไฟล์
    const getTitle = () => {
        return "รายละเอียดโครงการ";
    };

    // เปิด PDF เต็มจอ
    const handleViewPdf = async () => {
        const viewPath = getViewUrl();

        if (!viewPath) {
            Alert.alert("ไม่พบไฟล์", "ยังไม่มีไฟล์รายละเอียดโครงการ");
            return;
        }

        try {
            // ใช้ proxy URL ที่ backend สร้างให้แล้ว
            const finalViewUrl = await ProjectDocumentsService.getAuthenticatedProxyUrl(viewPath);
            await WebBrowser.openBrowserAsync(finalViewUrl);
        } catch (err) {
            console.error("Error opening PDF view:", err);
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเปิดไฟล์ได้");
        }
    };

    // ดาวน์โหลด PDF
    const handleDownloadPdf = async () => {
        const downloadPath = getDownloadUrl();
        const fileName = `${getTitle()}.pdf`;

        if (!downloadPath) {
            Alert.alert("ไม่พบไฟล์", "ยังไม่มีไฟล์ PDF สำหรับดาวน์โหลด");
            return;
        }

        try {
            setDownloading(true);

            // ใช้ proxy URL ที่ backend สร้างให้แล้ว
            const finalUrl = await ProjectDocumentsService.getAuthenticatedProxyUrl(downloadPath);

            if (!finalUrl) {
                Alert.alert("ผิดพลาด", "ไม่สามารถสร้างลิงก์ดาวน์โหลดได้");
                return;
            }

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

    const fileUrl = getViewUrl();

    // สถานะ Loading
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
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
                    <Text style={styles.headerTitle}>รายละเอียดโครงการ</Text>
                    <View style={styles.headerButton} />
                </View>

                <View style={styles.centerContainer}>
                    <Ionicons name="business-outline" size={80} color="#ccc" />
                    <Text style={styles.errorText}>{error.message}</Text>
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

    // ไม่มีไฟล์
    if (!fileUrl) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.header, { backgroundColor: primaryColor }]}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>รายละเอียดโครงการ</Text>
                    <View style={styles.headerButton} />
                </View>

                <View style={styles.centerContainer}>
                    <Ionicons name="business-outline" size={80} color="#ccc" />
                    <Text style={styles.errorText}>ยังไม่มีไฟล์รายละเอียดโครงการ</Text>
                    <Text style={styles.errorSubtext}>
                        โครงการยังไม่ได้อัพโหลดเอกสาร
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

    // หน้าแสดงข้อมูลและ PDF Viewer
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: primaryColor }]}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {getTitle()}
                    </Text>
                </View>
                <View style={styles.headerButton} />
            </View>

            {/* Content */}
            <View style={styles.centerContainer}>
                {/* Info */}
                <View style={styles.infoContainer}>
                    <Text style={styles.titleText}>{getTitle()}</Text>
                    <Text style={styles.subtitleText}>
                        เอกสารรายละเอียดโครงการ
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

                {/* Android Warning */}
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
    centerContainer: {
        flex: 1,
        padding: 16,
    },
    infoContainer: {
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