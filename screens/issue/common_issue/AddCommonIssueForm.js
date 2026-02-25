import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    ScrollView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
    Image,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import IssueService from "../../../services/issueService";
import ProjectCustomizationsService from "../../../services/projectCustomizationsService";

const ISSUE_TYPES = [
    { id: "1", name: "ทรัพย์สินและสาธารณูปโภค", value: "AssetsFacilities" },
    { id: "2", name: "การอยู่อาศัยและระเบียบข้อบังคับ", value: "LivingRegulations" },
];

export default function AddCommonIssueForm({ navigation }) {
    const [userData, setUserData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [primaryColor, setPrimaryColor] = useState("#2A405E");

    // Load user data from AsyncStorage
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const userDataString = await AsyncStorage.getItem("userData");
                if (userDataString) {
                    const user = JSON.parse(userDataString);
                    setUserData(user);

                    // Get unit number from unitMemberships if available
                    const unitNumber = user.unitMemberships?.[0]?.unit_number || "";

                    // Update form data with user info
                    setFormData((prev) => ({
                        ...prev,
                        houseNumber: unitNumber,
                        zone: user.projectMemberships?.[0]?.project_name || "",
                        reporterName: user.full_name || "",
                    }));

                    // Fetch project customizations
                    const projectId = user.projectMemberships?.[0]?.project_id;
                    if (projectId) {
                        try {
                            const customizations = await ProjectCustomizationsService.getProjectCustomizations(projectId);
                            if (customizations && customizations.primary_color) {
                                setPrimaryColor(customizations.primary_color);
                            }
                        } catch (err) {
                            console.error("Error fetching customizations:", err);
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading user data:", error);
            }
        };

        loadUserData();
    }, []);

    const [formData, setFormData] = useState({
        houseNumber: "",
        zone: "",
        reporterName: "",
        reportDate: new Date(),
        location: "",
        issueType: "",
        description: "",
        images: [],
    });

    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // ฟังก์ชันจัดการการเปลี่ยนแปลงข้อมูลในฟอร์ม
    const handleInputChange = (name, value) => {
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    // ฟังก์ชันจัดการการเลือกประเภทปัญหา
    const handleSelectType = (type) => {
        handleInputChange("issueType", type.value);
        setShowTypePicker(false);
    };

    // Function to compress image
    const compressImage = async (uri) => {
        try {
            const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1024 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            return manipResult.uri;
        } catch (err) {
            console.error("Error compressing image:", err);
            return uri;
        }
    };

    // ฟังก์ชันอัปโหลดรูปภาพ
    const pickImage = async () => {
        try {
            const { status } =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== "granted") {
                Alert.alert("ขออภัย", "เราต้องการสิทธิ์ในการเข้าถึงรูปภาพของคุณ");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // ปิดการแก้ไขเพื่อลดการใช้ RAM
                quality: 0.5, // ลดคุณภาพรูปลงเพื่อป้องกัน Crash
            });

            if (!result.canceled && result.assets[0].uri) {
                const compressedUri = await compressImage(result.assets[0].uri);
                setFormData((prev) => ({
                    ...prev,
                    images: [...prev.images, compressedUri],
                }));
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "ไม่สามารถเลือกรูปภาพได้");
        }
    };

    // ฟังก์ชันลบรูปภาพ
    const removeImage = (index) => {
        const newImages = [...formData.images];
        newImages.splice(index, 1);
        setFormData({
            ...formData,
            images: newImages,
        });
    };

    // ฟังก์ชันส่งแบบฟอร์ม
    const handleSubmit = async () => {
        if (isSubmitting) return; // Prevent double submission

        if (!formData.issueType || !formData.description || !formData.location) {
            Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        try {
            setIsSubmitting(true);
            console.log("Starting form submission...");
            console.log("User Data:", userData);

            const base64Images = await IssueService.convertImagesToBase64(
                formData.images
            );
            console.log("Images converted:", base64Images.length);

            const payload = {
                project_id: userData?.projectMemberships?.[0]?.project_id,
                unit_id: userData?.unitMemberships?.[0]?.unit_id,
                zone: formData.zone,
                issue_type: formData.issueType,
                location: formData.location,
                description: formData.description,
                image_urls: base64Images,
                priority: "medium",
            };

            console.log("Payload:", payload);

            const response = await IssueService.createCommonIssue(payload);
            console.log("API Response:", response);

            if (response.status === "success") {
                setShowSuccessModal(true);
            } else {
                Alert.alert("แจ้งเตือน", response.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
            }
        } catch (error) {
            console.error("Submit Error:", error);
            Alert.alert(
                "Error",
                `ไม่สามารถส่งแบบฟอร์มได้: ${error.message || "กรุณาลองใหม่อีกครั้ง"}`
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add ImagePreview component
    const ImagePreview = ({ uri, onRemove }) => (
        <View style={styles.imagePreviewContainer}>
            <Image source={{ uri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeImageButton} onPress={onRemove}>
                <MaterialIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    // เพิ่มฟังก์ชัน formatDate
    const formatDate = (date) => {
        if (!date) return "";
        return date.toLocaleDateString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="black" />
                    <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.headerSecond}>
                <Text style={styles.headerTitle}>แจ้งปัญหาส่วนกลาง</Text>
            </View>

            <KeyboardAwareScrollView
                style={styles.formContainer}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
                enableAutomaticScroll={true}
            >
                {/* บ้านเลขที่ */}
                <View style={styles.inputGroup_normalText}>
                    <Text style={styles.label_normalText}>บ้านเลขที่</Text>
                    <Text style={styles.valueText_normalText}>{formData.houseNumber}</Text>
                </View>

                {/* โซน */}
                <View style={styles.inputGroup_normalText}>
                    <Text style={styles.label_normalText}>โซน</Text>
                    <Text style={styles.valueText_normalText}>{formData.zone}</Text>
                </View>

                {/* ชื่อผู้แจ้ง */}
                <View style={styles.inputGroup_normalText}>
                    <Text style={styles.label_normalText}>ชื่อผู้แจ้ง</Text>
                    <Text style={styles.valueText_normalText}>{formData.reporterName}</Text>
                </View>

                {/* วันที่ยื่น (อัตโนมัติ) */}
                <View style={styles.inputGroup_normalText}>
                    <Text style={styles.label_normalText}>วันที่ยื่น</Text>
                    <Text style={styles.valueText_normalText}>
                        {formatDate(formData.reportDate)}
                    </Text>
                </View>

                {/* สถานที่พบปัญหา */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>สถานที่พบปัญหา</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="ระบุสถานที่พบปัญหา"
                            placeholderTextColor="#999"
                            value={formData.location}
                            onChangeText={(text) => handleInputChange("location", text)}
                        />
                    </View>
                </View>

                {/* ประเภทปัญหา */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ประเภทปัญหา</Text>
                    <TouchableOpacity
                        style={[
                            styles.inputContainer,
                            !formData.issueType && styles.placeholderContainer,
                        ]}
                        onPress={() => setShowTypePicker(true)}
                    >
                        <Text
                            style={[
                                styles.input,
                                !formData.issueType && styles.placeholderText,
                            ]}
                        >
                            {formData.issueType || "เลือกประเภทปัญหา"}
                        </Text>
                        <MaterialIcons
                            name="keyboard-arrow-down"
                            size={24}
                            color="#666"
                        />
                    </TouchableOpacity>
                </View>

                {/* รายละเอียดปัญหา */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>รายละเอียดปัญหา</Text>
                    <View style={[styles.inputContainer, styles.textAreaContainer]}>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="อธิบายรายละเอียดปัญหา"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            value={formData.description}
                            onChangeText={(text) => handleInputChange("description", text)}
                        />
                    </View>
                </View>

                {/* อัปโหลดรูปภาพ */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>รูปภาพประกอบ (ไม่บังคับ)</Text>
                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={pickImage}
                        disabled={formData.images.length >= 5}
                    >
                        <MaterialIcons
                            name="add-photo-alternate"
                            size={24}
                            color="#205248"
                        />
                        <Text style={styles.uploadButtonText}>
                            อัปโหลดรูปภาพ {formData.images.length}/5
                        </Text>
                    </TouchableOpacity>

                    <ScrollView horizontal style={styles.imagePreviewScroll}>
                        {formData.images.map((uri, index) => (
                            <ImagePreview
                                key={index}
                                uri={uri}
                                onRemove={() => removeImage(index)}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* ปุ่มส่งแบบฟอร์ม */}
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        { backgroundColor: primaryColor },
                        isSubmitting && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={styles.submitButtonText}>
                        {isSubmitting ? "กำลังส่ง..." : "ส่งแบบฟอร์ม"}
                    </Text>
                </TouchableOpacity>
            </KeyboardAwareScrollView>

            {/* Type Picker Modal */}
            <Modal
                visible={showTypePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTypePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เลือกประเภทปัญหา</Text>
                            <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                                <MaterialIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {ISSUE_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.typeItem,
                                        formData.issueType === type.value && styles.selectedTypeItem,
                                    ]}
                                    onPress={() => handleSelectType(type)}
                                >
                                    <Text style={styles.typeText}>{type.name}</Text>
                                    {formData.issueType === type.value && (
                                        <MaterialIcons name="check" size={20} color="#205248" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successModalContent}>
                        <Ionicons name="checkmark-circle" size={60} color={primaryColor} />
                        <Text style={styles.successTitle}>บันทึกสำเร็จ</Text>
                        <Text style={styles.successMessage}>
                            ส่งแบบฟอร์มแจ้งปัญหาเรียบร้อยแล้ว
                        </Text>
                        <TouchableOpacity
                            style={[styles.successButton, { backgroundColor: primaryColor }]}
                            onPress={() => {
                                setShowSuccessModal(false);
                                navigation.goBack();
                            }}
                        >
                            <Text style={styles.successButtonText}>ตกลง</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
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
    formContainer: {
        flex: 1,
        padding: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: "#333",
        marginBottom: 8,
        fontWeight: "500",
        fontFamily: "NotoSansThai_500Medium",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: "#fff",
    },
    input: {
        flex: 1,
        height: 48,
        color: "#333",
        paddingVertical: 12,
        fontFamily: "NotoSansThai_400Regular",
    },
    placeholderContainer: {
        backgroundColor: "#ffffffff",
    },
    placeholderText: {
        color: "#999",
        fontFamily: "NotoSansThai_400Regular",
    },
    textAreaContainer: {
        height: 120,
        alignItems: "flex-start",
        paddingVertical: 12,
    },
    textArea: {
        height: "100%",
        textAlignVertical: "top",
    },
    uploadButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#205248",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#fff",
    },
    uploadButtonText: {
        color: "#205248",
        marginLeft: 8,
        fontWeight: "500",
        fontFamily: "NotoSansThai_500Medium",
    },
    imagePreviewScroll: {
        marginTop: 10,
        marginBottom: 10,
    },
    imagePreviewContainer: {
        marginRight: 10,
        position: "relative",
    },
    previewImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    removeImageButton: {
        position: "absolute",
        top: -8,
        right: -8,
        backgroundColor: "#ff4444",
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    submitButton: {
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
        marginTop: 24,
        marginBottom: 40,
    },
    submitButtonDisabled: {
        backgroundColor: "#cccccc",
    },
    submitButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        fontFamily: "NotoSansThai_600SemiBold",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: "80%",
        padding: 16,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        fontFamily: "NotoSansThai_600SemiBold",
    },
    typeItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    selectedTypeItem: {
        backgroundColor: "#f5f5f5",
    },
    typeText: {
        fontSize: 16,
        color: "#333",
        fontFamily: "NotoSansThai_400Regular",
    },
    // New styles for read-only text fields
    inputGroup_normalText: {
        marginBottom: 20,
    },
    label_normalText: {
        fontSize: 14,
        color: "#333",
        marginBottom: 8,
        fontWeight: "500",
        fontFamily: "NotoSansThai_500Medium",
    },
    valueText_normalText: {
        fontSize: 16,
        color: "#333",
        paddingVertical: 14,
        paddingHorizontal: 14,
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        fontFamily: "NotoSansThai_400Regular",
    },
    gap100px: {
        width: "100px",
        opacity: 0,
    },
    successModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    successModalContent: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 30,
        alignItems: "center",
        width: "80%",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 15,
        marginBottom: 10,
        fontFamily: "NotoSansThai_600SemiBold",
    },
    successMessage: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
        fontFamily: "NotoSansThai_400Regular",
    },
    successButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        width: "100%",
        alignItems: "center",
    },
    successButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        fontFamily: "NotoSansThai_600SemiBold",
    },
});
