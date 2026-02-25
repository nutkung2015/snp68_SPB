import React from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ImageBackground,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SecurityBottomNavigation from "../../components/SecurityBottomNavigation";
import { LinearGradient } from "expo-linear-gradient";


const SecurityServiceScreen = ({ navigation }) => {
    

    const services = [
        {
            id: "1",
            title: "รถเข้าโครงการ",
            icon: "car-outline",
            colors: ["#4DB59F", "#A8C957"],
            onPress: () => navigation.navigate("VehicleEntry"),
        },
        {
            id: "2",
            title: "แจ้งปัญหา",
            icon: "warning-outline",
            colors: ["#4DB59F", "#A8C957"],
            onPress: () => navigation.navigate("ReportIssue"),
        },
        {
            id: "3",
            title: "เบอร์ฉุกเฉิน",
            icon: "call-outline",
            colors: ["#4DB59F", "#A8C957"],
            onPress: () => navigation.navigate("EmergencyContact"),
        },
        {
            id: "4",
            title: "ขอความช่วยเหลือ",
            icon: "hand-right-outline",
            colors: ["#4DB59F", "#A8C957"],
            onPress: () => navigation.navigate("RequestHelp"),
        },
        {
            id: "5",
            title: "รายงานประจำวัน",
            icon: "document-text-outline",
            colors: ["#4DB59F", "#A8C957"],
            onPress: () => navigation.navigate("DailyReport"),
        },
        {
            id: "6",
            title: "ตรวจสอบผู้มาเยี่ยม",
            icon: "people-outline",
            colors: ["#4DB59F", "#A8C957"],
            onPress: () => navigation.navigate("VisitorCheck"),
        },
        {
            id: "7",
            title: "บันทึกเหตุการณ์",
            icon: "clipboard-outline",
            colors: ["#4DB59F", "#A8C957"],
            onPress: () => navigation.navigate("IncidentLog"),
        },
        {
            id: "8",
            title: "แจ้งเตือนฉุกเฉิน",
            icon: "notifications-outline",
            colors: ["#FF6B6B", "#FF8E53"],
            onPress: () => navigation.navigate("EmergencyAlert"),
        },
    ];

    

    const renderServiceItem = ({ id, title, icon, colors, onPress }) => (
        <TouchableOpacity
            key={id}
            style={styles.serviceCard}
            onPress={onPress}
        >
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.serviceGradient}
            >
                <View style={styles.serviceIconWrapper}>
                    <Ionicons name={icon} size={32} color="#fff" />
                </View>
                <Text style={styles.serviceText}>{title}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.backButtonContainer}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={24} color="#000" />
                        <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.titleContainer}>
                    <Text style={styles.headerTitle}>บริการทั้งหมด</Text>
                </View>
            </View>

            {/* Services Grid */}
            <ScrollView style={styles.content}>
                <View style={styles.servicesGrid}>
                    {services.map((service) => renderServiceItem(service))}
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            {/* <SecurityBottomNavigation
                navigation={navigation}
                activeScreen="SecurityServices"
            /> */}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    header: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingTop: 20,
    },
    backButtonContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
    },
    backButtonText: {
        color: "#000",
        fontSize: 16,
        fontFamily: "NotoSansThai_400Regular",
        marginLeft: 4,
    },
    titleContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: "NotoSansThai_700Bold",
        color: "#000",
    },
    content: {
        flex: 1,
        paddingTop: 20,
    },
    servicesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        padding: 12,
        justifyContent: "space-between",
    },
    serviceCard: {
        width: "48%",
        marginBottom: 15,
        borderRadius: 15,
        overflow: "hidden",
        borderColor: "#205248",
        borderWidth: 3,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    serviceGradient: {
        padding: 20,
        minHeight: 120,
        justifyContent: "center",
        alignItems: "center",
    },
    serviceIconWrapper: {
        marginBottom: 10,
    },
    serviceText: {
        fontSize: 14,
        fontFamily: "NotoSansThai_700Bold",
        color: "#fff",
        textAlign: "center",
    },
});

export default SecurityServiceScreen;
