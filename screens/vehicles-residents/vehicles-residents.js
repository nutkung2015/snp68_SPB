import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    FlatList,
    ActivityIndicator,
    Alert,
    Platform,
    Switch,
    Modal,
    TextInput,
    KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import VehicleService from "../../services/vehicleService";
import ProjectCustomizationsService from "../../services/projectCustomizationsService";

const VehiclesResidentsScreen = ({ navigation, route }) => {


    // States
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unitId, setUnitId] = useState(route?.params?.unitId || null);
    const [primaryColor, setPrimaryColor] = useState("#2A405E");

    // Add Vehicle Modal States
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [newVehicle, setNewVehicle] = useState({
        plate_number: "",
        type: "car", // 'car' or 'motorcycle'
        province: "",
        brand: "",
        color: "",
        is_active: false,
    });

    // History Modal States
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Fetch project customizations
    const fetchProjectCustomizations = async (projectId) => {
        try {
            const response = await ProjectCustomizationsService.getProjectCustomizations(projectId);
            if (response && response.primary_color) {
                setPrimaryColor(response.primary_color);
            }
        } catch (err) {
            console.error("Error fetching project customizations:", err);
        }
    };

    // Fetch vehicles
    const fetchVehicles = async (unitIdParam) => {
        try {
            setLoading(true);
            setError(null);
            const response = await VehicleService.getUnitVehicles(unitIdParam);

            if (response && response.status === "success") {
                setVehicles(response.data || []);
            } else {
                setVehicles([]);
            }
        } catch (err) {
            console.error("Error fetching vehicles:", err);
            setError("ไม่สามารถโหลดข้อมูลรถได้");
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
                    await fetchVehicles(route.params.unitId);
                } else {
                    // Otherwise get from AsyncStorage
                    const storedUserData = await AsyncStorage.getItem("userData");
                    if (storedUserData) {
                        const userData = JSON.parse(storedUserData);
                        if (userData?.unitMemberships?.[0]?.unit_id) {
                            const currentUnitId = userData.unitMemberships[0].unit_id;
                            setUnitId(currentUnitId);
                            await fetchVehicles(currentUnitId);
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

    // Handle toggle active
    const handleToggleActive = async (vehicle) => {
        try {
            await VehicleService.setActiveVehicle(unitId, vehicle.id, !vehicle.is_active);
            // Refresh list
            await fetchVehicles(unitId);
        } catch (err) {
            console.error("Error toggling active:", err);
            Alert.alert("ผิดพลาด", "ไม่สามารถเปลี่ยนสถานะได้");
        }
    };

    // Handle add vehicle
    const handleAddVehicle = async () => {
        if (!newVehicle.plate_number.trim()) {
            Alert.alert("ผิดพลาด", "กรุณากรอกทะเบียนรถ");
            return;
        }

        try {
            setAddLoading(true);
            await VehicleService.addVehicle(unitId, {
                plate_number: newVehicle.plate_number.trim(),
                type: newVehicle.type,
                province: newVehicle.province.trim() || null,
                brand: newVehicle.brand.trim() || null,
                color: newVehicle.color.trim() || null,
                is_active: newVehicle.is_active,
            });

            // Reset form and close modal
            setNewVehicle({
                plate_number: "",
                type: "car",
                province: "",
                brand: "",
                color: "",
                is_active: false,
            });
            setAddModalVisible(false);

            // Refresh list
            await fetchVehicles(unitId);
            Alert.alert("สำเร็จ", "เพิ่มรถเรียบร้อยแล้ว");
        } catch (err) {
            console.error("Error adding vehicle:", err);
            if (err.message?.includes("already registered")) {
                Alert.alert("ผิดพลาด", "ทะเบียนรถนี้มีอยู่ในระบบแล้ว");
            } else {
                Alert.alert("ผิดพลาด", "ไม่สามารถเพิ่มรถได้");
            }
        } finally {
            setAddLoading(false);
        }
    };

    // Handle remove vehicle
    const handleRemoveVehicle = (vehicle) => {
        Alert.alert(
            "ยืนยันการลบ",
            `คุณต้องการลบรถทะเบียน ${vehicle.plate_number} หรือไม่?`,
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ลบ",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await VehicleService.removeVehicle(unitId, vehicle.id);
                            await fetchVehicles(unitId);
                            Alert.alert("สำเร็จ", "ลบรถเรียบร้อยแล้ว");
                        } catch (err) {
                            Alert.alert("ผิดพลาด", "ไม่สามารถลบรถได้");
                        }
                    },
                },
            ]
        );
    };

    // Fetch vehicle history
    const fetchVehicleHistory = async () => {
        if (!unitId) return;
        try {
            setHistoryLoading(true);
            const response = await VehicleService.getVehicleHistory(unitId);
            if (response && response.status === "success") {
                setHistoryData(response.data || []);
            } else {
                setHistoryData([]);
            }
        } catch (err) {
            console.error("Error fetching vehicle history:", err);
            Alert.alert("ผิดพลาด", "ไม่สามารถโหลดประวัติรถได้");
        } finally {
            setHistoryLoading(false);
        }
    };

    // Open history modal
    const openHistoryModal = () => {
        setHistoryModalVisible(true);
        fetchVehicleHistory();
    };

    // Render vehicle item
    const renderVehicleItem = (vehicle, index) => {
        return (
            <View
                key={vehicle.id || index}
                style={[
                    styles.vehicleItem,
                    index === 0 && styles.vehicleItemFirst,
                    index === vehicles.length - 1 && styles.vehicleItemLast,
                ]}
            >
                {/* Vehicle Icon - based on type */}
                <View style={[styles.vehicleIconContainer, { backgroundColor: primaryColor + "20" }]}>
                    <Ionicons
                        name={vehicle.type === 'motorcycle' ? 'bicycle' : 'car'}
                        size={28}
                        color={primaryColor}
                    />
                </View>

                {/* Vehicle Info */}
                <View style={styles.vehicleInfo}>
                    <View style={styles.vehiclePlateRow}>
                        <Text style={styles.vehiclePlate}>{vehicle.plate_number}</Text>
                        <View style={[styles.vehicleTypeBadge, { backgroundColor: vehicle.type === 'motorcycle' ? '#FF9800' : primaryColor }]}>
                            <Text style={styles.vehicleTypeBadgeText}>
                                {vehicle.type === 'motorcycle' ? 'มอไซค์' : 'รถยนต์'}
                            </Text>
                        </View>
                    </View>
                    {vehicle.province && (
                        <Text style={styles.vehicleProvince}>จังหวัด: {vehicle.province}</Text>
                    )}
                    {vehicle.brand && (
                        <Text style={styles.vehicleBrand}>ยี่ห้อ: {vehicle.brand}</Text>
                    )}
                    {vehicle.color && (
                        <Text style={styles.vehicleColor}>สี: {vehicle.color}</Text>
                    )}
                </View>

                {/* Active Toggle */}
                <View style={styles.toggleContainer}>
                    <Text style={styles.toggleLabel}>
                        {vehicle.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </Text>
                    <Switch
                        value={vehicle.is_active}
                        onValueChange={() => handleToggleActive(vehicle)}
                        trackColor={{ false: "#ddd", true: primaryColor + "80" }}
                        thumbColor={vehicle.is_active ? primaryColor : "#f4f3f4"}
                    />
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
            <Text style={styles.pageTitle}>รถของฉัน</Text>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: primaryColor }]}
                    onPress={() => setAddModalVisible(true)}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionButtonText}>เพิ่มรถเข้ากับบ้าน</Text>
                        <Text style={styles.actionButtonSubtext}>ลงทะเบียนรถ</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: primaryColor }]}
                    onPress={openHistoryModal}
                >
                    <Ionicons name="time" size={24} color="#fff" />
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionButtonText}>ประวัติการเพิ่มรถ</Text>
                        <Text style={styles.actionButtonSubtext}>ดูประวัติ</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Vehicles Section */}
            <Text style={styles.sectionTitle}>รายการรถของฉัน</Text>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: primaryColor }]}
                        onPress={() => unitId && fetchVehicles(unitId)}
                    >
                        <Text style={styles.retryText}>ลองใหม่</Text>
                    </TouchableOpacity>
                </View>
            ) : vehicles.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="car-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>ไม่มีรถที่ลงทะเบียน</Text>
                    <Text style={styles.emptySubtext}>กดปุ่ม "เพิ่มรถเข้ากับบ้าน" เพื่อเพิ่มรถ</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.vehicleList}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.vehicleCard}>
                        {vehicles.map((vehicle, index) => renderVehicleItem(vehicle, index))}
                    </View>
                </ScrollView>
            )}

            {/* Add Vehicle Modal */}
            <Modal
                visible={addModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                                    <Text style={[styles.modalCancelText, { color: primaryColor }]}>ยกเลิก</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>เพิ่มรถใหม่</Text>
                                <View style={{ width: 50 }} />
                            </View>

                            <ScrollView style={styles.modalContent}>
                                {/* Plate Number */}
                                <Text style={[styles.inputLabel, { color: primaryColor }]}>ทะเบียนรถ *</Text>
                                <TextInput
                                    style={[styles.textInput, { borderColor: primaryColor }]}
                                    placeholder="เช่น กข 1234"
                                    placeholderTextColor="#999"
                                    value={newVehicle.plate_number}
                                    onChangeText={(text) =>
                                        setNewVehicle({ ...newVehicle, plate_number: text })
                                    }
                                />

                                {/* Vehicle Type Selector */}
                                <Text style={[styles.inputLabel, { color: primaryColor }]}>ประเภทรถ *</Text>
                                <View style={styles.typeSelector}>
                                    <TouchableOpacity
                                        style={[
                                            styles.typeOption,
                                            newVehicle.type === 'car' && { backgroundColor: primaryColor, borderColor: primaryColor },
                                        ]}
                                        onPress={() => setNewVehicle({ ...newVehicle, type: 'car' })}
                                    >
                                        <Ionicons
                                            name="car"
                                            size={24}
                                            color={newVehicle.type === 'car' ? '#fff' : '#666'}
                                        />
                                        <Text style={[
                                            styles.typeOptionText,
                                            newVehicle.type === 'car' && { color: '#fff' }
                                        ]}>
                                            รถยนต์
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.typeOption,
                                            newVehicle.type === 'motorcycle' && { backgroundColor: '#FF9800', borderColor: '#FF9800' },
                                        ]}
                                        onPress={() => setNewVehicle({ ...newVehicle, type: 'motorcycle' })}
                                    >
                                        <Ionicons
                                            name="bicycle"
                                            size={24}
                                            color={newVehicle.type === 'motorcycle' ? '#fff' : '#666'}
                                        />
                                        <Text style={[
                                            styles.typeOptionText,
                                            newVehicle.type === 'motorcycle' && { color: '#fff' }
                                        ]}>
                                            มอไซค์
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Province */}
                                <Text style={[styles.inputLabel, { color: primaryColor }]}>จังหวัด (ไม่บังคับ)</Text>
                                <TextInput
                                    style={[styles.textInput, { borderColor: primaryColor }]}
                                    placeholder="เช่น กรุงเทพมหานคร"
                                    placeholderTextColor="#999"
                                    value={newVehicle.province}
                                    onChangeText={(text) =>
                                        setNewVehicle({ ...newVehicle, province: text })
                                    }
                                />

                                {/* Brand */}
                                <Text style={[styles.inputLabel, { color: primaryColor }]}>ยี่ห้อ (ไม่บังคับ)</Text>
                                <TextInput
                                    style={[styles.textInput, { borderColor: primaryColor }]}
                                    placeholder="เช่น Toyota"
                                    placeholderTextColor="#999"
                                    value={newVehicle.brand}
                                    onChangeText={(text) =>
                                        setNewVehicle({ ...newVehicle, brand: text })
                                    }
                                />

                                {/* Color */}
                                <Text style={[styles.inputLabel, { color: primaryColor }]}>สี (ไม่บังคับ)</Text>
                                <TextInput
                                    style={[styles.textInput, { borderColor: primaryColor }]}
                                    placeholder="เช่น ขาว"
                                    placeholderTextColor="#999"
                                    value={newVehicle.color}
                                    onChangeText={(text) =>
                                        setNewVehicle({ ...newVehicle, color: text })
                                    }
                                />

                                {/* Active Toggle */}
                                <View style={styles.activeRow}>
                                    <Text style={[styles.inputLabel, { color: primaryColor, marginTop: 0 }]}>ตั้งเป็นรถใช้งาน</Text>
                                    <Switch
                                        value={newVehicle.is_active}
                                        onValueChange={(value) =>
                                            setNewVehicle({ ...newVehicle, is_active: value })
                                        }
                                        trackColor={{ false: "#ddd", true: primaryColor + "80" }}
                                        thumbColor={
                                            newVehicle.is_active ? primaryColor : "#f4f3f4"
                                        }
                                    />
                                </View>
                            </ScrollView>

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    { backgroundColor: primaryColor },
                                ]}
                                onPress={handleAddVehicle}
                                disabled={addLoading}
                            >
                                {addLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.submitButtonText}>เพิ่มรถ</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* History Modal */}
            <Modal
                visible={historyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setHistoryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { maxHeight: "85%" }]}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                                <Text style={[styles.modalCancelText, { color: primaryColor }]}>ปิด</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>ประวัติการเพิ่มรถ</Text>
                            <View style={{ width: 50 }} />
                        </View>

                        {/* History Content */}
                        {historyLoading ? (
                            <View style={styles.historyLoadingContainer}>
                                <ActivityIndicator size="large" color={primaryColor} />
                                <Text style={styles.historyLoadingText}>กำลังโหลดประวัติ...</Text>
                            </View>
                        ) : historyData.length === 0 ? (
                            <View style={styles.historyEmptyContainer}>
                                <Ionicons name="car-outline" size={50} color="#ccc" />
                                <Text style={styles.historyEmptyText}>ยังไม่มีประวัติรถ</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={historyData}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={{ padding: 16 }}
                                renderItem={({ item, index }) => (
                                    <View style={styles.historyItem}>
                                        {/* Timeline dot */}
                                        <View style={styles.historyTimeline}>
                                            <View style={[styles.historyDot, { backgroundColor: item.is_active ? primaryColor : "#ccc" }]} />
                                            {index < historyData.length - 1 && <View style={styles.historyLine} />}
                                        </View>
                                        {/* Card */}
                                        <View style={[styles.historyCard, item.is_active && { borderLeftColor: primaryColor, borderLeftWidth: 3 }]}>
                                            <View style={styles.historyCardHeader}>
                                                <Ionicons
                                                    name={item.type === 'motorcycle' ? 'bicycle' : 'car'}
                                                    size={20}
                                                    color={primaryColor}
                                                />
                                                <Text style={styles.historyPlateText}>{item.plate_number}</Text>
                                                <View style={[styles.historyTypeBadge, { backgroundColor: item.type === 'motorcycle' ? '#FF9800' : primaryColor }]}>
                                                    <Text style={styles.historyTypeBadgeText}>
                                                        {item.type === 'motorcycle' ? 'มอไซค์' : 'รถยนต์'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.historyCardBody}>
                                                {item.brand && <Text style={styles.historyDetailText}>ยี่ห้อ: {item.brand}</Text>}
                                                {item.color && <Text style={styles.historyDetailText}>สี: {item.color}</Text>}
                                                {item.province && <Text style={styles.historyDetailText}>จังหวัด: {item.province}</Text>}
                                            </View>
                                            <View style={styles.historyCardFooter}>
                                                <Ionicons name="calendar-outline" size={14} color="#999" />
                                                <Text style={styles.historyDateText}>
                                                    เพิ่มเมื่อ: {new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                                {item.is_active && (
                                                    <View style={[styles.historyActiveBadge, { backgroundColor: primaryColor + "20" }]}>
                                                        <Text style={[styles.historyActiveText, { color: primaryColor }]}>ใช้งานอยู่</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
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
    actionContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 24,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 10,
        minHeight: 56,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionButtonText: {
        fontSize: 14,
        fontFamily: "NotoSansThai_500Medium",
        color: "#fff",
    },
    actionButtonSubtext: {
        fontSize: 12,
        fontFamily: "NotoSansThai_400Regular",
        color: "rgba(255, 255, 255, 0.8)",
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: "NotoSansThai_500Medium",
        color: "#666",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    vehicleList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    vehicleCard: {
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
    vehicleItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    vehicleItemFirst: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    vehicleItemLast: {
        borderBottomWidth: 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    vehicleIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    vehicleInfo: {
        flex: 1,
    },
    vehiclePlate: {
        fontSize: 16,
        fontFamily: "NotoSansThai_500Medium",
        color: "#333",
    },
    vehiclePlateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    vehicleTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    vehicleTypeBadgeText: {
        fontSize: 10,
        fontFamily: "NotoSansThai_500Medium",
        color: "#fff",
    },
    vehicleProvince: {
        fontSize: 13,
        fontFamily: "NotoSansThai_400Regular",
        color: "#666",
        marginTop: 2,
    },
    vehicleBrand: {
        fontSize: 13,
        fontFamily: "NotoSansThai_400Regular",
        color: "#666",
        marginTop: 2,
    },
    vehicleColor: {
        fontSize: 12,
        fontFamily: "NotoSansThai_400Regular",
        color: "#999",
        marginTop: 2,
    },
    toggleContainer: {
        alignItems: "flex-end",
    },
    toggleLabel: {
        fontSize: 12,
        fontFamily: "NotoSansThai_400Regular",
        color: "#666",
        marginBottom: 4,
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    modalCancelText: {
        fontSize: 16,
        fontFamily: "NotoSansThai_400Regular",
        color: "#666",
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: "NotoSansThai_500Medium",
        color: "#333",
    },
    modalContent: {
        padding: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: "NotoSansThai_500Medium",
        color: "#333",
        marginBottom: 8,
        marginTop: 16,
    },
    textInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: "NotoSansThai_400Regular",
        backgroundColor: "#fafafa",
    },
    activeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
        marginBottom: 20,
    },
    typeSelector: {
        flexDirection: "row",
        gap: 12,
    },
    typeOption: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fafafa",
    },
    typeOptionText: {
        fontSize: 14,
        fontFamily: "NotoSansThai_500Medium",
        color: "#666",
    },
    submitButton: {
        margin: 16,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    submitButtonText: {
        fontSize: 16,
        fontFamily: "NotoSansThai_500Medium",
        color: "#fff",
    },
    // History Modal Styles
    historyLoadingContainer: {
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    historyLoadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: "NotoSansThai_400Regular",
        color: "#666",
    },
    historyEmptyContainer: {
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    historyEmptyText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: "NotoSansThai_400Regular",
        color: "#999",
    },
    historyItem: {
        flexDirection: "row",
        marginBottom: 4,
    },
    historyTimeline: {
        alignItems: "center",
        width: 30,
        paddingTop: 6,
    },
    historyDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    historyLine: {
        width: 2,
        flex: 1,
        backgroundColor: "#E0E0E0",
        marginTop: 4,
    },
    historyCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    historyCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    historyPlateText: {
        fontSize: 16,
        fontFamily: "NotoSansThai_600SemiBold",
        color: "#333",
        flex: 1,
    },
    historyTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    historyTypeBadgeText: {
        fontSize: 10,
        fontFamily: "NotoSansThai_500Medium",
        color: "#fff",
    },
    historyCardBody: {
        marginBottom: 8,
    },
    historyDetailText: {
        fontSize: 13,
        fontFamily: "NotoSansThai_400Regular",
        color: "#666",
        marginTop: 2,
    },
    historyCardFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: "#f5f5f5",
        paddingTop: 8,
    },
    historyDateText: {
        fontSize: 12,
        fontFamily: "NotoSansThai_400Regular",
        color: "#999",
        flex: 1,
    },
    historyActiveBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    historyActiveText: {
        fontSize: 11,
        fontFamily: "NotoSansThai_500Medium",
    },
});

export default VehiclesResidentsScreen;