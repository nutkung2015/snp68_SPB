import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Image,
    FlatList,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNavigation from '../../components/BottomNavigation';
import {
    useFonts,
    Kanit_400Regular,
    Kanit_700Bold,
} from '@expo-google-fonts/kanit';

const NewsScreen = ({ navigation }) => {
    const [fontsLoaded] = useFonts({
        Kanit_400Regular,
        Kanit_700Bold,
    });

    const [announcements, setAnnouncements] = useState([]);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState([]);
    const [readAnnouncements, setReadAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('หมวดหมู่');
    const [selectedTimeFilter, setSelectedTimeFilter] = useState('7 วันที่ผ่านมา');

    // Fetch announcements from API
    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/announcements?status=published');
            const data = await response.json();

            if (data.status === 'success') {
                setAnnouncements(data.data);
                // เป็น simulator logic เช็คจากอ่านเนื่องจากยังไม่เชื่อมกับฐานข้อมูล
                const unread = data.data.slice(0, 3); // สองอันแรกเป็นอ่านไม่ได้
                const read = data.data.slice(2); // อันที่เหลือเป็นอ่านได้
                setUnreadAnnouncements(unread);
                setReadAnnouncements(read);
            } else {
                setError('Failed to fetch announcements');
            }
        } catch (err) {
            console.error('Error fetching announcements:', err);
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
                    // ตรวจสอบ MIME type หรือ resource_type ถ้ามี
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
            return 'https://picsum.photos/300/200';
        } catch (error) {
            console.error('Error parsing attachment_urls:', error);
            return 'https://picsum.photos/300/200';
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

    const renderNewsCard = ({ item }) => (
        <TouchableOpacity
            style={styles.newsCard}
            onPress={() => navigation.navigate('NewsDetail', { announcementId: item.id })}
        >
            <View style={styles.newsImageContainer}>
                <Image
                    source={{ uri: getImageUrl(item.attachment_urls) }}
                    style={styles.newsImage}
                />
            </View>
            <View style={styles.newsContent}>
                <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.newsDate}>{formatDate(item.created_at)}</Text>
                <View style={styles.newsStats}>
                    <View style={styles.statItem}>
                        <Ionicons name="chatbubble-outline" size={16} color="#666" />
                        <Text style={styles.statText}>10</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="eye-outline" size={16} color="#666" />
                        <Text style={styles.statText}>20</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderSection = (title, data, emptyMessage) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {data.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{emptyMessage}</Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderNewsCard}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );

    if (!fontsLoaded) {
        return null;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                    <Text style={styles.backText}>ย้อนกลับ</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ข่าวสารและประกาศ</Text>
            </View>

            {/* Filter Section */}
            <View style={styles.filterContainer}>
                <TouchableOpacity style={styles.filterButton}>
                    <Text style={styles.filterText}>{selectedCategory}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton}>
                    <Text style={styles.filterText}>{selectedTimeFilter}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#666" />
                        <Text style={styles.loadingText}>กำลังโหลด...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={fetchAnnouncements} style={styles.retryButton}>
                            <Text style={styles.retryText}>ลองใหม่</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {renderSection('ยังไม่อ่าน', unreadAnnouncements, 'ไม่มีข่าวสารที่ยังไม่อ่าน')}
                        {renderSection('อ่านแล้ว', readAnnouncements, 'ไม่มีข่าวสารที่อ่านแล้ว')}
                    </>
                )}
            </ScrollView>

            <BottomNavigation
                navigation={navigation}
                activeScreen="Home"
            />
        </SafeAreaView>
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
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    backText: {
        fontSize: 16,
        fontFamily: 'Kanit_400Regular',
        marginLeft: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Kanit_700Bold',
        flex: 1,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    filterButton: {
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
    filterText: {
        fontSize: 14,
        fontFamily: 'Kanit_400Regular',
        color: '#333',
    },
    content: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Kanit_700Bold',
        marginBottom: 12,
        color: '#333',
    },
    newsCard: {
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
        marginBottom: 12,
        overflow: 'hidden',
    },
    newsImageContainer: {
        height: 120,
        backgroundColor: '#e0e0e0',
    },
    newsImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    newsContent: {
        padding: 12,
    },
    newsTitle: {
        fontSize: 14,
        fontFamily: 'Kanit_700Bold',
        color: '#333',
        marginBottom: 4,
        lineHeight: 20,
    },
    newsDate: {
        fontSize: 12,
        fontFamily: 'Kanit_400Regular',
        color: '#666',
        marginBottom: 8,
    },
    newsStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        fontFamily: 'Kanit_400Regular',
        color: '#666',
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
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Kanit_400Regular',
        color: '#666',
    },
});

export default NewsScreen;
