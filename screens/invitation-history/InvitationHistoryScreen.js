import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
    RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ProjectCustomizationsService from "../../services/projectCustomizationsService";
import UnitsService from "../../services/unitsService";

const InvitationHistoryScreen = ({ navigation, route }) => {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [unitId, setUnitId] = useState(route?.params?.unitId || null);
    const [primaryColor, setPrimaryColor] = useState("#2A405E");

    // Fetch project customizations
    const fetchProjectCustomizations = async (projectId) => {
        try {
            const response = await ProjectCustomizationsService.getProjectCustomizations(projectId);
            if (response) {
                if (response.primary_color) setPrimaryColor(response.primary_color);
            }
        } catch (err) {
            console.error("Error fetching project customizations:", err);
        }
    };

    // Fetch invitation history
    const fetchInvitationHistory = async (unitIdParam) => {
        try {
            setError(null);
            const response = await UnitsService.getUnitInvitationHistory(unitIdParam);

            if (response && response.status === "success") {
                setInvitations(response.data || []);
            } else {
                setInvitations([]);
            }
        } catch (err) {
            console.error("Error fetching invitation history:", err);
            setError("ไม่สามารถโหลดข้อมูลประวัติคำเชิญได้");
        }
    };

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                const storedUserData = await AsyncStorage.getItem("userData");
                if (storedUserData) {
                    const userData = JSON.parse(storedUserData);

                    // Get unit_id
                    let currentUnitId = route?.params?.unitId;
                    if (!currentUnitId && userData?.unitMemberships?.[0]?.unit_id) {
                        currentUnitId = userData.unitMemberships[0].unit_id;
                    }

                    if (currentUnitId) {
                        setUnitId(currentUnitId);
                        await fetchInvitationHistory(currentUnitId);
                    }

                    // Get project customizations
                    const projectId = userData?.projectMemberships?.[0]?.project_id;
                    if (projectId) {
                        await fetchProjectCustomizations(projectId);
                    }
                }
            } catch (err) {
                console.error("Error loading data:", err);
                setError("ไม่สามารถโหลดข้อมูลได้");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [route?.params?.unitId]);

    // Pull to refresh
    const onRefresh = async () => {
        if (!unitId) return;
        setRefreshing(true);
        await fetchInvitationHistory(unitId);
        setRefreshing(false);
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "-";
        const date = new Date(timestamp);
        return date.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Get status info
    const getStatusInfo = (status, expiresAt) => {
        // Check if expired
        if (status === "pending" && expiresAt && new Date(expiresAt) < new Date()) {
            return { text: "หมดอายุ", color: "#9CA3AF", icon: "time-outline", bgColor: "#F3F4F6" };
        }

        switch (status) {
            case "pending":
                return { text: "รอการตอบรับ", color: "#F59E0B", icon: "hourglass-outline", bgColor: "#FEF3C7" };
            case "accepted":
                return { text: "ตอบรับแล้ว", color: "#10B981", icon: "checkmark-circle-outline", bgColor: "#D1FAE5" };
            case "rejected":
                return { text: "ปฏิเสธ", color: "#EF4444", icon: "close-circle-outline", bgColor: "#FEE2E2" };
            case "expired":
                return { text: "หมดอายุ", color: "#9CA3AF", icon: "time-outline", bgColor: "#F3F4F6" };
            default:
                return { text: status || "-", color: "#6B7280", icon: "help-circle-outline", bgColor: "#F3F4F6" };
        }
    };

    // Get role label
    const getRoleLabel = (role) => {
        switch (role) {
            case "owner":
                return "เจ้าของ";
            case "tenant":
                return "ผู้เช่า";
            case "family":
                return "สมาชิกครอบครัว";
            default:
                return role || "-";
        }
    };

    // Render invitation item
    const renderInvitationItem = (invitation, index) => {
        const statusInfo = getStatusInfo(invitation.status, invitation.expires_at);

        return (
            <View
                key={invitation.id || index}
                style={[
                    styles.invitationItem,
                    index === 0 && styles.invitationItemFirst,
                    index === invitations.length - 1 && styles.invitationItemLast,
                ]}
            >
                {/* Icon */}
                <View
                    style={[
                        styles.invitationIconContainer,
                        { backgroundColor: statusInfo.bgColor },
                    ]}
                >
                    <Ionicons
                        name={statusInfo.icon}
                        size={24}
                        color={statusInfo.color}
                    />
                </View>

                {/* Info */}
                <View style={styles.invitationInfo}>
                    <View style={styles.invitationHeader}>
                        <Text style={styles.invitationCode}>
                            รหัส: {invitation.code}
                        </Text>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: statusInfo.bgColor },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusBadgeText,
                                    { color: statusInfo.color },
                                ]}
                            >
                                {statusInfo.text}
                            </Text>
                        </View>
                    </View>

                    {/* Role */}
                    <View style={styles.invitationDetailRow}>
                        <Ionicons name="person" size={13} color="#999" />
                        <Text style={styles.invitationDetailText}>
                            บทบาท: {getRoleLabel(invitation.role)}
                        </Text>
                    </View>

                    {/* Inviter */}
                    <View style={styles.invitationDetailRow}>
                        <Ionicons name="send" size={13} color="#999" />
                        <Text style={styles.invitationDetailText}>
                            เชิญโดย: {invitation.invited_by_name || "-"}
                        </Text>
                    </View>

                    {/* Accepted by */}
                    {invitation.status === "accepted" && invitation.accepted_by_name && (
                        <View style={styles.invitationDetailRow}>
                            <Ionicons name="checkmark-done" size={13} color="#10B981" />
                            <Text style={[styles.invitationDetailText, { color: "#10B981" }]}>
                                ตอบรับโดย: {invitation.accepted_by_name}
                            </Text>
                        </View>
                    )}

                    {/* Contact */}
                    {(invitation.invited_email || invitation.invited_phone) && (
                        <View style={styles.invitationDetailRow}>
                            <Ionicons name="mail" size={13} color="#999" />
                            <Text style={styles.invitationDetailText}>
                                {invitation.invited_email || invitation.invited_phone}
                            </Text>
                        </View>
                    )}

                    {/* Timestamp */}
                    <Text style={styles.invitationTime}>
                        {formatTimestamp(invitation.created_at)}
                    </Text>

                    {/* Expires */}
                    {invitation.status === "pending" && invitation.expires_at && (
                        <Text style={styles.expiresText}>
                            หมดอายุ: {formatTimestamp(invitation.expires_at)}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

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
            <Text style={styles.pageTitle}>ประวัติคำเชิญ</Text>

            {/* Info Card */}
            <View style={[styles.infoCard, { backgroundColor: primaryColor + '15' }]}>
                <Ionicons name="information-circle" size={20} color={primaryColor} />
                <Text style={[styles.infoText, { color: primaryColor }]}>
                    แสดงประวัติคำเชิญเข้าบ้านทั้งหมดของคุณ
                </Text>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: primaryColor }]}
                        onPress={() => unitId && fetchInvitationHistory(unitId)}
                    >
                        <Text style={styles.retryText}>ลองใหม่</Text>
                    </TouchableOpacity>
                </View>
            ) : invitations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="mail-unread-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>ไม่มีประวัติคำเชิญ</Text>
                    <Text style={styles.emptySubtext}>
                        ยังไม่มีคำเชิญเข้าบ้านที่สร้างขึ้น
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.invitationList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[primaryColor]}
                            tintColor={primaryColor}
                        />
                    }
                >
                    {/* Summary */}
                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryCard, { backgroundColor: "#D1FAE5" }]}>
                            <Text style={[styles.summaryCount, { color: "#10B981" }]}>
                                {invitations.filter(i => i.status === "accepted").length}
                            </Text>
                            <Text style={styles.summaryLabel}>ตอบรับ</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: "#FEF3C7" }]}>
                            <Text style={[styles.summaryCount, { color: "#F59E0B" }]}>
                                {invitations.filter(i => i.status === "pending").length}
                            </Text>
                            <Text style={styles.summaryLabel}>รอตอบรับ</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: "#F3F4F6" }]}>
                            <Text style={[styles.summaryCount, { color: "#6B7280" }]}>
                                {invitations.length}
                            </Text>
                            <Text style={styles.summaryLabel}>ทั้งหมด</Text>
                        </View>
                    </View>

                    {/* Invitation List */}
                    <View style={styles.invitationCard}>
                        {invitations.map((invitation, index) =>
                            renderInvitationItem(invitation, index)
                        )}
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
        fontFamily: "NotoSansThai_400Regular",
        color: "#000",
    },
    pageTitle: {
        fontSize: 28,
        fontFamily: "NotoSansThai_700Bold",
        color: "#000",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        fontFamily: "NotoSansThai_400Regular",
    },
    // Summary
    summaryRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 16,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
    },
    summaryCount: {
        fontSize: 22,
        fontFamily: "NotoSansThai_700Bold",
    },
    summaryLabel: {
        fontSize: 12,
        fontFamily: "NotoSansThai_400Regular",
        color: "#6B7280",
        marginTop: 2,
    },
    // List
    invitationList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    invitationCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 20,
    },
    invitationItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    invitationItemFirst: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    invitationItemLast: {
        borderBottomWidth: 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    invitationIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    invitationInfo: {
        flex: 1,
    },
    invitationHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    invitationCode: {
        fontSize: 15,
        fontFamily: "NotoSansThai_600SemiBold",
        color: "#333",
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 11,
        fontFamily: "NotoSansThai_500Medium",
    },
    invitationDetailRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 3,
    },
    invitationDetailText: {
        fontSize: 13,
        fontFamily: "NotoSansThai_400Regular",
        color: "#999",
    },
    invitationTime: {
        fontSize: 12,
        fontFamily: "NotoSansThai_400Regular",
        color: "#bbb",
        marginTop: 6,
    },
    expiresText: {
        fontSize: 11,
        fontFamily: "NotoSansThai_400Regular",
        color: "#EF4444",
        marginTop: 2,
    },
    // States
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: "NotoSansThai_400Regular",
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
        fontFamily: "NotoSansThai_400Regular",
        color: "#FF6B6B",
        marginTop: 16,
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
        fontFamily: "NotoSansThai_500Medium",
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
        fontFamily: "NotoSansThai_500Medium",
        color: "#999",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        fontFamily: "NotoSansThai_400Regular",
        color: "#bbb",
        marginTop: 8,
        textAlign: "center",
    },
});

export default InvitationHistoryScreen;
