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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ProjectCustomizationsService from "../../services/projectCustomizationsService";
import UnitsService from "../../services/unitsService";

const UnitEntryHistoryScreen = ({ navigation, route }) => {
    

    // States
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unitId, setUnitId] = useState(route?.params?.unitId || null);
    const [primaryColor, setPrimaryColor] = useState("#2A405E");
    const [secondaryColor, setSecondaryColor] = useState("#FF9800");

    // Fetch project customizations
    const fetchProjectCustomizations = async (projectId) => {
        try {
            const response = await ProjectCustomizationsService.getProjectCustomizations(projectId);
            if (response) {
                if (response.primary_color) setPrimaryColor(response.primary_color);
                if (response.secondary_color) setSecondaryColor(response.secondary_color);
            }
        } catch (err) {
            console.error("Error fetching project customizations:", err);
        }
    };

    // Fetch entry history from actual API
    const fetchEntryHistory = async (unitIdParam) => {
        try {
            setLoading(true);
            setError(null);

            const response = await UnitsService.getUnitEntryHistory(unitIdParam);

            if (response && response.status === "success") {
                // Map API data to UI format
                // In actual API, one entry_log might have both check-in and check-out
                // Let's transform them into individual events for display if they have check-out
                const allEvents = [];

                (response.data || []).forEach(log => {
                    // Always add Check-in event
                    allEvents.push({
                        id: `${log.id}_in`,
                        resident_name: log.visitor_name || "ผู้มาติดต่อ",
                        entry_type: "check_in",
                        timestamp: log.check_in_time,
                        gate: log.check_in_gate || "ไม่ระบุประตู",
                        vehicle_plate: log.plate_number,
                    });

                    // If they have checked out, add Check-out event
                    if (log.check_out_time) {
                        allEvents.push({
                            id: `${log.id}_out`,
                            resident_name: log.visitor_name || "ผู้มาติดต่อ",
                            entry_type: "check_out",
                            timestamp: log.check_out_time,
                            gate: log.check_out_gate || "ไม่ระบุประตู",
                            vehicle_plate: log.plate_number,
                        });
                    }
                });

                // Sort by timestamp DESC (newest first)
                allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                setEntries(allEvents);
            } else {
                setEntries([]);
            }
        } catch (err) {
            console.error("Error fetching entry history:", err);
            setError("ไม่สามารถโหลดข้อมูลประวัติได้");
        } finally {
            setLoading(false);
        }
    };

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // If unitId passed via route params
                if (route?.params?.unitId) {
                    setUnitId(route.params.unitId);
                    await fetchEntryHistory(route.params.unitId);
                } else {
                    // Otherwise get from AsyncStorage
                    const storedUserData = await AsyncStorage.getItem("userData");
                    if (storedUserData) {
                        const userData = JSON.parse(storedUserData);
                        if (userData?.unitMemberships?.[0]?.unit_id) {
                            const currentUnitId = userData.unitMemberships[0].unit_id;
                            setUnitId(currentUnitId);
                            await fetchEntryHistory(currentUnitId);
                        }

                        // Get project customizations
                        if (userData?.projectMemberships?.[0]?.project_id) {
                            await fetchProjectCustomizations(userData.projectMemberships[0].project_id);
                        }
                    }
                }
            } catch (err) {
                console.error("Error loading data:", err);
                setError("ไม่สามารถโหลดข้อมูลได้");
                setLoading(false);
            }
        };

        loadData();
    }, [route?.params?.unitId]);

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const timeStr = date.toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
        });

        if (diffDays === 0) {
            return `วันนี้ ${timeStr}`;
        } else if (diffDays === 1) {
            return `เมื่อวาน ${timeStr}`;
        } else {
            return date.toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
    };

    // Render entry item
    const renderEntryItem = (entry, index) => {
        const isCheckIn = entry.entry_type === "check_in";

        return (
            <View
                key={entry.id || index}
                style={[
                    styles.entryItem,
                    index === 0 && styles.entryItemFirst,
                    index === entries.length - 1 && styles.entryItemLast,
                ]}
            >
                {/* Icon */}
                <View
                    style={[
                        styles.entryIconContainer,
                        {
                            backgroundColor: isCheckIn
                                ? primaryColor + "20"
                                : secondaryColor + "20",
                        },
                    ]}
                >
                    <Ionicons
                        name={isCheckIn ? "log-in" : "log-out"}
                        size={24}
                        color={isCheckIn ? primaryColor : secondaryColor}
                    />
                </View>

                {/* Info */}
                <View style={styles.entryInfo}>
                    <View style={styles.entryHeader}>
                        <Text style={styles.entryName}>{entry.resident_name}</Text>
                        <View
                            style={[
                                styles.entryTypeBadge,
                                {
                                    backgroundColor: isCheckIn
                                        ? primaryColor
                                        : secondaryColor,
                                },
                            ]}
                        >
                            <Text style={styles.entryTypeBadgeText}>
                                {isCheckIn ? "เข้า" : "ออก"}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.entryTime}>
                        {formatTimestamp(entry.timestamp)}
                    </Text>
                    <View style={styles.entryDetails}>
                        <View style={styles.entryDetailRow}>
                            <Ionicons name="location" size={14} color="#999" />
                            <Text style={styles.entryDetailText}>{entry.gate}</Text>
                        </View>
                        {entry.vehicle_plate && (
                            <View style={styles.entryDetailRow}>
                                <Ionicons name="car" size={14} color="#999" />
                                <Text style={styles.entryDetailText}>
                                    {entry.vehicle_plate}
                                </Text>
                            </View>
                        )}
                    </View>
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
            <Text style={styles.pageTitle}>ประวัติการเข้า-ออก Unit</Text>

            {/* Info Card */}
            <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color={primaryColor} />
                <Text style={styles.infoText}>
                    แสดงประวัติการเข้า-ออกของผู้อยู่อาศัยในบ้าน
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
                        onPress={() => unitId && fetchEntryHistory(unitId)}
                    >
                        <Text style={styles.retryText}>ลองใหม่</Text>
                    </TouchableOpacity>
                </View>
            ) : entries.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="time-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>ไม่มีประวัติการเข้า-ออก</Text>
                    <Text style={styles.emptySubtext}>
                        ยังไม่มีบันทึกการเข้า-ออก Unit
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.entryList}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.entryCard}>
                        {entries.map((entry, index) => renderEntryItem(entry, index))}
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
        backgroundColor: "#E3F2FD",
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
        color: "#1976D2",
    },
    entryList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    entryCard: {
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
    entryItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    entryItemFirst: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    entryItemLast: {
        borderBottomWidth: 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    entryIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    entryInfo: {
        flex: 1,
    },
    entryHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    entryName: {
        fontSize: 16,
        fontFamily: "NotoSansThai_500Medium",
        color: "#333",
        flex: 1,
    },
    entryTypeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    entryTypeBadgeText: {
        fontSize: 12,
        fontFamily: "NotoSansThai_500Medium",
        color: "#fff",
    },
    entryTime: {
        fontSize: 14,
        fontFamily: "NotoSansThai_400Regular",
        color: "#666",
        marginBottom: 8,
    },
    entryDetails: {
        flexDirection: "row",
        gap: 16,
    },
    entryDetailRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    entryDetailText: {
        fontSize: 13,
        fontFamily: "NotoSansThai_400Regular",
        color: "#999",
    },
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

export default UnitEntryHistoryScreen;
