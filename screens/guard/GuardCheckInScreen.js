import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Alert,
    Modal,
    Image,
    ScrollView,
    Switch,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Icon from "react-native-vector-icons/FontAwesome5";
import SecurityService from "../../services/securityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';

const GuardCheckInScreen = ({ navigation }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState("search"); // 'search' | 'result' | 'form'

    // Quick Check-in Modal State (for registered vehicles)
    const [quickCheckInModal, setQuickCheckInModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [quickCheckInLoading, setQuickCheckInLoading] = useState(false);

    // Re-confirmation Modal State
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [confirmPlateInput, setConfirmPlateInput] = useState("");

    // Form Data
    const [formData, setFormData] = useState({
        plate_number: "",
        province: "กรุงเทพมหานคร",
        target_unit_id: "",
        unit_number: "",
        visitor_name: "",
        project_id: "",
        id_card_consent: true,
    });

    const [driverImage, setDriverImage] = useState(null);
    const [carImage, setCarImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleSearch = async () => {
        if (!query) return;
        setLoading(true);
        try {
            const userStr = await AsyncStorage.getItem("userData");
            const user = JSON.parse(userStr);
            const pid = user.projectMemberships?.[0]?.project_id;

            if (!pid) {
                Alert.alert("Error", "No Project ID found");
                return;
            }

            setFormData(prev => ({ ...prev, project_id: pid }));

            const response = await SecurityService.searchVehicles(pid, query);
            if (response.status === "success") {
                setResults(response.data);
                setStep("result");
            }
        } catch (error) {
            Alert.alert("Error", "Search failed");
        } finally {
            setLoading(false);
        }
    };

    // Handle selecting a registered vehicle - show quick check-in dialog
    const handleSelectVehicle = (item) => {
        // Check if this is a registered vehicle (resident or pre-registered/appointment visitor)
        if (item.type === 'resident' || item.type === 'visitor_pre_registered' || item.type === 'visitor' || item.unit_id) {
            // Show quick check-in confirmation dialog
            setSelectedVehicle(item);
            setQuickCheckInModal(true);
        } else {
            // Unknown vehicle - go to form
            setFormData(prev => ({
                ...prev,
                plate_number: item.plate_number,
                visitor_name: item.visitor_name || "",
                target_unit_id: item.unit_id || "",
                unit_number: item.unit_number || "",
            }));
            setStep("form");
        }
    };

    // Quick Check-in: ยืนยันเข้าได้เลยโดยไม่ต้องกรอกข้อมูลซ้ำ
    const handleQuickCheckIn = async () => {
        setQuickCheckInLoading(true);
        try {
            const checkInPayload = {
                plate_number: selectedVehicle.plate_number,
                province: selectedVehicle.province || "กรุงเทพมหานคร",
                target_unit_id: selectedVehicle.unit_id || "",
                unit_number: selectedVehicle.unit_number || "",
                visitor_name: selectedVehicle.visitor_name || "",
                project_id: formData.project_id,
                id_card_consent: 1,
                is_quick_checkin: true,
            };

            const response = await SecurityService.checkIn(checkInPayload);
            if (response.status === "success") {
                setQuickCheckInModal(false);
                navigation.goBack();
                Alert.alert("สำเร็จ", `บันทึกรถเข้าเรียบร้อย\n${selectedVehicle.plate_number}`);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "บันทึกข้อมูลไม่สำเร็จ");
        } finally {
            setQuickCheckInLoading(false);
        }
    };

    // Form flow: Validate plate re-entry and submit
    const handleFormConfirmSubmit = async () => {
        if (!confirmPlateInput) {
            Alert.alert("แจ้งเตือน", "กรุณากรอกเลขทะเบียนเพื่อยืนยัน");
            return;
        }

        const targetPlate = formData.plate_number;

        // Validation: Verify if input matches target plate
        const inputClean = confirmPlateInput.replace(/\s+/g, '').toLowerCase();
        const targetClean = targetPlate.replace(/\s+/g, '').toLowerCase();

        // Allow partial match if input is at least 2 chars
        const isMatch = targetClean.includes(inputClean) && inputClean.length >= 2;

        if (!isMatch) {
            Alert.alert(
                "ข้อมูลไม่ถูกต้อง",
                `เลขทะเบียนที่ระบุ "${confirmPlateInput}" ไม่ตรงกับรายการ "${targetPlate}"`
            );
            return;
        }

        await performFormCheckIn();
    };

    // Actual API Call for Form Check-in
    const performFormCheckIn = async () => {
        setQuickCheckInLoading(true); // Reuse loading state for modal button
        try {
            let driverUrl = null;
            let carUrl = null;

            // Note: If we want to show progress, we might need to handle it better, 
            // but for now reusing the modal loading state.

            if (driverImage) {
                const res = await SecurityService.uploadVisitorImage(formData.project_id, driverImage);
                if (res.status === 'success') {
                    driverUrl = res.data.url;
                }
            }

            if (carImage) {
                const res = await SecurityService.uploadVisitorImage(formData.project_id, carImage);
                if (res.status === 'success') {
                    carUrl = res.data.url;
                }
            }

            const checkInPayload = {
                ...formData,
                image_driver_url: driverUrl,
                image_car_url: carUrl,
                id_card_consent: formData.id_card_consent ? 1 : 0
            };

            const response = await SecurityService.checkIn(checkInPayload);
            if (response.status === "success") {
                setConfirmModalVisible(false);
                Alert.alert("Success", response.message);
                navigation.goBack();
            } else if (response.status === 'require_unit') {
                setConfirmModalVisible(false);
                Alert.alert("Required", "กรุณาระบุบ้านเลขที่ที่มาติดต่อ");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "บันทึกข้อมูลไม่สำเร็จ");
        } finally {
            setQuickCheckInLoading(false);
        }
    };

    const handleSubmitCheckIn = () => {
        if (!formData.plate_number) {
            Alert.alert("Missing Info", "กรุณาระบุเลขทะเบียน");
            return;
        }
        // Open Re-confirmation Modal
        setConfirmPlateInput("");
        setConfirmModalVisible(true);
    };

    const handleGoToForm = () => {
        navigation.navigate('GuardCheckInForm', { formData });
    };

    const takePhoto = async (type) => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert("Required", "ต้องการสิทธิ์การใช้กล้องถ่ายรูป");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
                saveToPhotos: false,
            });

            if (!result.canceled) {
                if (type === 'driver') {
                    setDriverImage(result.assets[0].uri);
                } else {
                    setCarImage(result.assets[0].uri);
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "ไม่สามารถเปิดกล้องได้");
        }
    };

    // Get vehicle type label
    const getVehicleTypeLabel = (type) => {
        switch (type) {
            case 'resident':
                return { text: 'รถลูกบ้าน', color: '#10B981', icon: 'home' };
            case 'visitor_pre_registered':
            case 'visitor':
                return { text: 'ลงทะเบียนล่วงหน้า', color: '#3B82F6', icon: 'calendar-check' };
            default:
                return { text: 'รถภายนอก', color: '#F59E0B', icon: 'car' };
        }
    };

    // Quick Check-in Confirmation Modal
    const renderQuickCheckInModal = () => (
        <Modal
            visible={quickCheckInModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setQuickCheckInModal(false)}
        >
            <View style={styles.quickModalOverlay}>
                <View style={styles.quickModalContainer}>
                    {/* Header */}
                    <View style={styles.quickModalHeader}>
                        <View style={[styles.quickModalIconCircle, { backgroundColor: '#10B98120' }]}>
                            <Icon name="check-circle" size={32} color="#10B981" />
                        </View>
                        <Text style={styles.quickModalTitle}>ยืนยันการเข้าหมู่บ้าน</Text>
                        <Text style={styles.quickModalSubtitle}>พบข้อมูลรถในระบบ</Text>
                    </View>

                    {/* Vehicle Info Card */}
                    {selectedVehicle && (
                        <View style={styles.vehicleInfoCard}>
                            {/* License Plate */}
                            <View style={styles.plateContainer}>
                                <View style={styles.plateBox}>
                                    <Text style={styles.plateText}>{selectedVehicle.plate_number}</Text>
                                </View>
                                {selectedVehicle.province && (
                                    <Text style={styles.provinceText}>{selectedVehicle.province}</Text>
                                )}
                            </View>

                            {/* Vehicle Type Badge */}
                            <View style={[
                                styles.typeBadge,
                                { backgroundColor: getVehicleTypeLabel(selectedVehicle.type).color + '20' }
                            ]}>
                                <Icon
                                    name={getVehicleTypeLabel(selectedVehicle.type).icon}
                                    size={14}
                                    color={getVehicleTypeLabel(selectedVehicle.type).color}
                                />
                                <Text style={[
                                    styles.typeBadgeText,
                                    { color: getVehicleTypeLabel(selectedVehicle.type).color }
                                ]}>
                                    {getVehicleTypeLabel(selectedVehicle.type).text}
                                </Text>
                            </View>

                            {/* Details */}
                            <View style={styles.infoRow}>
                                <Icon name="home" size={14} color="#6B7280" />
                                <Text style={styles.infoText}>
                                    บ้านเลขที่: {selectedVehicle.unit_number || '-'}
                                </Text>
                            </View>

                            {selectedVehicle.visitor_name && (
                                <View style={styles.infoRow}>
                                    <Icon name="user" size={14} color="#6B7280" />
                                    <Text style={styles.infoText}>
                                        ชื่อ: {selectedVehicle.visitor_name}
                                    </Text>
                                </View>
                            )}

                            {selectedVehicle.brand && (
                                <View style={styles.infoRow}>
                                    <Icon name="car" size={14} color="#6B7280" />
                                    <Text style={styles.infoText}>
                                        {selectedVehicle.brand} {selectedVehicle.color ? `(${selectedVehicle.color})` : ''}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Buttons */}
                    <View style={styles.quickModalButtons}>
                        <TouchableOpacity
                            style={styles.quickConfirmButton}
                            onPress={handleQuickCheckIn}
                            disabled={quickCheckInLoading}
                        >
                            {quickCheckInLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Icon name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.quickConfirmText}>ยืนยันรถเข้า (Check-in)</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickEditButton}
                            onPress={handleGoToForm}
                        >
                            <Icon name="edit" size={14} color="#003049" style={{ marginRight: 8 }} />
                            <Text style={styles.quickEditText}>แก้ไข/เพิ่มข้อมูล</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickCancelButton}
                            onPress={() => setQuickCheckInModal(false)}
                        >
                            <Text style={styles.quickCancelText}>ยกเลิก</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Re-confirmation Logic Modal
    const renderConfirmModal = () => (
        <Modal
            visible={confirmModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setConfirmModalVisible(false)}
        >
            {/* Wrap with KeyboardAvoidingView for iOS */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.quickModalOverlay}
            >
                <View style={styles.quickModalContainer}>
                    <View style={styles.quickModalHeader}>
                        <View style={[styles.quickModalIconCircle, { backgroundColor: '#F59E0B20' }]}>
                            <Icon name="shield-alt" size={32} color="#F59E0B" />
                        </View>
                        <Text style={styles.quickModalTitle}>ยืนยันเลขทะเบียนรถ</Text>
                        <Text style={styles.quickModalSubtitle}>
                            กรุณากรอกเลขทะเบียนเพื่อยืนยันความถูกต้อง
                        </Text>
                    </View>

                    <Text style={[styles.label, { textAlign: 'center', marginTop: 10 }]}>
                        ทะเบียนรถที่เลือก: {formData.plate_number}
                    </Text>

                    <TextInput
                        style={[styles.searchInput, { textAlign: 'center', marginVertical: 20 }]}
                        placeholder="กรอกทะเบียนรถอีกครั้ง"
                        value={confirmPlateInput}
                        onChangeText={setConfirmPlateInput}
                        autoFocus={true}
                    />

                    <View style={styles.quickModalButtons}>
                        <TouchableOpacity
                            style={[styles.quickConfirmButton, { backgroundColor: '#1F4E46' }]}
                            onPress={handleFormConfirmSubmit}
                            disabled={quickCheckInLoading}
                        >
                            {quickCheckInLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.quickConfirmText}>ยืนยันรถเข้า (Check-in)</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickCancelButton}
                            onPress={() => {
                                setConfirmModalVisible(false);
                            }}
                        >
                            <Text style={styles.quickCancelText}>ยกเลิก</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );

    // UI Components
    const renderSearchStep = () => (
        <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ตรวจสอบรายการรถเข้าหมู่บ้าน</Text>

            <Text style={styles.label}>กรอกเลขทะเบียนเพื่อตรวจสอบ</Text>
            <Text style={styles.subLabel}>หมวดอักษร:</Text>

            <TextInput
                style={styles.searchInput}
                placeholder="2540"
                value={query}
                onChangeText={setQuery}
                keyboardType="numeric"
                autoFocus
            />
            <Text style={styles.hint}>*กรอกแค่เฉพาะเลขท้ายของทะเบียนรถ</Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Text style={styles.searchButtonText}>ค้นหา</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderResultStep = () => (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setStep('search')} style={styles.backButton}>
                    <Icon name="chevron-left" size={20} color="#003049" />
                    <Text style={styles.backText}>กลับไปค้นหา</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.title}>ผลการค้นหา "{query}"</Text>

            <FlatList
                data={results}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => {
                    const typeInfo = getVehicleTypeLabel(item.type);
                    return (
                        <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectVehicle(item)}>
                            <View style={[styles.resultIconCircle, { backgroundColor: typeInfo.color + '20' }]}>
                                <Icon name={typeInfo.icon} size={18} color={typeInfo.color} />
                            </View>
                            <View style={styles.resultContent}>
                                <Text style={styles.resultTitle}>{item.plate_number}</Text>
                                <Text style={styles.resultSub}>{item.label || typeInfo.text}</Text>
                                {item.unit_number && (
                                    <Text style={styles.resultUnit}>บ้านเลขที่: {item.unit_number}</Text>
                                )}
                            </View>
                            <View style={[styles.resultBadge, { backgroundColor: typeInfo.color }]}>
                                <Text style={styles.resultBadgeText}>
                                    {item.type === 'resident' ? 'ลูกบ้าน' : 'แจ้งล่วงหน้า'}
                                </Text>
                            </View>
                            <Icon name="chevron-right" size={16} color="#9CA3AF" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconWrapper}>
                            <View style={styles.emptyIconCircle}>
                                <Icon name="car" size={40} color="#9CA3AF" />
                            </View>
                            <View style={styles.emptyBadge}>
                                <Icon name="question" size={14} color="#fff" />
                            </View>
                        </View>

                        <Text style={styles.emptyTitle}>ไม่พบข้อมูลรถในระบบ</Text>
                        <Text style={styles.emptySubtitle}>
                            ไม่พบทะเบียน "{query}" ในรายการ{'\n'}
                            คุณสามารถบันทึกเป็นรถภายนอกได้
                        </Text>

                        <TouchableOpacity
                            style={styles.walkInButton}
                            onPress={() => {
                                setFormData(prev => ({ ...prev, plate_number: query }));
                                setStep("form");
                            }}
                        >
                            <Icon name="plus-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.walkInButtonText}>บันทึกเป็นรถภายนอก (Walk-in)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => setStep('search')}
                        >
                            <Text style={styles.retryButtonText}>ค้นหาใหม่</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );

    const renderFormStep = () => (
        <KeyboardAwareScrollView
            contentContainerStyle={styles.container}
            enableOnAndroid={true}
            extraScrollHeight={100}
        >
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => setStep("result")}
                    style={styles.backButton}
                >
                    <Icon name="chevron-left" size={20} color="#003049" />
                    <Text style={styles.backText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.title}>บันทึกข้อมูลรถเข้า</Text>

            <View style={styles.row}>
                <View style={[styles.col, { marginRight: 10 }]}>
                    <Text style={styles.label}>ทะเบียนรถ (เต็ม)</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.plate_number}
                        onChangeText={(text) =>
                            setFormData({ ...formData, plate_number: text })
                        }
                        placeholder="กข 1234"
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.label}>จังหวัด</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.province}
                        onChangeText={(text) =>
                            setFormData({ ...formData, province: text })
                        }
                    />
                </View>
            </View>

            <Text style={styles.sectionHeader}>ภาพถ่าย (Camera Only)</Text>
            <View style={styles.photoContainer}>
                <View style={styles.photoBox}>
                    <Text style={styles.photoLabel}>บัตรประชาชน/คนขับ</Text>
                    <TouchableOpacity
                        onPress={() => takePhoto("driver")}
                        style={styles.photoButton}
                    >
                        {driverImage ? (
                            <Image
                                source={{ uri: driverImage }}
                                style={styles.previewImage}
                            />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Icon name="camera" size={30} color="#6B7280" />
                                <Text style={styles.addPhotoText}>ถ่ายรูป</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.photoBox}>
                    <Text style={styles.photoLabel}>รูปรถ</Text>
                    <TouchableOpacity
                        onPress={() => takePhoto("car")}
                        style={styles.photoButton}
                    >
                        {carImage ? (
                            <Image
                                source={{ uri: carImage }}
                                style={styles.previewImage}
                            />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Icon name="camera" size={30} color="#6B7280" />
                                <Text style={styles.addPhotoText}>ถ่ายรูป</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>ยินยอมให้ถ่ายรูปบัตรประชาชน</Text>
                <Switch
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={formData.id_card_consent ? "#003049" : "#f4f3f4"}
                    onValueChange={(val) =>
                        setFormData({ ...formData, id_card_consent: val })
                    }
                    value={formData.id_card_consent}
                />
            </View>
            <Text style={styles.statusText}>
                สถานะ: {formData.id_card_consent ? "ยินยอม (Yes)" : "ไม่ยินยอม (No)"}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.label}>ชื่อผู้มาติดต่อ (ถ้ามี)</Text>
            <TextInput
                style={styles.input}
                value={formData.visitor_name}
                onChangeText={(text) =>
                    setFormData({ ...formData, visitor_name: text })
                }
            />

            <Text style={styles.label}>บ้านเลขที่ที่ติดต่อ</Text>
            <TextInput
                style={styles.input}
                value={formData.unit_number}
                onChangeText={(text) =>
                    setFormData({
                        ...formData,
                        unit_number: text,
                        target_unit_id: "",
                    })
                }
                placeholder="เช่น 99/99"
            />

            <TouchableOpacity
                style={[styles.submitButton, uploading && styles.disabledButton]}
                onPress={handleSubmitCheckIn}
                disabled={uploading}
            >
                {uploading ? (
                    <Text style={styles.submitButtonText}>กำลังบันทึก...</Text>
                ) : (
                    <Text style={styles.submitButtonText}>บันทึกรถเข้า</Text>
                )}
            </TouchableOpacity>
        </KeyboardAwareScrollView>
    );

    return (
        <>
            {step === "search" && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                >
                    {renderSearchStep()}
                </KeyboardAvoidingView>
            )}
            {step === 'result' && renderResultStep()}
            {step === 'form' && renderFormStep()}

            {/* Quick Check-in Modal */}
            {renderQuickCheckInModal()}
            {/* Re-confirm Modal */}
            {renderConfirmModal()}
        </>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '50%',
    },
    container: {
        flexGrow: 1,
        backgroundColor: "#fff",
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#003049',
        textAlign: 'center',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 5,
        fontWeight: '600'
    },
    subLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 5,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#003049',
        borderRadius: 8,
        padding: 10,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#003049',
    },
    hint: {
        fontSize: 12,
        color: '#EF4444',
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    cancelButton: {
        flex: 0.48,
        borderWidth: 1,
        borderColor: '#003049',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    searchButton: {
        flex: 0.48,
        backgroundColor: '#1F4E46',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#003049',
        fontWeight: 'bold',
    },
    searchButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    // Result Styles
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
        marginLeft: 5,
        color: '#003049'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#003049'
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#fff',
    },
    resultIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    resultContent: {
        flex: 1,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#003049',
    },
    resultSub: {
        fontSize: 12,
        color: '#6B7280',
    },
    resultUnit: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    resultBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    resultBadgeText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold',
    },
    primaryButton: {
        backgroundColor: '#003049',
        padding: 15,
        borderRadius: 8,
    },
    primaryButtonText: {
        color: '#fff',
    },
    // Form Styles
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        color: '#000',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    col: {
        flex: 1,
    },
    submitButton: {
        backgroundColor: '#1F4E46',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40
    },
    disabledButton: {
        backgroundColor: '#9CA3AF',
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 10,
        color: '#003049'
    },
    photoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    photoBox: {
        width: '48%',
        alignItems: 'center',
    },
    photoLabel: {
        fontSize: 12,
        marginBottom: 5,
        color: '#4B5563'
    },
    photoButton: {
        width: '100%',
        height: 120,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    photoPlaceholder: {
        alignItems: 'center',
    },
    addPhotoText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 5,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    toggleLabel: {
        fontSize: 14,
        color: '#374151',
    },
    statusText: {
        fontSize: 12,
        color: '#4B5563',
        textAlign: 'right',
        marginBottom: 15,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 15,
    },
    // Empty State Styles
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyIconWrapper: {
        position: 'relative',
        marginBottom: 20,
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    emptyBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    walkInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1F4E46',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        shadowColor: '#1F4E46',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    walkInButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    retryButton: {
        marginTop: 16,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    retryButtonText: {
        color: '#6B7280',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    // Quick Check-in Modal Styles
    quickModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    quickModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    quickModalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    quickModalIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    quickModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    quickModalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    vehicleInfoCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    plateContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    plateBox: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#003049',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 24,
        marginBottom: 4,
    },
    plateText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#003049',
        letterSpacing: 2,
    },
    provinceText: {
        fontSize: 12,
        color: '#6B7280',
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 12,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#374151',
        marginLeft: 8,
    },
    quickModalButtons: {
        gap: 10,
    },
    quickConfirmButton: {
        flexDirection: 'row',
        backgroundColor: '#10B981',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    quickConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    quickEditButton: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#003049',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickEditText: {
        color: '#003049',
        fontSize: 14,
        fontWeight: '600',
    },
    quickCancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    quickCancelText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
});

export default GuardCheckInScreen;
