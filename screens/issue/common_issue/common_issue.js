import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Alert,
    ActivityIndicator
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import IssueService from "../../../services/issueService";

const ISSUE_TYPES = [
    { id: "1", name: "ทรัพย์สินและสาธารณูปโภค", value: "AssetsFacilities" },
    { id: "2", name: "การอยู่อาศัยและระเบียบข้อบังคับ", value: "LivingRegulations" },
];

export default function CommonIssueScreen({ navigation }) {
    const [userData, setUserData] = useState(null);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load userData from AsyncStorage
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const storedUserData = await AsyncStorage.getItem("userData");
                if (storedUserData) {
                    setUserData(JSON.parse(storedUserData));
                } else {
                    setError("ไม่พบข้อมูลผู้ใช้");
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to load user data:", err);
                setError("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้");
                setLoading(false);
            }
        };

        loadUserData();
    }, []);

    useEffect(() => {
        const fetchCommonIssues = async () => {
            if (!userData || !userData.projectMemberships || userData.projectMemberships.length === 0 || !userData.projectMemberships[0].project_id) {
                if (userData) {
                    console.warn("Project ID not found in user data:", userData);
                    setError("ไม่พบข้อมูลโครงการของผู้ใช้");
                    setLoading(false);
                }
                return;
            }

            try {
                setLoading(true);
                const projectId = userData.projectMemberships[0].project_id;
                console.log("Fetching common issues for Project ID:", projectId);

                const fetchedIssues = await IssueService.getCommonIssues(projectId);

                console.log("Fetched common issues response:", JSON.stringify(fetchedIssues, null, 2));

                // Check if response is array or object with data property
                const issuesArray = Array.isArray(fetchedIssues)
                    ? fetchedIssues
                    : (fetchedIssues.data || []);

                console.log("Fetched common issues count:", issuesArray.length);

                if (issuesArray.length > 0) {
                    console.log("First issue:", JSON.stringify(issuesArray[0], null, 2));
                }

                setIssues(issuesArray);
            } catch (err) {
                console.error("Failed to fetch common issues:", err);
                setError("ไม่สามารถโหลดข้อมูลการแจ้งปัญหาได้");
            } finally {
                setLoading(false);
            }
        };

        fetchCommonIssues();
    }, [userData]);

    const handleGoBack = () => {
        navigation.goBack();
    };

    const handleAddIssue = () => {
        navigation.navigate('AddCommonIssue');
    };

    const handleIssuePress = (issueId) => {
        navigation.navigate('CommonIssueDetail', { issueId });
    };

    // Helper to get display name for issue type
    const getIssueTypeName = (value) => {
        const type = ISSUE_TYPES.find(t => t.value === value);
        return type ? type.name : (value || 'ไม่ระบุประเภท');
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>Error: {error}</Text>
            </SafeAreaView>
        );
    }

    const getStatusStyles = (status) => {
        switch (status) {
            case 'pending':
                return { color: '#FFA500', dotColor: '#FFA500', text: 'รอดำเนินการ' };
            case 'in_progress':
                return { color: '#007BFF', dotColor: '#007BFF', text: 'กำลังดำเนินการ' };
            case 'resolved':
                return { color: '#28A745', dotColor: '#28A745', text: 'แก้ไขแล้ว' };
            case 'rejected':
                return { color: '#DC3545', dotColor: '#DC3545', text: 'ถูกปฏิเสธ' };
            default:
                return { color: '#6c757d', dotColor: '#6c757d', text: 'ไม่ทราบสถานะ' };
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#fff" barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="black" />
                    <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.headerSecond}>
                <Text style={styles.headerTitle}>รายการแจ้งปัญหาส่วนกลาง</Text>
            </View>

            {/* Content */}
            <ScrollView style={styles.content}>
                {/* Add New Issue Card (Button) */}
                <TouchableOpacity style={styles.addNewCard} onPress={handleAddIssue}>
                    <MaterialIcons name="add" size={24} color="#888" />
                    <Text style={styles.addNewText}>แจ้งปัญหาส่วนกลาง</Text>
                </TouchableOpacity>

                {issues.length === 0 ? (
                    <Text style={styles.noIssuesText}>ไม่พบรายการแจ้งปัญหาส่วนกลาง</Text>
                ) : (
                    <>
                        {issues.map((issue) => {
                            const statusStyles = getStatusStyles(issue.status);
                            return (
                                <TouchableOpacity
                                    key={issue.id}
                                    style={styles.issueCard}
                                    onPress={() => handleIssuePress(issue.id)}
                                >
                                    <View style={styles.issueLeft}>
                                        <View style={[styles.statusDot, { backgroundColor: statusStyles.dotColor }]} />
                                        <View>
                                            <Text style={styles.issueTitle}>
                                                {getIssueTypeName(issue.issue_type)}
                                            </Text>
                                            <Text style={styles.issueDescription} numberOfLines={1}>{issue.description}</Text>
                                            <Text style={styles.issueDate}>{new Date(issue.reported_date).toLocaleDateString('th-TH')}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.issueRight}>
                                        <Text style={[styles.issueStatus, { color: statusStyles.color }]}>
                                            {statusStyles.text}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={20} color="#666" />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 5,
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
        marginLeft: 4,
        fontFamily: "NotoSansThai_400Regular",
    },
    headerTitle: {
        flex: 1,
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "start",
        marginRight: 24,
        fontFamily: "NotoSansThai_600SemiBold",
    },
    content: {
        flex: 1,
        padding: 16,
    },
    // New styles for the Add Button Card
    addNewCard: {
        height: 80,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#ccc',
        borderStyle: 'dashed',
    },
    addNewText: {
        fontSize: 16,
        color: '#888',
        marginLeft: 8,
        fontFamily: "NotoSansThai_600SemiBold",
    },
    issueCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    issueLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    issueTitle: {
        fontSize: 18,
        color: "#333",
        marginBottom: 2,
        fontFamily: "NotoSansThai_400Regular",
    },
    issueDescription: {
        fontSize: 16,
        color: "#666",
        marginBottom: 2,
        maxWidth: 200,
        fontFamily: "NotoSansThai_400Regular",
    },
    issueDate: {
        fontSize: 14,
        color: "#888",
        fontFamily: "NotoSansThai_400Regular",
    },
    issueRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    issueStatus: {
        fontSize: 14,
        marginRight: 8,
        fontFamily: "NotoSansThai_500Medium",
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 50,
        backgroundColor: '#205248',
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    loadingIndicator: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#666',
        fontFamily: "NotoSansThai_400Regular",
    },
    noIssuesText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#666',
        fontFamily: "NotoSansThai_400Regular",
    },
    errorText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: 'red',
        fontFamily: "NotoSansThai_400Regular",
    }
});
