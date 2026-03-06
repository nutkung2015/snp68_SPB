import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Modal,
    Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import SecurityService from "../../services/securityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';

const EntryHistoryScreen = ({ navigation }) => {
    const [logs, setLogs] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [projectId, setProjectId] = useState(null);

    // Date filter states
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Modal for detail view
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const fetchData = async (date = selectedDate) => {
        try {
            setLoading(true);
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

            // Format date for API (YYYY-MM-DD)
            const dateStr = moment(date).format("YYYY-MM-DD");

            const response = await SecurityService.getEntryHistory(currentPid, dateStr);
            if (response.status === "success") {
                setLogs(response.data);
            }
        } catch (error) {
            console.error("Fetch history error:", error);
        } finally {
            setLoading(false);
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
        }, [projectId, selectedDate])
    );

    const onDateChange = (event, date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedDate(date);
            fetchData(date);
        }
    };

    const openModal = (item) => {
        setSelectedItem(item);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedItem(null);
    };

    // Navigate to previous/next day
    const goToPreviousDay = () => {
        const newDate = moment(selectedDate).subtract(1, 'days').toDate();
        setSelectedDate(newDate);
        fetchData(newDate);
    };

    const goToNextDay = () => {
        const newDate = moment(selectedDate).add(1, 'days').toDate();
        // Don't allow future dates
        if (moment(newDate).isAfter(moment(), 'day')) return;
        setSelectedDate(newDate);
        fetchData(newDate);
    };

    const goToToday = () => {
        const today = new Date();
        setSelectedDate(today);
        fetchData(today);
    };

    const renderItem = ({ item }) => {
        const isResident = item.visitor_type === 'resident';
        const statusColor = item.status === 'exited' ? '#10B981' : '#60A5FA';
        const statusText = item.status === 'exited' ? 'ออกแล้ว' : 'อยู่ในโครงการ';

        return (
            <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
                <View style={styles.cardLeft}>
                    <View style={[styles.iconContainer, isResident && styles.residentIcon]}>
                        <Icon name="car" size={20} color={isResident ? "#fff" : "#003049"} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.plateText}>{item.plate_number}</Text>
                        <Text style={styles.subText}>
                            {isResident ? "🏠 ลูกบ้าน" : item.visitor_name || "ผู้มาติดต่อ"}
                        </Text>
                        {item.unit_number && (
                            <Text style={styles.unitText}>บ้าน: {item.unit_number}</Text>
                        )}
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <View style={styles.timeRow}>
                        <Text style={styles.timeLabel}>เข้า:</Text>
                        <Text style={styles.timeValue}>
                            {moment(item.check_in_time).format("HH:mm")}
                        </Text>
                    </View>
                    {item.check_out_time && (
                        <View style={styles.timeRow}>
                            <Text style={styles.timeLabel}>ออก:</Text>
                            <Text style={styles.timeValue}>
                                {moment(item.check_out_time).format("HH:mm")}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.statusTag, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>{statusText}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderDetailModal = () => {
        if (!selectedItem) return null;

        const isResident = selectedItem.visitor_type === 'resident';

        return (
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>

                        <Icon
                            name={isResident ? "home" : "car"}
                            size={40}
                            color="#003049"
                            style={{ marginBottom: 15 }}
                        />
                        <Text style={styles.modalTitle}>
                            {isResident ? "รถลูกบ้าน" : "ผู้มาเยี่ยม"}
                        </Text>

                        <View style={styles.modalInfo}>
                            <Text style={styles.modalLabel}>ทะเบียน:</Text>
                            <Text style={styles.modalValue}>{selectedItem?.plate_number}</Text>
                        </View>

                        {!isResident && (
                            <View style={styles.modalInfo}>
                                <Text style={styles.modalLabel}>ชื่อผู้มาเยี่ยม:</Text>
                                <Text style={styles.modalValue}>{selectedItem?.visitor_name || "-"}</Text>
                            </View>
                        )}

                        {selectedItem?.unit_number && (
                            <View style={styles.modalInfo}>
                                <Text style={styles.modalLabel}>บ้านเลขที่:</Text>
                                <Text style={styles.modalValue}>{selectedItem.unit_number}</Text>
                            </View>
                        )}

                        <View style={styles.modalInfo}>
                            <Text style={styles.modalLabel}>เวลาเข้า:</Text>
                            <Text style={styles.modalValue}>
                                {moment(selectedItem?.check_in_time).format("DD/MM/YYYY HH:mm")}
                            </Text>
                        </View>

                        {selectedItem?.check_out_time && (
                            <View style={styles.modalInfo}>
                                <Text style={styles.modalLabel}>เวลาออก:</Text>
                                <Text style={styles.modalValue}>
                                    {moment(selectedItem.check_out_time).format("DD/MM/YYYY HH:mm")}
                                </Text>
                            </View>
                        )}

                        <View style={styles.modalInfo}>
                            <Text style={styles.modalLabel}>สถานะประทับตรา:</Text>
                            <Text style={[styles.modalValue, {
                                color: selectedItem?.estamp_status === 'approved' ? '#10B981' : '#F59E0B'
                            }]}>
                                {selectedItem?.estamp_status === 'approved' ? 'อนุมัติแล้ว' :
                                    selectedItem?.estamp_status === 'pending' ? 'รอประทับตรา' : 'ไม่ต้องประทับ'}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.closeModalBtn} onPress={closeModal}>
                            <Text style={styles.closeModalBtnText}>ปิด</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    const isToday = moment(selectedDate).isSame(moment(), 'day');
    const isFutureDisabled = moment(selectedDate).isSameOrAfter(moment(), 'day');

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="chevron-left" size={20} color="#003049" />
                    <Text style={styles.backText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.title}>ประวัติรถเข้า-ออก</Text>

            {/* Date Filter */}
            <View style={styles.dateFilterContainer}>
                <TouchableOpacity style={styles.dateNavBtn} onPress={goToPreviousDay}>
                    <Ionicons name="chevron-back" size={24} color="#003049" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Ionicons name="calendar-outline" size={20} color="#003049" />
                    <Text style={styles.dateText}>
                        {isToday ? 'วันนี้' : moment(selectedDate).format("DD/MM/YYYY")}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#6B7280" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.dateNavBtn, isFutureDisabled && styles.disabledBtn]}
                    onPress={goToNextDay}
                    disabled={isFutureDisabled}
                >
                    <Ionicons name="chevron-forward" size={24} color={isFutureDisabled ? "#ccc" : "#003049"} />
                </TouchableOpacity>

                {!isToday && (
                    <TouchableOpacity style={styles.todayBtn} onPress={goToToday}>
                        <Text style={styles.todayBtnText}>วันนี้</Text>
                    </TouchableOpacity>
                )}
            </View>

            {showDatePicker && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                />
            )}

            {/* Summary */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>{logs.length}</Text>
                    <Text style={styles.summaryLabel}>รายการทั้งหมด</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>
                        {logs.filter(l => l.visitor_type === 'resident').length}
                    </Text>
                    <Text style={styles.summaryLabel}>ลูกบ้าน</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>
                        {logs.filter(l => l.visitor_type === 'visitor').length}
                    </Text>
                    <Text style={styles.summaryLabel}>ผู้มาเยี่ยม</Text>
                </View>
            </View>

            {/* List */}
            <FlatList
                data={logs}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="clipboard-list" size={50} color="#ccc" />
                        <Text style={styles.emptyText}>
                            ไม่มีรายการในวันที่ {moment(selectedDate).format("DD/MM/YYYY")}
                        </Text>
                    </View>
                }
            />

            {renderDetailModal()}
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
        fontFamily: "NotoSansThai_400Regular",
    },
    title: {
        fontSize: 24,
        color: "#003049",
        marginBottom: 20,
        fontFamily: "NotoSansThai_700Bold",
    },
    // Date Filter
    dateFilterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    dateNavBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    disabledBtn: {
        opacity: 0.5,
    },
    datePickerBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    dateText: {
        fontSize: 16,
        color: '#003049',
        fontFamily: "NotoSansThai_700Bold",
    },
    todayBtn: {
        backgroundColor: '#003049',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    todayBtnText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: "NotoSansThai_700Bold",
    },
    // Summary
    summaryContainer: {
        flexDirection: 'row',
        backgroundColor: '#D1E6F0',
        borderRadius: 12,
        padding: 15,
        marginBottom: 16,
        justifyContent: 'space-around',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryNumber: {
        fontSize: 24,
        color: '#003049',
        fontFamily: "NotoSansThai_700Bold",
    },
    summaryLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontFamily: "NotoSansThai_400Regular",
    },
    // Card
    card: {
        backgroundColor: "#F3F4F6",
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#D1E6F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    residentIcon: {
        backgroundColor: '#003049',
    },
    textContainer: {
        flex: 1,
    },
    plateText: {
        fontSize: 16,
        color: "#003049",
        fontFamily: "NotoSansThai_700Bold",
    },
    subText: {
        fontSize: 12,
        color: "#4B5563",
        fontFamily: "NotoSansThai_400Regular",
    },
    unitText: {
        fontSize: 11,
        color: "#6B7280",
        fontFamily: "NotoSansThai_400Regular",
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    timeRow: {
        flexDirection: 'row',
        gap: 4,
    },
    timeLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontFamily: "NotoSansThai_400Regular",
    },
    timeValue: {
        fontSize: 11,
        color: '#003049',
        fontFamily: "NotoSansThai_700Bold",
    },
    statusTag: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginTop: 5,
    },
    statusText: {
        fontSize: 10,
        color: '#fff',
        fontFamily: "NotoSansThai_700Bold",
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 15,
        color: '#9CA3AF',
        fontSize: 14,
        fontFamily: "NotoSansThai_400Regular",
    },
    // Modal
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
    closeBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    modalTitle: {
        fontSize: 20,
        color: '#003049',
        marginBottom: 20,
        fontFamily: "NotoSansThai_700Bold",
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
        fontFamily: "NotoSansThai_400Regular",
    },
    modalValue: {
        fontSize: 14,
        color: '#003049',
        fontFamily: "NotoSansThai_700Bold",
    },
    closeModalBtn: {
        marginTop: 25,
        backgroundColor: '#003049',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 10,
    },
    closeModalBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: "NotoSansThai_700Bold",
    },
});

export default EntryHistoryScreen;
