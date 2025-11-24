import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ImageBackground,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SecurityBottomNavigation from "../../components/SecurityBottomNavigation";
import { useNavigation } from "@react-navigation/native";
import { onLogoutCallback, setNavigation } from "../../services/authService";
import { LinearGradient } from "expo-linear-gradient";
import {
    useFonts,
    Kanit_400Regular,
    Kanit_700Bold,
    Kanit_500Medium,
} from "@expo-google-fonts/kanit";

const SecurityProfileScreen = ({ recheckLoginStatus }) => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();

    const [fontsLoaded] = useFonts({
        Kanit_400Regular,
        Kanit_500Medium,
        Kanit_700Bold,
    });

    useEffect(() => {
        setNavigation(navigation);
    }, [navigation]);

    //   const handleLogout = async () => {
    //     Alert.alert(
    //       "ออกจากระบบ",
    //       "คุณต้องการออกจากระบบใช่หรือไม่?",
    //       [
    //         {
    //           text: "ยกเลิก",
    //           style: "cancel",
    //         },
    //         {
    //           text: "ออกจากระบบ",
    //           style: "destructive",
    //           onPress: async () => {
    //             try {
    //               await AsyncStorage.removeItem("userData");
    //               await AsyncStorage.removeItem("authToken");
    //               navigation.navigate("Login");
    //             } catch (error) {
    //               console.error("Error during logout:", error);
    //               Alert.alert("ผิดพลาด", "ไม่สามารถออกจากระบบได้");
    //             }
    //           },
    //         },
    //       ]
    //     );
    //   };

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem("userData");
            await AsyncStorage.removeItem("authToken");
            navigation.navigate("Login");
        } catch (error) {
            console.error("Error during logout:", error);
            Alert.alert("Error", "Failed to logout.");
        }
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const userDataStr = await AsyncStorage.getItem("userData");
                const userData = userDataStr ? JSON.parse(userDataStr) : null;
                const token = userData?.token;
                console.log("SecurityProfileScreen: Fetched authToken:", token);
                if (!token) {
                    console.log("SecurityProfileScreen: No authToken found, returning.");
                    return;
                }

                const response = await fetch("http://localhost:5000/api/auth/profile", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log("SecurityProfileScreen: API response status:", response.status);

                if (response.status === 401) {
                    console.log("SecurityProfileScreen: Unauthorized (401), handling logout.");
                    await AsyncStorage.removeItem("authToken");
                    if (typeof onLogoutCallback === "function") {
                        onLogoutCallback();
                    } else {
                        console.warn("onLogoutCallback not set in SecurityProfileScreen.");
                    }
                    return;
                }

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("SecurityProfileScreen: API response not OK:", errorData);
                    throw new Error(errorData.message || "Failed to fetch user profile");
                }

                const data = await response.json();
                console.log("SecurityProfileScreen: Fetched user data:", data);
                setUserData(data.user);
            } catch (error) {
                console.error("Error fetching user profile:", error);
                Alert.alert("ผิดพลาด", "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    if (!fontsLoaded || loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4BB59F" />
                <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
            </View>
        );
    }

    if (!userData) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>ไม่สามารถโหลดข้อมูลผู้ใช้ได้</Text>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const menuItems = [
        // {
        //     id: "1",
        //     title: "ข้อมูลส่วนตัว",
        //     icon: "person-outline",
        //     onPress: () => navigation.navigate("EditProfile"),
        // },
        {
            id: "2",
            title: "เปลี่ยนรหัสผ่าน",
            icon: "lock-closed-outline",
            onPress: () => navigation.navigate("ChangePassword"),
        },
        // {
        //     id: "3",
        //     title: "ประวัติการทำงาน",
        //     icon: "time-outline",
        //     onPress: () => navigation.navigate("WorkHistory"),
        // },
        // {
        //     id: "4",
        //     title: "การตั้งค่า",
        //     icon: "settings-outline",
        //     onPress: () => navigation.navigate("Settings"),
        // },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <ImageBackground
                source={require("../../assets/mockup_banner_header_2.svg")}
                style={styles.headerBackground}
                resizeMode="cover"
                imageStyle={{
                    width: "100%",
                    height: "100%",
                }}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>โปรไฟล์</Text>
                </View>

                {/* Profile Card in Header */}
                <View style={styles.profileHeaderCard}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={40} color="#4BB59F" />
                        </View>
                    </View>
                    <Text style={styles.profileName}>{userData.full_name}</Text>
                    <View style={styles.roleBadge}>
                        <Ionicons name="shield-checkmark" size={16} color="#fff" />
                        <Text style={styles.roleText}>เจ้าหน้าที่รักษาความปลอดภัย</Text>
                    </View>
                </View>
            </ImageBackground>

            <ScrollView style={styles.scrollViewContent}>
                {/* User Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={20} color="#666" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>อีเมล</Text>
                            <Text style={styles.infoValue}>{userData.email}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={20} color="#666" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>เบอร์โทรศัพท์</Text>
                            <Text style={styles.infoValue}>
                                {userData.phone || "ไม่ได้ระบุ"}
                            </Text>
                        </View>
                    </View>

                    {/* <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="id-card-outline" size={20} color="#666" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>รหัสพนักงาน</Text>
                            <Text style={styles.infoValue}>SEC-{userData.id}</Text>
                        </View>
                    </View> */}
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.menuItem}
                            onPress={item.onPress}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={styles.menuIconContainer}>
                                    <Ionicons name={item.icon} size={22} color="#4BB59F" />
                                </View>
                                <Text style={styles.menuItemText}>{item.title}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <LinearGradient
                        colors={["#FF6B6B", "#FF8E53"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.logoutGradient}
                    >
                        <Ionicons name="log-out-outline" size={24} color="#fff" />
                        <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>

            {/* <SecurityBottomNavigation navigation={navigation} activeScreen="Profile" /> */}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#F5F5F5",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#666",
    },
    errorText: {
        fontSize: 16,
        fontFamily: "Kanit_400Regular",
        color: "#666",
        marginBottom: 20,
    },
    headerBackground: {
        width: "100%",
        paddingBottom: 30,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginTop: 10,
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontFamily: "Kanit_700Bold",
        color: "#fff",
    },
    profileHeaderCard: {
        alignItems: "center",
        paddingVertical: 20,
    },
    avatarContainer: {
        marginBottom: 15,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#FFD840",
    },
    profileName: {
        fontSize: 22,
        fontFamily: "Kanit_700Bold",
        color: "#fff",
        marginBottom: 8,
    },
    roleBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
    },
    roleText: {
        fontSize: 14,
        fontFamily: "Kanit_500Medium",
        color: "#fff",
        marginLeft: 5,
    },
    scrollViewContent: {
        flex: 1,
    },
    infoCard: {
        backgroundColor: "#fff",
        margin: 16,
        padding: 20,
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
    },
    infoTextContainer: {
        marginLeft: 15,
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        fontFamily: "Kanit_400Regular",
        color: "#999",
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        fontFamily: "Kanit_500Medium",
        color: "#333",
    },
    divider: {
        height: 1,
        backgroundColor: "#f0f0f0",
        marginVertical: 5,
    },
    menuSection: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 15,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    menuItemLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F0FAF8",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    menuItemText: {
        fontSize: 16,
        fontFamily: "Kanit_500Medium",
        color: "#333",
    },
    logoutButton: {
        marginHorizontal: 16,
        marginBottom: 30,
        borderRadius: 15,
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    logoutGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
    },
    logoutButtonText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "Kanit_700Bold",
        marginLeft: 10,
    },
});

export default SecurityProfileScreen;
