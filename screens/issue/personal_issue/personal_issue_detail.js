import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StatusBar,
    Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import IssueService from "../../../services/issueService";
import ProjectCustomizationsService from "../../../services/projectCustomizationsService";

const { width } = Dimensions.get("window");

export default function PersonalIssueDetailScreen({ route, navigation }) {
    const { issueId } = route.params;
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [primaryColor, setPrimaryColor] = useState("#2A405E"); // Default
    const [secondaryColor, setSecondaryColor] = useState("#33FF57"); // Default

    useEffect(() => {
        fetchIssueDetails();
    }, [issueId]);

    const fetchIssueDetails = async () => {
        try {
            setLoading(true);
            const data = await IssueService.getPersonalRepairById(issueId);
            setIssue(data);

            // Fetch customizations if project_id exists
            if (data.project_id) {
                fetchCustomizations(data.project_id);
            }
        } catch (err) {
            console.error("Failed to fetch issue details:", err);
            setError("ไม่สามารถโหลดรายละเอียดการแจ้งซ่อมได้");
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomizations = async (projectId) => {
        try {
            const customizations = await ProjectCustomizationsService.getProjectCustomizations(projectId);
            if (customizations) {
                if (customizations.primary_color) setPrimaryColor(customizations.primary_color);
                if (customizations.secondary_color) setSecondaryColor(customizations.secondary_color);
            }
        } catch (err) {
            console.error("Error fetching customizations:", err);
        }
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return { color: '#FFA500', text: 'รอดำเนินการ', icon: 'time-outline' };
            case 'in_progress':
                return { color: '#007BFF', text: 'กำลังดำเนินการ', icon: 'construct-outline' };
            case 'completed':
                return { color: '#28A745', text: 'เสร็จสิ้น', icon: 'checkmark-circle-outline' };
            case 'rejected':
                return { color: '#DC3545', text: 'ถูกปฏิเสธ', icon: 'close-circle-outline' };
            default:
                return { color: '#6c757d', text: 'ไม่ทราบสถานะ', icon: 'help-circle-outline' };
        }
    };

    const RepairTypeName = {
        electrical: 'ระบบไฟฟ้า',
        plumbing: 'ระบบประปา',
        air_conditioning: 'ระบบปรับอากาศ',
        door_window: 'ระบบประตู-หน้าต่าง',
        wall_roof: 'ระบบผนัง-ฝ้าเพดาน',
        sanitary: 'ระบบสุขภัณฑ์',
        other: 'อื่นๆ',
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    if (error || !issue) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error || "ไม่พบข้อมูล"}</Text>
                <TouchableOpacity style={[styles.retryButton, { backgroundColor: primaryColor }]} onPress={fetchIssueDetails}>
                    <Text style={styles.retryButtonText}>ลองใหม่อีกครั้ง</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backButtonError} onPress={handleGoBack}>
                    <Text style={{ color: '#666' }}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statusInfo = getStatusInfo(issue.status);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#fff" barStyle="dark-content" />

            {/* Header */}
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="black" />
                    <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.headerSecond}>
                <Text style={styles.headerTitle}>รายละเอียดการแจ้งซ่อม</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: statusInfo.color + '15' }]}>
                    <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
                </View>

                {/* Main Info Card */}
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={[styles.iconContainer, { backgroundColor: primaryColor + '20' }]}>
                            <FontAwesome5 name="tools" size={20} color={primaryColor} />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.label}>ประเภทการซ่อม</Text>
                            <Text style={styles.value}>{RepairTypeName[issue.repair_category] || 'ไม่ระบุ'}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={[styles.iconContainer, { backgroundColor: primaryColor + '20' }]}>
                            <MaterialIcons name="place" size={24} color={primaryColor} />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.label}>บริเวณที่ซ่อม</Text>
                            <Text style={styles.value}>{issue.repair_area || '-'}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>รายละเอียดปัญหา</Text>
                        <Text style={styles.description}>{issue.description}</Text>
                    </View>
                </View>

                {/* Images */}
                {issue.image_urls && issue.image_urls.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>รูปภาพประกอบ</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                            {issue.image_urls.map((img, index) => (
                                <TouchableOpacity key={index} onPress={() => {/* Handle Image View */ }}>
                                    <Image
                                        source={{ uri: typeof img === 'string' ? img : img.url }}
                                        style={styles.repairImage}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Additional Info */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>ข้อมูลเพิ่มเติม</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>วันที่แจ้ง:</Text>
                        <Text style={styles.infoValue}>
                            {new Date(issue.submitted_date).toLocaleDateString('th-TH', {
                                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>ความสำคัญ:</Text>
                        <View style={[styles.priorityBadge, {
                            backgroundColor: issue.priority === 'high' ? '#FFEBEE' : issue.priority === 'medium' ? '#FFF3E0' : '#E8F5E9'
                        }]}>
                            <Text style={[styles.priorityText, {
                                color: issue.priority === 'high' ? '#D32F2F' : issue.priority === 'medium' ? '#F57C00' : '#388E3C'
                            }]}>
                                {issue.priority === 'high' ? 'สูง' : issue.priority === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
                            </Text>
                        </View>
                    </View>

                    {issue.assigned_to && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>ผู้รับผิดชอบ:</Text>
                            <Text style={styles.infoValue}>{issue.assigned_to}</Text>
                        </View>
                    )}

                    {/* {issue.estimated_cost && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>ราคาประเมิน:</Text>
                            <Text style={styles.costValue}>{parseFloat(issue.estimated_cost).toFixed(2)} บาท</Text>
                        </View>
                    )}

                    {issue.actual_cost && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>ค่าใช้จ่ายจริง:</Text>
                            <Text style={[styles.costValue, { color: primaryColor }]}>{parseFloat(issue.actual_cost).toFixed(2)} บาท</Text>
                        </View>
                    )} */}
                </View>

                {/* Notes from Staff */}
                {issue.notes && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>หมายเหตุจากเจ้าหน้าที่</Text>
                        <Text style={styles.notesText}>{issue.notes}</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F7FA",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        fontFamily: "Kanit_400Regular",
    },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontFamily: "Kanit_500Medium",
    },
    backButtonError: {
        marginTop: 20,
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
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#000",
        textAlign: "left",
        fontFamily: "Kanit_600SemiBold",
    },
    content: {
        flex: 1,
        padding: 16,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    statusText: {
        fontSize: 16,
        fontFamily: "Kanit_600SemiBold",
        marginLeft: 8,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoTextContainer: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#888',
        fontFamily: "Kanit_400Regular",
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        color: '#333',
        fontFamily: "Kanit_500Medium",
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 16,
    },
    section: {
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: "Kanit_600SemiBold",
        color: "#333",
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#555',
        lineHeight: 24,
        fontFamily: "Kanit_400Regular",
    },
    imageScroll: {
        marginTop: 8,
    },
    repairImage: {
        width: 120,
        height: 120,
        borderRadius: 12,
        marginRight: 12,
        backgroundColor: '#eee',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        fontFamily: "Kanit_400Regular",
    },
    infoValue: {
        fontSize: 14,
        color: '#333',
        fontFamily: "Kanit_500Medium",
    },
    priorityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priorityText: {
        fontSize: 12,
        fontFamily: "Kanit_500Medium",
    },
    costValue: {
        fontSize: 16,
        fontFamily: "Kanit_600SemiBold",
        color: '#333',
    },
    notesText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        fontFamily: "Kanit_400Regular",
    },
});