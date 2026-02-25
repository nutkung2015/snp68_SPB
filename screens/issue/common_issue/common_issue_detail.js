import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StatusBar,
    Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import IssueService from "../../../services/issueService";

const ISSUE_TYPES = [
    { id: "1", name: "ทรัพย์สินและสาธารณูปโภค", value: "AssetsFacilities" },
    { id: "2", name: "การอยู่อาศัยและระเบียบข้อบังคับ", value: "LivingRegulations" },
];

const { width } = Dimensions.get("window");

export default function CommonIssueDetailScreen({ route, navigation }) {
    const { issueId } = route.params;
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchIssueDetails();
    }, [issueId]);

    const fetchIssueDetails = async () => {
        try {
            setLoading(true);
            const fetchedIssue = await IssueService.getCommonIssueById(issueId);

            console.log("Fetched issue detail response:", JSON.stringify(fetchedIssue, null, 2));

            // Check if response has data property or is the data itself
            const issueData = fetchedIssue.data || fetchedIssue;

            console.log("Issue data to display:", JSON.stringify(issueData, null, 2));
            setIssue(issueData);
        } catch (err) {
            console.error("Failed to fetch issue details:", err);
            setError("ไม่สามารถโหลดข้อมูลรายละเอียดได้");
        } finally {
            setLoading(false);
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
            case 'resolved':
                return { color: '#28A745', text: 'แก้ไขแล้ว', icon: 'checkmark-circle-outline' };
            case 'rejected':
                return { color: '#DC3545', text: 'ถูกปฏิเสธ', icon: 'close-circle-outline' };
            default:
                return { color: '#6c757d', text: 'ไม่ทราบสถานะ', icon: 'help-circle-outline' };
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2A405E" />
            </View>
        );
    }

    if (error || !issue) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error || "ไม่พบข้อมูล"}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchIssueDetails}>
                    <Text style={styles.retryButtonText}>ลองใหม่อีกครั้ง</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backButtonError} onPress={handleGoBack}>
                    <Text style={{ color: '#666' }}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statusInfo = getStatusInfo(issue.status);

    // Helper to get display name for issue type
    const getIssueTypeName = (value) => {
        const type = ISSUE_TYPES.find(t => t.value === value);
        return type ? type.name : (value || 'ไม่ระบุประเภท');
    };

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
                <Text style={styles.headerTitle}>รายละเอียดปัญหาส่วนกลาง</Text>
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
                        <View style={[styles.iconContainer, { backgroundColor: '#2A405E20' }]}>
                            <MaterialIcons name="report-problem" size={24} color="#2A405E" />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.label}>ประเภทปัญหา</Text>
                            <Text style={styles.value}>
                                {getIssueTypeName(issue.issue_type)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={[styles.iconContainer, { backgroundColor: '#2A405E20' }]}>
                            <MaterialIcons name="place" size={24} color="#2A405E" />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.label}>สถานที่พบปัญหา</Text>
                            <Text style={styles.value}>{issue.location || '-'}</Text>
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
                            {new Date(issue.reported_date).toLocaleDateString('th-TH', {
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

                    {issue.reporter_name && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>ผู้แจ้ง:</Text>
                            <Text style={styles.infoValue}>{issue.reporter_name}</Text>
                        </View>
                    )}

                    {/* {issue.unit_id && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>ห้อง/ยูนิต:</Text>
                            <Text style={styles.infoValue}>{issue.unit_id}</Text>
                        </View>
                    )} */}

                    {issue.assigned_to && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>ผู้รับผิดชอบ:</Text>
                            <Text style={styles.infoValue}>{issue.assigned_to}</Text>
                        </View>
                    )}
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
        fontFamily: "NotoSansThai_400Regular",
    },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#2A405E',
    },
    retryButtonText: {
        color: '#fff',
        fontFamily: "NotoSansThai_500Medium",
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
        fontFamily: "NotoSansThai_400Regular",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#000",
        textAlign: "left",
        fontFamily: "NotoSansThai_600SemiBold",
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
        fontFamily: "NotoSansThai_600SemiBold",
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
        fontFamily: "NotoSansThai_400Regular",
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        color: '#333',
        fontFamily: "NotoSansThai_500Medium",
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
        fontFamily: "NotoSansThai_600SemiBold",
        color: "#333",
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#555',
        lineHeight: 24,
        fontFamily: "NotoSansThai_400Regular",
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
        fontFamily: "NotoSansThai_400Regular",
    },
    infoValue: {
        fontSize: 14,
        color: '#333',
        fontFamily: "NotoSansThai_500Medium",
    },
    priorityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priorityText: {
        fontSize: 12,
        fontFamily: "NotoSansThai_500Medium",
    },
    notesText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        fontFamily: "NotoSansThai_400Regular",
    },
});
