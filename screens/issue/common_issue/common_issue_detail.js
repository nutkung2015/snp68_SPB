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
import { Ionicons } from "@expo/vector-icons";
import IssueService from "../../../services/issueService";

const { width } = Dimensions.get("window");

export default function CommonIssueDetailScreen({ route, navigation }) {
    const { issueId } = route.params;
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchIssueDetail = async () => {
            try {
                setLoading(true);
                const fetchedIssue = await IssueService.getCommonIssueById(issueId);
                setIssue(fetchedIssue.data);
            } catch (err) {
                console.error("Failed to fetch issue details:", err);
                setError("ไม่สามารถโหลดข้อมูลรายละเอียดได้");
            } finally {
                setLoading(false);
            }
        };

        if (issueId) {
            fetchIssueDetail();
        }
    }, [issueId]);

    const handleGoBack = () => {
        navigation.goBack();
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />
            </SafeAreaView>
        );
    }

    if (error || !issue) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="black" />
                        <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error || "ไม่พบข้อมูล"}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const getStatusStyles = (status) => {
        switch (status) {
            case 'pending':
                return { color: '#FFA500', text: 'รอดำเนินการ' };
            case 'in_progress':
                return { color: '#007BFF', text: 'กำลังดำเนินการ' };
            case 'resolved':
                return { color: '#28A745', text: 'แก้ไขแล้ว' };
            case 'rejected':
                return { color: '#DC3545', text: 'ถูกปฏิเสธ' };
            default:
                return { color: '#6c757d', text: 'ไม่ทราบสถานะ' };
        }
    };

    const statusStyle = getStatusStyles(issue.status);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#fff" barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="black" />
                    <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>รายละเอียด</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: statusStyle.color + '20' }]}>
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>
                        สถานะ: {statusStyle.text}
                    </Text>
                </View>

                {/* Issue Info */}
                <View style={styles.section}>
                    <Text style={styles.title}>{issue.issue_type}</Text>
                    <Text style={styles.date}>
                        แจ้งเมื่อ: {new Date(issue.reported_date).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                </View>

                <View style={styles.divider} />

                {/* Location */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>สถานที่พบปัญหา</Text>
                    <Text style={styles.description}>{issue.location}</Text>
                </View>

                <View style={styles.divider} />

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>รายละเอียด</Text>
                    <Text style={styles.description}>{issue.description}</Text>
                </View>

                {/* Images */}
                {issue.image_urls && issue.image_urls.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>รูปภาพประกอบ</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                            {issue.image_urls.map((img, index) => (
                                <Image
                                    key={index}
                                    source={{ uri: img.url }}
                                    style={styles.image}
                                    resizeMode="cover"
                                />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Admin Response (if any) */}
                {issue.notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>หมายเหตุจากเจ้าหน้าที่</Text>
                        <View style={styles.noteContainer}>
                            <Text style={styles.noteText}>{issue.notes}</Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        width: 80,
    },
    backButtonText: {
        fontSize: 16,
        marginLeft: 4,
        fontFamily: "Kanit_400Regular",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        fontFamily: "Kanit_600SemiBold",
    },
    content: {
        flex: 1,
    },
    loadingIndicator: {
        marginTop: 50,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        fontSize: 16,
        color: "red",
        fontFamily: "Kanit_400Regular",
    },
    statusBanner: {
        padding: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    statusText: {
        fontSize: 16,
        fontWeight: "bold",
        fontFamily: "Kanit_600SemiBold",
    },
    section: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
        fontFamily: "Kanit_600SemiBold",
    },
    date: {
        fontSize: 14,
        color: "#888",
        fontFamily: "Kanit_400Regular",
    },
    divider: {
        height: 1,
        backgroundColor: "#eee",
        marginHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 12,
        fontFamily: "Kanit_600SemiBold",
    },
    description: {
        fontSize: 16,
        color: "#444",
        lineHeight: 24,
        fontFamily: "Kanit_400Regular",
    },
    imageScroll: {
        marginTop: 8,
    },
    image: {
        width: 200,
        height: 200,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: "#f0f0f0",
    },
    noteContainer: {
        backgroundColor: "#f9f9f9",
        padding: 16,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#205248",
    },
    noteText: {
        fontSize: 16,
        color: "#333",
        fontFamily: "Kanit_400Regular",
    },
});
