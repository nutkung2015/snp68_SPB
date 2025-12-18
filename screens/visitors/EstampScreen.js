import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome5";
import moment from "moment";
import VisitorService from "../../services/visitorService";

const EstampScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [visitors, setVisitors] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [userData, setUserData] = useState(null);

    // Modal state
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchVisitors = async () => {
        try {
            const userStr = await AsyncStorage.getItem("userData");
            if (!userStr) return;

            const user = JSON.parse(userStr);
            setUserData(user);

            if (user.unitMemberships && user.unitMemberships.length > 0) {
                const unitId = user.unitMemberships[0].unit_id;
                const response = await VisitorService.getPendingVisitorsByUnit(unitId);
                if (response.status === "success") {
                    setVisitors(response.data);
                }
            }
        } catch (error) {
            console.error("Fetch visitors error:", error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchVisitors();
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchVisitors().finally(() => setLoading(false));
        }, [])
    );

    const openDetailModal = (item) => {
        setSelectedVisitor(item);
        setModalVisible(true);
    };

    const closeDetailModal = () => {
        setModalVisible(false);
        setSelectedVisitor(null);
    };

    const handleEstamp = async (logId) => {
        console.log("=== handleEstamp called ===");
        console.log("logId:", logId);

        try {
            setLoading(true);
            console.log("Calling API with logId:", logId);
            const res = await VisitorService.actionEstamp(logId, "approved");
            console.log("API Response:", res);
            if (res.status === "success") {
                closeDetailModal();
                fetchVisitors();
            }
        } catch (error) {
            console.error("API Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Modal component
    const renderDetailModal = () => {
        if (!selectedVisitor) return null;

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeDetailModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeDetailModal}>
                                <Text style={styles.cancelText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>ผู้มาเยี่ยม</Text>
                            <View style={{ width: 30 }} />
                        </View>

                        <View style={styles.detailCard}>
                            <View style={styles.detailRow}>
                                <View style={styles.detailItemHalf}>
                                    <Text style={styles.detailLabel}>ชื่อ:</Text>
                                    <Text style={styles.detailValue}>{selectedVisitor.visitor_name || "-"}</Text>
                                </View>
                                <View style={styles.verticalDivider} />
                                <View style={styles.detailItemHalf}>
                                    <Text style={styles.detailLabel}>ทะเบียน:</Text>
                                    <Text style={styles.detailValue}>{selectedVisitor.plate_number}</Text>
                                </View>
                            </View>

                            <View style={styles.horizontalDivider} />

                            <View style={styles.detailRow}>
                                <View style={styles.detailItemHalf}>
                                    <Text style={styles.detailLabel}>เวลาเข้า:</Text>
                                    <Text style={styles.detailValue}>{moment(selectedVisitor.check_in_time).format("HH:mm")}</Text>
                                </View>
                                <View style={styles.verticalDivider} />
                                <View style={styles.detailItemHalf}>
                                    <Text style={styles.detailLabel}>เวลาออก:</Text>
                                    <Text style={styles.detailValue}>-</Text>
                                </View>
                            </View>

                            <View style={styles.horizontalDivider} />

                            <View style={styles.detailSection}>
                                <Text style={styles.detailLabel}>หมายเหตุการเข้าเยี่ยม:</Text>
                                <Text style={styles.detailSubValue}>ขอเข้ามาติดต่อคุยธุรกิจ</Text>
                            </View>
                        </View>

                        <View style={styles.modalFooter}>
                            {selectedVisitor.estamp_status === 'pending' && (
                                <TouchableOpacity
                                    style={styles.fullButton}
                                    onPress={() => handleEstamp(selectedVisitor.id)}
                                >
                                    <Text style={styles.fullButtonText}>ประทับตรา</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderItem = ({ item }) => {
        const isPending = item.estamp_status === "pending";
        const statusColor = isPending ? "#FCD34D" : "#1F2937";
        const statusText = isPending ? "รอประทับตรา" : "เสร็จสิ้น";
        const statusTextColor = isPending ? "#000" : "#FFF";

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => openDetailModal(item)}
                activeOpacity={0.8}
            >
                <View style={styles.cardLeft}>
                    <View style={styles.iconContainer}>
                        <Icon name="car" size={24} color="#003049" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.plateText}>ทะเบียน: {item.plate_number}</Text>
                        <Text style={styles.subText}>
                            {item.visitor_name || "ขอเข้ามาติดต่อธุระ"}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardRight}>
                    <Text style={styles.timeText}>เวลาเข้า: {moment(item.check_in_time).format("HH:mm")}</Text>
                    <View style={[styles.statusButton, { backgroundColor: statusColor }]}>
                        <Text style={[styles.statusButtonText, { color: statusTextColor }]}>
                            {statusText}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {renderDetailModal()}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="chevron-left" size={20} color="#003049" />
                    <Text style={styles.backText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.title}>ผู้มาเยี่ยม</Text>

            <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert("Coming Soon", "Feature to invite visitor")}>
                <Icon name="plus" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={styles.addButtonText}>แจ้งรายการรถเข้าหมู่บ้าน</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>รายการผู้มาเยี่ยม</Text>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#003049" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={visitors}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>ไม่มีรายการรถที่รอตรวจสอบ</Text>
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#f5f5f5',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: 500,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cancelText: {
        color: '#003049',
        fontSize: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#003049',
    },
    detailCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    detailItemHalf: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#003049',
    },
    detailSubValue: {
        fontSize: 16,
        color: '#003049',
    },
    verticalDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 15,
    },
    horizontalDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 5,
    },
    detailSection: {
        paddingVertical: 10,
    },
    modalFooter: {
        marginTop: 'auto',
        marginBottom: 20,
    },
    fullButton: {
        backgroundColor: '#003049',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    fullButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },

    // Main Screen Styles
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backText: {
        fontSize: 16,
        color: '#003049',
        marginLeft: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#023e3a",
        marginBottom: 20,
    },
    addButton: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
        borderRadius: 12,
        padding: 20,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    addButtonText: {
        color: "#6B7280",
        fontSize: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#023e3a",
        marginBottom: 10,
    },
    card: {
        backgroundColor: "#D1E6F0",
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    iconContainer: {
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
    },
    plateText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#003049",
    },
    subText: {
        fontSize: 12,
        color: "#4B5563",
    },
    cardRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 50,
    },
    timeText: {
        fontSize: 10,
        color: "#6B7280",
        marginBottom: 5,
    },
    statusButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    statusButtonText: {
        fontSize: 12,
        fontWeight: "bold",
    },
    emptyText: {
        textAlign: "center",
        color: "#9ca3af",
        marginTop: 20,
        fontSize: 16,
    },
});

export default EstampScreen;
