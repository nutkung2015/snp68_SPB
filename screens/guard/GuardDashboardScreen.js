import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Modal,
    Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome5";
import moment from "moment";
import SecurityService from "../../services/securityService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GuardDashboardScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState("scheduled"); // 'scheduled' (รถเข้า) | 'inside' (รถออก)
    const [logs, setLogs] = useState([]);
    const [scheduledVisitors, setScheduledVisitors] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [projectId, setProjectId] = useState(null);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const fetchData = async () => {
        try {
            let currentPid = projectId;
            if (!currentPid) {
                const userStr = await AsyncStorage.getItem("userData");
                const user = JSON.parse(userStr);
                if (user.projectMemberships && user.projectMemberships.length > 0) {
                    currentPid = user.projectMemberships[0].project_id;
                    setProjectId(currentPid);
                }
            }

            if (!currentPid) return;

            if (activeTab === 'scheduled') {
                // รถเข้า - รถที่ลูกบ้านแจ้งล่วงหน้า
                const response = await SecurityService.getScheduledVisitors(currentPid);
                if (response.status === "success") {
                    setScheduledVisitors(response.data);
                }
            } else {
                // รถออก - รถที่อยู่ในโครงการ
                const response = await SecurityService.getEntryLogs(currentPid, 'inside');
                if (response.status === "success") {
                    setLogs(response.data);
                }
            }
        } catch (error) {
            console.error("Fetch data error:", error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [activeTab, projectId])
    );

    const openModal = (item) => {
        setSelectedItem(item);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedItem(null);
    };

    // Tab รถเข้า: ยืนยันการเข้าหมู่บ้าน
    const handleConfirmEntry = async () => {
        if (!selectedItem) return;
        try {
            const res = await SecurityService.confirmVisitorEntry({
                appointment_id: selectedItem.id,
                project_id: selectedItem.project_id,
                plate_number: selectedItem.plate_number,
                visitor_name: selectedItem.visitor_name,
                unit_id: selectedItem.unit_id
            });
            if (res.status === 'success') {
                closeModal();
                fetchData();
            }
        } catch (error) {
            console.error("Confirm entry error:", error);
        }
    };

    // Tab รถออก: บันทึกรถออก
    const handleCheckOut = async () => {
        if (!selectedItem) return;
        try {
            const res = await SecurityService.checkOut(selectedItem.project_id, selectedItem.plate_number);
            if (res.status === 'success' || res.status === 'warning') {
                closeModal();
                fetchData();
            }
        } catch (error) {
            console.error("Check out error:", error);
        }
    };

    // Tab รถออก: โทรหาลูกบ้าน
    const handleCallResident = () => {
        const phone = selectedItem?.resident_phone || "0812345678";
        Linking.openURL(`tel:${phone}`);
    };

    // Render item for Tab รถเข้า
    const renderScheduledItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
            <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                    <Icon name="car" size={24} color="#003049" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.plateText}>ทะเบียน: {item.plate_number}</Text>
                    <Text style={styles.subText}>{item.visitor_name || "-"}</Text>
                    <Text style={styles.subText}>บ้านเลขที่: {item.unit_number || "-"}</Text>
                </View>
            </View>
            <View style={styles.cardRight}>
                <Text style={styles.timeText}>
                    นัดหมาย: {moment(item.expected_arrival).format("HH:mm")}
                </Text>
                <View style={[styles.statusTag, { backgroundColor: "#60A5FA" }]}>
                    <Text style={styles.statusText}>รอยืนยันเข้า</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    // Render item for Tab รถออก (ไม่มีรถลูกบ้านแล้ว เพราะ backend filter ออก)
    const renderInsideItem = ({ item }) => {
        let statusText = "";
        let statusColor = "#FCD34D";

        if (item.estamp_status === 'approved') {
            statusText = "อนุมัติแล้ว";
            statusColor = "#10B981";
        } else if (item.estamp_status === 'pending') {
            statusText = "รอประทับตรา";
            statusColor = "#FCD34D";
        } else {
            statusText = "เข้ามาแล้ว";
            statusColor = "#60A5FA";
        }

        return (
            <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
                <View style={styles.cardLeft}>
                    <View style={styles.iconContainer}>
                        <Icon name="car" size={24} color="#003049" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.plateText}>ทะเบียน: {item.plate_number}</Text>
                        <Text style={styles.subText}>{item.visitor_name || "ขอเข้ามาติดต่อธุระ"}</Text>
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <Text style={styles.timeText}>
                        เวลาเข้า: {moment(item.check_in_time).format("HH:mm")}
                    </Text>
                    <View style={[styles.statusTag, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>{statusText}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Modal for Tab รถเข้า
    const renderEntryModal = () => (
        <Modal visible={modalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Icon name="car" size={50} color="#003049" style={{ marginBottom: 15 }} />
                    <Text style={styles.modalTitle}>ยืนยันการเข้าหมู่บ้าน</Text>

                    <View style={styles.modalInfo}>
                        <Text style={styles.modalLabel}>ทะเบียน:</Text>
                        <Text style={styles.modalValue}>{selectedItem?.plate_number}</Text>
                    </View>
                    <View style={styles.modalInfo}>
                        <Text style={styles.modalLabel}>ชื่อผู้มาเยี่ยม:</Text>
                        <Text style={styles.modalValue}>{selectedItem?.visitor_name || "-"}</Text>
                    </View>
                    <View style={styles.modalInfo}>
                        <Text style={styles.modalLabel}>บ้านเลขที่:</Text>
                        <Text style={styles.modalValue}>{selectedItem?.unit_number || "-"}</Text>
                    </View>

                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                            <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmEntry}>
                            <Icon name="check" size={16} color="#fff" style={{ marginRight: 5 }} />
                            <Text style={styles.confirmBtnText}>ยืนยันเข้า</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Modal for Tab รถออก
    const renderExitModal = () => {
        const isPending = selectedItem?.estamp_status === 'pending';

        return (
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {isPending && (
                            <View style={styles.warningBadge}>
                                <Icon name="exclamation-triangle" size={16} color="#fff" />
                                <Text style={styles.warningText}>ยังไม่ได้ประทับตรา</Text>
                            </View>
                        )}

                        <Icon name="sign-out-alt" size={50} color="#003049" style={{ marginBottom: 15 }} />
                        <Text style={styles.modalTitle}>บันทึกรถออก</Text>

                        <View style={styles.modalInfo}>
                            <Text style={styles.modalLabel}>ทะเบียน:</Text>
                            <Text style={styles.modalValue}>{selectedItem?.plate_number}</Text>
                        </View>
                        <View style={styles.modalInfo}>
                            <Text style={styles.modalLabel}>ชื่อผู้มาเยี่ยม:</Text>
                            <Text style={styles.modalValue}>{selectedItem?.visitor_name || "-"}</Text>
                        </View>
                        <View style={styles.modalInfo}>
                            <Text style={styles.modalLabel}>เวลาเข้า:</Text>
                            <Text style={styles.modalValue}>
                                {selectedItem?.check_in_time ? moment(selectedItem.check_in_time).format("HH:mm") : "-"}
                            </Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                            </TouchableOpacity>

                            {isPending && (
                                <TouchableOpacity style={styles.callBtn} onPress={handleCallResident}>
                                    <Icon name="phone" size={16} color="#fff" style={{ marginRight: 5 }} />
                                    <Text style={styles.callBtnText}>โทร</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.confirmBtn} onPress={handleCheckOut}>
                                <Icon name="check" size={16} color="#fff" style={{ marginRight: 5 }} />
                                <Text style={styles.confirmBtnText}>ยืนยันออก</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const currentData = activeTab === 'scheduled' ? scheduledVisitors : logs;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="chevron-left" size={20} color="#003049" />
                    <Text style={styles.backText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.title}>รถเข้าโครงการ</Text>

            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => navigation.navigate("GuardCheckIn")}>
                    <Icon name="search" size={20} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.actionBtnTextPrimary}>ตรวจสอบทะเบียน</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnPrimary}>
                    <Icon name="history" size={20} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.actionBtnTextPrimary}>ประวัติการเข้าเยี่ยม</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'scheduled' && styles.activeTab]}
                    onPress={() => setActiveTab('scheduled')}>
                    <Icon name="calendar-check" size={16} color={activeTab === 'scheduled' ? "#003049" : "#6B7280"} style={{ marginRight: 5 }} />
                    <Text style={[styles.tabText, activeTab === 'scheduled' && styles.activeTabText]}>
                        รถเข้า ({scheduledVisitors.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'inside' && styles.activeTab]}
                    onPress={() => setActiveTab('inside')}>
                    <Icon name="sign-out-alt" size={16} color={activeTab === 'inside' ? "#003049" : "#6B7280"} style={{ marginRight: 5 }} />
                    <Text style={[styles.tabText, activeTab === 'inside' && styles.activeTabText]}>
                        รถออก ({logs.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>
                {activeTab === 'scheduled'
                    ? "รายการรถที่ลูกบ้านแจ้งล่วงหน้า"
                    : "รายการรถผู้มาติดต่อในโครงการ (แตะเพื่อบันทึกออก)"}
            </Text>

            <FlatList
                data={currentData}
                renderItem={activeTab === 'scheduled' ? renderScheduledItem : renderInsideItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีรายการ</Text>}
            />

            {/* Modals */}
            {activeTab === 'scheduled' && selectedItem && renderEntryModal()}
            {activeTab === 'inside' && selectedItem && renderExitModal()}
        </View>
    );
};

const styles = StyleSheet.create({
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
        color: "#003049",
        marginBottom: 20,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    actionBtnPrimary: {
        backgroundColor: '#003049',
        flex: 0.48,
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnTextPrimary: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        padding: 5,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        flexDirection: 'row',
    },
    activeTab: {
        backgroundColor: '#D1E6F0',
    },
    tabText: {
        color: '#6B7280',
        fontWeight: 'bold',
    },
    activeTabText: {
        color: '#003049',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#003049",
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
    statusTag: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#9CA3AF'
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 25,
        width: '85%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#003049',
        marginBottom: 20,
    },
    modalInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    modalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#003049',
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 25,
        gap: 10,
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#E5E7EB',
    },
    cancelBtnText: {
        color: '#374151',
        fontWeight: 'bold',
    },
    confirmBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#10B981',
        flexDirection: 'row',
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    callBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#3B82F6',
        flexDirection: 'row',
        alignItems: 'center',
    },
    callBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    warningBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: 15,
    },
    warningText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 5,
        fontSize: 12,
    },
});

export default GuardDashboardScreen;
