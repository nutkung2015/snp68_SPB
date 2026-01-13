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
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import SecurityService from "../../services/securityService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';

const GuardCheckInScreen = ({ navigation }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState("search"); // 'search' | 'result' | 'form'

    // Form Data
    const [formData, setFormData] = useState({
        plate_number: "",
        province: "กรุงเทพมหานคร",
        target_unit_id: "",
        unit_number: "",
        visitor_name: "",
        project_id: "",
        id_card_consent: true, // Default Yes
    });

    const [driverImage, setDriverImage] = useState(null);
    const [carImage, setCarImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleSearch = async () => {
        if (!query) return;
        setLoading(true);
        try {
            // Get Project ID
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

    const handleSelectVehicle = (item) => {
        setFormData(prev => ({
            ...prev,
            plate_number: item.plate_number,
            visitor_name: item.visitor_name || "",
            target_unit_id: item.unit_id || "",
            unit_number: item.unit_number || "",
        }));
        setStep("form");
    };

    const takePhoto = async (type) => {
        try {
            // Request permissions first
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
                saveToPhotos: false, // Security: Don't save to gallery
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

    const handleSubmitCheckIn = async () => {
        if (!formData.plate_number) {
            Alert.alert("Missing Info", "กรุณาระบุเลขทะเบียน");
            return;
        }

        setUploading(true);
        try {
            let driverUrl = null;
            let carUrl = null;

            // Upload Driver Image
            if (driverImage) {
                const res = await SecurityService.uploadVisitorImage(formData.project_id, driverImage);
                if (res.status === 'success') {
                    driverUrl = res.data.url;
                }
            }

            // Upload Car Image
            if (carImage) {
                const res = await SecurityService.uploadVisitorImage(formData.project_id, carImage);
                if (res.status === 'success') {
                    carUrl = res.data.url;
                }
            }

            // Submit Check In
            const checkInPayload = {
                ...formData,
                image_driver_url: driverUrl,
                image_car_url: carUrl,
                // Ensure consent is boolean/integer as needed by backend
                id_card_consent: formData.id_card_consent ? 1 : 0
            };

            const response = await SecurityService.checkIn(checkInPayload);
            if (response.status === "success") {
                Alert.alert("Success", response.message);
                navigation.goBack();
            } else if (response.status === 'require_unit') {
                Alert.alert("Required", "กรุณาระบุบ้านเลขที่ที่มาติดต่อ");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "บันทึกข้อมูลไม่สำเร็จ");
        } finally {
            setUploading(false);
        }
    };

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
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectVehicle(item)}>
                        <Icon name="car" size={20} color="#003049" style={{ marginRight: 10 }} />
                        <View>
                            <Text style={styles.resultTitle}>{item.plate_number}</Text>
                            <Text style={styles.resultSub}>{item.label}</Text>
                        </View>
                        <Icon name="chevron-right" size={16} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {/* Illustration */}
                        <View style={styles.emptyIconWrapper}>
                            <View style={styles.emptyIconCircle}>
                                <Icon name="car" size={40} color="#9CA3AF" />
                            </View>
                            <View style={styles.emptyBadge}>
                                <Icon name="question" size={14} color="#fff" />
                            </View>
                        </View>

                        {/* Text */}
                        <Text style={styles.emptyTitle}>ไม่พบข้อมูลรถในระบบ</Text>
                        <Text style={styles.emptySubtitle}>
                            ไม่พบทะเบียน "{query}" ในรายการ{'\n'}
                            คุณสามารถบันทึกเป็นรถภายนอกได้
                        </Text>

                        {/* CTA Button */}
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

                        {/* Secondary action */}
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
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setStep('result')} style={styles.backButton}>
                    <Icon name="chevron-left" size={20} color="#003049" />
                    <Text style={styles.backText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.title}>บันทึกข้อมูลรถเข้า</Text>

            {/* License Plate & Province */}
            <View style={styles.row}>
                <View style={[styles.col, { marginRight: 10 }]}>
                    <Text style={styles.label}>ทะเบียนรถ (เต็ม)</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.plate_number}
                        onChangeText={(text) => setFormData({ ...formData, plate_number: text })}
                        placeholder="กข 1234"
                    />
                </View>
                <View style={styles.col}>
                    <Text style={styles.label}>จังหวัด</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.province}
                        onChangeText={(text) => setFormData({ ...formData, province: text })}
                    />
                </View>
            </View>

            {/* Photos */}
            <Text style={styles.sectionHeader}>ภาพถ่าย (Camera Only)</Text>
            <View style={styles.photoContainer}>
                {/* Driver / ID Card Photo */}
                <View style={styles.photoBox}>
                    <Text style={styles.photoLabel}>บัตรประชาชน/คนขับ</Text>
                    <TouchableOpacity onPress={() => takePhoto('driver')} style={styles.photoButton}>
                        {driverImage ? (
                            <Image source={{ uri: driverImage }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Icon name="camera" size={30} color="#6B7280" />
                                <Text style={styles.addPhotoText}>ถ่ายรูป</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Car Photo */}
                <View style={styles.photoBox}>
                    <Text style={styles.photoLabel}>รูปรถ</Text>
                    <TouchableOpacity onPress={() => takePhoto('car')} style={styles.photoButton}>
                        {carImage ? (
                            <Image source={{ uri: carImage }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Icon name="camera" size={30} color="#6B7280" />
                                <Text style={styles.addPhotoText}>ถ่ายรูป</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Consent Toggle */}
            <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>ยินยอมให้ถ่ายรูปบัตรประชาชน</Text>
                <Switch
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={formData.id_card_consent ? "#003049" : "#f4f3f4"}
                    onValueChange={(val) => setFormData({ ...formData, id_card_consent: val })}
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
                onChangeText={(text) => setFormData({ ...formData, visitor_name: text })}
            />

            <Text style={styles.label}>บ้านเลขที่ที่ติดต่อ</Text>
            <TextInput
                style={styles.input}
                value={formData.unit_number}
                onChangeText={(text) => setFormData({ ...formData, unit_number: text, target_unit_id: "" })}
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
                    <Text style={styles.submitButtonText}>บันทึก (Check-in)</Text>
                )}
            </TouchableOpacity>

        </ScrollView>
    );

    if (step === 'search') {
        return (
            <View style={styles.modalContainer}>
                {renderSearchStep()}
            </View>
        );
    } else if (step === 'result') {
        return renderResultStep();
    } else {
        return renderFormStep();
    }
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
        flexGrow: 1, // for scrollView
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
});

export default GuardCheckInScreen;
