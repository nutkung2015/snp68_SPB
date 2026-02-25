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
    Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import BottomNavigation from '../../components/BottomNavigation';

import { AnnouncementsService } from '../../services';

const NewsScreen = ({ navigation }) => {
    

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [selectedTimeFilter, setSelectedTimeFilter] = useState('ล่าสุด');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showTimeDropdown, setShowTimeDropdown] = useState(false);

    // Filter options
    const categoryOptions = [
        { label: 'ทั้งหมด', value: '' },
        { label: 'ประกาศ', value: 'announcement' },
        { label: 'กิจกรรม', value: 'event' },
        { label: 'การบำรุงรักษา', value: 'maintenance' },
        { label: 'เหตุฉุกเฉิน', value: 'emergency' },
    ];

    const timeFilterOptions = [
        { label: 'ล่าสุด', value: 'latest' },
        { label: '1 วันที่แล้ว', value: '1day' },
        { label: '7 วันที่แล้ว', value: '7days' },
        { label: '1 เดือนที่แล้ว', value: '1month' },
        { label: '3 เดือนที่แล้ว', value: '3months' }
    ];

    useEffect(() => {
        fetchAnnouncements(selectedCategory, selectedTimeFilter);
    }, [selectedCategory, selectedTimeFilter]);

    const fetchAnnouncements = async (categoryLabel = '', timeFilterLabel = '') => {
        try {
            setLoading(true);

            // Get user data to find project_id
            const userDataStr = await AsyncStorage.getItem('userData');
            let projectId = null;
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                if (userData.projectMemberships && userData.projectMemberships.length > 0) {
                    projectId = userData.projectMemberships[0].project_id;
                }
            }

            const params = {
                status: 'published',
                projectId: projectId // Add projectId to params
            };

            // Find value from label for Category
            const categoryOption = categoryOptions.find(opt => opt.label === categoryLabel);
            const categoryValue = categoryOption ? categoryOption.value : '';

            // Add category filter
            // Add category filter
            if (categoryValue) {
                params.type = categoryValue;
            }

            // Find value from label for Time Filter
            const timeOption = timeFilterOptions.find(opt => opt.label === timeFilterLabel);
            const timeFilterValue = timeOption ? timeOption.value : '';

            // Add time filter
            if (timeFilterValue) {
                if (timeFilterValue === 'latest') {
                    params.latest = 'true';
                } else if (timeFilterValue === '1day') {
                    params.days = 1;
                } else if (timeFilterValue === '7days') {
                    params.days = 7;
                } else if (timeFilterValue === '1month') {
                    params.days = 30;
                } else if (timeFilterValue === '3months') {
                    params.days = 90;
                }
            }

            const data = await AnnouncementsService.getAnnouncements(params);

            if (data.status === 'success') {
                setAnnouncements(data.data);
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

    // Get type label and color
    const getTypeInfo = (type) => {
        const typeMap = {
            'announcement': { label: 'ประกาศ', color: '#3B82F6', bgColor: '#EFF6FF' },
            'event': { label: 'กิจกรรม', color: '#10B981', bgColor: '#ECFDF5' },
            'maintenance': { label: 'การบำรุงรักษา', color: '#F59E0B', bgColor: '#FEF3C7' },
            'emergency': { label: 'เหตุฉุกเฉิน', color: '#EF4444', bgColor: '#FEE2E2' },
        };
        return typeMap[type] || { label: 'ทั่วไป', color: '#6B7280', bgColor: '#F3F4F6' };
    };

    const renderNewsCard = ({ item }) => {
        const typeInfo = getTypeInfo(item.type);

        return (
            <TouchableOpacity
                style={styles.newsCard}
                onPress={() => navigation.navigate('NewsDetail', { announcementId: item.id })}
                activeOpacity={0.7}
            >
                <View style={styles.newsImageContainer}>
                    <Image
                        source={{ uri: getImageUrl(item.attachment_urls) }}
                        style={styles.newsImage}
                    />
                    {/* Gradient Overlay */}
                    <View style={styles.imageGradient} />

                    {/* Type Badge on Image */}
                    <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
                        <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
                    </View>
                </View>

                <View style={styles.newsContent}>
                    <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>

                    <View style={styles.newsMetaRow}>
                        <View style={styles.dateContainer}>
                            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.newsDate}>{formatDate(item.created_at)}</Text>
                        </View>
                    </View>

                    {/* Stats Row */}
                    {/* <View style={styles.newsStats}>
                        <View style={styles.statItem}>
                            <Ionicons name="eye-outline" size={16} color="#9CA3AF" />
                            <Text style={styles.statText}>125</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Ionicons name="chatbubble-outline" size={16} color="#9CA3AF" />
                            <Text style={styles.statText}>8</Text>
                        </View>
                    </View> */}
                </View>
            </TouchableOpacity>
        );
    };

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

    // Handle category selection
    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setShowCategoryDropdown(false);
    };

    // Handle time filter selection
    const handleTimeFilterSelect = (timeFilter) => {
        setSelectedTimeFilter(timeFilter);
        setShowTimeDropdown(false);
    };

    // Render dropdown options
    const renderDropdownOption = (option, isSelected, onSelect) => (
        <TouchableOpacity
            key={option.value}
            style={[
                styles.dropdownOption,
                isSelected && styles.dropdownOptionSelected
            ]}
            onPress={() => onSelect(option.label)}
        >
            <Text style={[
                styles.dropdownOptionText,
                isSelected && styles.dropdownOptionTextSelected
            ]}>
                {option.label}
            </Text>
        </TouchableOpacity>
    );

    // Render category dropdown
    const renderCategoryDropdown = () => {
        if (!showCategoryDropdown) return null;

        return (
            <View style={styles.dropdownContainer}>
                <View style={styles.dropdown}>
                    {categoryOptions.map(option =>
                        renderDropdownOption(
                            option,
                            selectedCategory === option.label,
                            handleCategorySelect
                        )
                    )}
                </View>
            </View>
        );
    };

    // Render time filter dropdown
    const renderTimeFilterDropdown = () => {
        if (!showTimeDropdown) return null;

        return (
            <View style={styles.dropdownContainer}>
                <View style={styles.dropdown}>
                    {timeFilterOptions.map(option =>
                        renderDropdownOption(
                            option,
                            selectedTimeFilter === option.label,
                            handleTimeFilterSelect
                        )
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header Row 1 - Back Button */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="chevron-back" size={24} color="#333" />
                    <Text style={styles.backText}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>

            {/* Header Row 2 - Title */}
            <View style={styles.headerSecond}>
                <Text style={styles.headerTitle}>ข่าวสารและประกาศ</Text>
            </View>

            {/* Filter Section */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                    <Text style={styles.filterText}>{selectedCategory}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowTimeDropdown(!showTimeDropdown)}
                >
                    <Text style={styles.filterText}>{selectedTimeFilter}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Category Dropdown */}
            {renderCategoryDropdown()}

            {/* Time Filter Dropdown */}
            {renderTimeFilterDropdown()}

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
                    <View style={styles.section}>
                        {announcements.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>ไม่มีข่าวสาร</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={announcements}
                                renderItem={renderNewsCard}
                                keyExtractor={item => item.id}
                                scrollEnabled={false}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                )}
            </ScrollView>

            {/* <BottomNavigation
                navigation={navigation}
                activeScreen="Home"
            /> */}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerRight: {
        width: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 16,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        zIndex: 10,
    },
    headerSecond: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backText: {
        fontSize: 16,
        fontFamily: 'NotoSansThai_400Regular',
        marginLeft: 4,
        color: '#333',
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'NotoSansThai_700Bold',
        color: '#333',
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
        fontFamily: 'NotoSansThai_400Regular',
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
        fontFamily: 'NotoSansThai_700Bold',
        marginBottom: 12,
        color: '#333',
    },
    newsCard: {
        backgroundColor: '#fff',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    newsImageContainer: {
        height: 180,
        backgroundColor: '#e0e0e0',
        position: 'relative',
    },
    newsImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        // backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    typeBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    typeBadgeText: {
        fontSize: 12,
        fontFamily: 'NotoSansThai_700Bold',
        color: '#fff',
    },
    newsContent: {
        padding: 16,
    },
    newsTitle: {
        fontSize: 16,
        fontFamily: 'NotoSansThai_700Bold',
        color: '#1F2937',
        marginBottom: 8,
        lineHeight: 24,
    },
    newsMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    newsDate: {
        fontSize: 13,
        fontFamily: 'NotoSansThai_400Regular',
        color: '#6B7280',
    },
    newsStats: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statDivider: {
        width: 1,
        height: 16,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 16,
    },
    statText: {
        fontSize: 13,
        fontFamily: 'NotoSansThai_400Regular',
        color: '#6B7280',
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
        fontFamily: 'NotoSansThai_400Regular',
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
        fontFamily: 'NotoSansThai_400Regular',
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
        fontFamily: 'NotoSansThai_400Regular',
        color: '#333',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'NotoSansThai_400Regular',
        color: '#666',
    },
    dropdownContainer: {
        position: 'absolute',
        top: 140, // Position below the filter section
        left: 16,
        right: 16,
        zIndex: 1000,
        elevation: 5,
    },
    dropdown: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    dropdownOption: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownOptionSelected: {
        backgroundColor: '#f0f8ff',
    },
    dropdownOptionText: {
        fontSize: 14,
        fontFamily: 'NotoSansThai_400Regular',
        color: '#333',
    },
    dropdownOptionTextSelected: {
        color: '#007AFF',
        fontFamily: 'NotoSansThai_700Bold',
    },
});

export default NewsScreen;
