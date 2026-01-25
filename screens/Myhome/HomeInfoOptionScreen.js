import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ProjectCustomizationsService from "../../services/projectCustomizationsService";

// Card Component สำหรับตัวเลือก
const OptionCard = ({ iconName, title, subtitle, onPress, primaryColor }) => (
    <TouchableOpacity
        style={[styles.card, { borderColor: primaryColor + '30' }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.iconContainer, { backgroundColor: primaryColor + '15' }]}>
            <Ionicons name={iconName} size={40} color={primaryColor} />
        </View>
        <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={primaryColor} />
    </TouchableOpacity>
);

export default function HomeInfoOptionScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [primaryColor, setPrimaryColor] = useState("#2A405E");
    const [userData, setUserData] = useState(null);

    // โหลดข้อมูล user จาก AsyncStorage
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const storedUserData = await AsyncStorage.getItem("userData");
                if (storedUserData) {
                    const parsed = JSON.parse(storedUserData);
                    setUserData(parsed);

                    // โหลด theme สี
                    const projectId = parsed?.projectMemberships?.[0]?.project_id;
                    if (projectId) {
                        try {
                            const customizations = await ProjectCustomizationsService.getProjectCustomizations(projectId);
                            if (customizations?.primary_color) {
                                setPrimaryColor(customizations.primary_color);
                            }
                        } catch (e) {
                            console.log("Could not load project customizations");
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load user data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadUserData();
    }, []);

    // ย้อนกลับ
    const handleGoBack = () => {
        navigation.goBack();
    };

    // Loading State
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingText}>กำลังโหลด...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="black" />
                    <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.headerSecond}>
                <Text style={styles.headerTitle}>เอกสารตัวบ้าน</Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* <Text style={styles.sectionTitle}>เลือกดูข้อมูล</Text>
                <Text style={styles.sectionSubtitle}>
                    เลือกประเภทเอกสารที่ต้องการดู
                </Text> */}

                {/* Option Cards */}
                <View style={styles.cardsContainer}>
                    <OptionCard
                        iconName="map-outline"
                        title="แปลนบ้าน"
                        subtitle="ดูผังพื้น แปลนห้อง และโครงสร้างบ้าน"
                        primaryColor={primaryColor}
                        onPress={() => navigation.navigate("HousePlan")}
                    />

                    <OptionCard
                        iconName="document-text-outline"
                        title="รายละเอียดบ้าน"
                        subtitle="ดูรายละเอียดวัสดุ สเปค และข้อมูลอื่นๆ"
                        primaryColor={primaryColor}
                        onPress={() => navigation.navigate("HouseDetail")}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
        fontFamily: "Kanit_400Regular",
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
        fontFamily: "Kanit_400Regular",
    },
    headerTitle: {
        flex: 1,
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "start",
        marginRight: 24,
        fontFamily: "Kanit_600SemiBold",
        color: "#000",
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        fontFamily: "Kanit_600SemiBold",
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: "#666",
        fontFamily: "Kanit_400Regular",
        marginBottom: 24,
    },
    cardsContainer: {
        gap: 16,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        fontFamily: "Kanit_600SemiBold",
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: "#888",
        fontFamily: "Kanit_400Regular",
    },
});
