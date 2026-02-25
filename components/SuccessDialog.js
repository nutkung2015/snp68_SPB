import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";


const { width } = Dimensions.get("window");
const PRIMARY_COLOR = "#2A405E";

const SuccessDialog = ({
    visible = false,
    title = "สำเร็จ!",
    message = "ดำเนินการสำเร็จ",
    buttonText = "ตกลง",
    onButtonPress = () => { },
    loading = false,
    loadingText = "กำลังโหลด...",
    icon = "checkmark-circle",
    iconColor = "#4CAF50",
}) => {
    

    

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
        >
            <View style={styles.overlay}>
                <View style={styles.dialogContainer}>
                    {loading ? (
                        // Loading State
                        <View style={styles.loadingContent}>
                            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                            <Text style={styles.loadingText}>{loadingText}</Text>
                        </View>
                    ) : (
                        // Success State
                        <>
                            {/* Icon */}
                            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                                <Ionicons name={icon} size={60} color={iconColor} />
                            </View>

                            {/* Title */}
                            <Text style={styles.title}>{title}</Text>

                            {/* Message */}
                            <Text style={styles.message}>{message}</Text>

                            {/* Button */}
                            <TouchableOpacity
                                style={styles.button}
                                onPress={onButtonPress}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.buttonText}>{buttonText}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    dialogContainer: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: "NotoSansThai_700Bold",
        color: "#333",
        textAlign: "center",
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        fontFamily: "NotoSansThai_400Regular",
        color: "#666",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 28,
    },
    button: {
        width: "100%",
        height: 52,
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        fontSize: 18,
        fontFamily: "NotoSansThai_500Medium",
        color: "#fff",
    },
    loadingContent: {
        alignItems: "center",
        paddingVertical: 20,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        fontFamily: "NotoSansThai_400Regular",
        color: "#666",
    },
});

export default SuccessDialog;
