// screens/news/NewsDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    StatusBar,
    Dimensions,
    Modal,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    useFonts,
    Kanit_400Regular,
    Kanit_700Bold,
} from '@expo-google-fonts/kanit';
import { AnnouncementsService } from '../../services';

const { width, height } = Dimensions.get('window');

const NewsDetailScreen = ({ navigation, route }) => {
    const [fontsLoaded] = useFonts({
        Kanit_400Regular,
        Kanit_700Bold,
    });

    const { announcementId } = route.params;
    const [announcement, setAnnouncement] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch announcement detail from API
    useEffect(() => {
        fetchAnnouncementDetail();
    }, [announcementId]);

    const fetchAnnouncementDetail = async () => {
        try {
            setLoading(true);
            const data = await AnnouncementsService.getAnnouncementById(announcementId);

            if (data.status === 'success') {
                setAnnouncement(data.data);
            } else {
                setError('Failed to fetch announcement');
            }
        } catch (err) {
            console.error('Error fetching announcement:', err);
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to get image URL from attachment_urls
    const getImageUrl = (attachmentUrls) => {
        try {
            // ถ้ามี attachment_urls และเป็น string (JSON) ให้แปลงเป็น object
            if (attachmentUrls && typeof attachmentUrls === 'string') {
                attachmentUrls = JSON.parse(attachmentUrls);
            }

            // ตรวจสอบว่ามี attachmentUrls และเป็น array
            if (attachmentUrls && Array.isArray(attachmentUrls) && attachmentUrls.length > 0) {
                // หารูปภาพจาก attachment_urls
                const imageFile = attachmentUrls.find(file => {
                    // ตรวจสอบ resource_type ว่าเป็น image หรือไม่
                    if (file.resource_type === 'image') {
                        return true;
                    }

                    // ถ้าไม่มี resource_type ให้เช็คจากนามสกุลไฟล์
                    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
                    return file.url && typeof file.url === 'string' &&
                        imageExtensions.some(ext => file.url.toLowerCase().includes(ext));
                });

                // ถ้าเจอไฟล์รูปภาพ ให้ใช้ URL จากไฟล์นั้น
                if (imageFile && imageFile.url) {
                    return imageFile.url;
                }
            }

            // ถ้าไม่มีรูปภาพ ใช้รูป default
            return 'https://picsum.photos/400/300';
        } catch (error) {
            console.error('Error parsing attachment_urls:', error);
            return 'https://picsum.photos/400/300';
        }
    };

    // Format date to Thai format
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        const day = date.getDate();
        const month = thaiMonths[date.getMonth()];
        const year = date.getFullYear() + 543; // Convert to Buddhist year
        return `${day} ${month} ${year}`;
    };

    const handleBack = () => {
        navigation.goBack();
    };

    if (!fontsLoaded) {
        return null;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="black" />
                    <Text style={styles.backButtonText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.headerSecond}>
                <Text style={styles.headerTitle}>ข่าวสารและประกาศ</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2A405E" />
                    <Text style={styles.loadingText}>กำลังโหลด...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={fetchAnnouncementDetail} style={styles.retryButton}>
                        <Text style={styles.retryText}>ลองใหม่</Text>
                    </TouchableOpacity>
                </View>
            ) : announcement ? (
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Source Info */}
                    <View style={styles.sourceContainer}>
                        <View style={styles.avatarContainer}>
                            <Ionicons name="person" size={24} color="#fff" style={styles.avatarIcon} />
                        </View>
                        <View style={styles.sourceInfo}>
                            <Text style={styles.sourceName}>นิติบุคคล</Text>
                            <Text style={styles.sourceDate}>{formatDate(announcement.created_at)}</Text>
                        </View>
                    </View>

                    {/* Separator */}
                    <View style={styles.separator} />

                    {/* Title */}
                    <Text style={styles.title}>{announcement.title}</Text>

                    {/* Image */}
                    {announcement.attachment_urls && (
                        <View style={styles.imageContainer}>
                            <Image
                                source={{ uri: getImageUrl(announcement.attachment_urls) }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                        </View>
                    )}

                    {/* Content */}
                    <Text style={styles.contentText}>{announcement.content}</Text>

                    {/* Acknowledge Button */}
                    {/*<TouchableOpacity
                        style={styles.acknowledgeButton}
                        onPress={handleBack}
                    >
                        <Text style={styles.acknowledgeButtonText}>รับทราบ</Text>
                    </TouchableOpacity>*/}
                </ScrollView>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    headerSecond: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Kanit_600SemiBold',
        color: '#000',
        fontWeight: 'bold',
        textAlign: 'left',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 16,
        color: 'black',
        marginLeft: 4,
        fontFamily: 'Kanit_400Regular',
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Kanit_700Bold',
        marginBottom: 16,
        color: '#333',
    },
    contentText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        marginBottom: 24,
        fontFamily: 'Kanit_400Regular',
    },
    imageContainer: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        marginVertical: 16,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    sourceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2A405E',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarIcon: {
        color: '#fff',
    },
    sourceInfo: {
        flex: 1,
    },
    sourceName: {
        fontSize: 16,
        fontFamily: 'Kanit_600SemiBold',
        color: '#333',
    },
    sourceDate: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
        fontFamily: 'Kanit_400Regular',
    },
    separator: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
        fontFamily: 'Kanit_400Regular',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#e74c3c',
        marginBottom: 16,
        textAlign: 'center',
        fontFamily: 'Kanit_400Regular',
    },
    retryButton: {
        backgroundColor: '#2A405E',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Kanit_500Medium',
    },
    // Background Content Styles (NewsScreen)
    backgroundContent: {
        flex: 1,
        backgroundColor: '#fff',
    },
    backgroundHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backgroundBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backgroundBackText: {
        fontSize: 16,
        fontFamily: 'Kanit_400Regular',
        marginLeft: 4,
    },
    backgroundTitle: {
        fontSize: 20,
        fontFamily: 'Kanit_700Bold',
        flex: 1,
        textAlign: 'center',
    },
    backgroundHeaderRight: {
        width: 60,
    },
    backgroundFilterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    backgroundFilterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    backgroundFilterText: {
        fontSize: 14,
        fontFamily: 'Kanit_400Regular',
        color: '#333',
    },
    backgroundContentPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    backgroundPlaceholderText: {
        fontSize: 16,
        fontFamily: 'Kanit_400Regular',
        color: '#666',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: height * 1.8,
        minHeight: height * 0.9,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backText: {
        fontSize: 16,
        fontFamily: 'Kanit_400Regular',
        marginLeft: 4,
        color: '#000',
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    sourceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sourceInfo: {
        flex: 1,
    },
    sourceName: {
        fontSize: 16,
        fontFamily: 'Kanit_700Bold',
        color: '#333',
        marginBottom: 2,
    },
    sourceDate: {
        fontSize: 14,
        fontFamily: 'Kanit_400Regular',
        color: '#666',
    },
    separator: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Kanit_700Bold',
        color: '#333',
        marginBottom: 16,
        lineHeight: 28,
    },
    modalContentText: {
        fontSize: 16,
        fontFamily: 'Kanit_400Regular',
        color: '#333',
        lineHeight: 24,
        marginBottom: 20,
    },
    modalImageContainer: {
        height: 200,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    acknowledgeButton: {
        backgroundColor: '#333',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    acknowledgeButtonText: {
        fontSize: 16,
        fontFamily: 'Kanit_700Bold',
        color: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'Kanit_400Regular',
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    errorText: {
        fontSize: 14,
        fontFamily: 'Kanit_400Regular',
        color: '#ff6b6b',
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
    },
    retryText: {
        fontSize: 14,
        fontFamily: 'Kanit_400Regular',
        color: '#333',
    },
});

export default NewsDetailScreen;