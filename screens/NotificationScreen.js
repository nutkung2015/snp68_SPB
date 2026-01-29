import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import NotificationService from '../services/notificationService';

/**
 * NotificationScreen
 * หน้าแสดงประวัติการแจ้งเตือนทั้งหมด
 */

// Notification Type Config
const NOTIFICATION_TYPE_CONFIG = {
    repair_status_update: {
        icon: 'construct',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        label: 'แจ้งซ่อม'
    },
    issue_status_update: {
        icon: 'warning',
        color: '#EF4444',
        bgColor: '#FEE2E2',
        label: 'รายงานปัญหา'
    },
    visitor_exit_stamp: {
        icon: 'car',
        color: '#10B981',
        bgColor: '#D1FAE5',
        label: 'ผู้มาเยี่ยม'
    },
    announcement: {
        icon: 'megaphone',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        label: 'ประกาศ'
    },
    system: {
        icon: 'settings',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        label: 'ระบบ'
    }
};

const NotificationScreen = ({ navigation }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0
    });
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch notifications when screen is focused
    useFocusEffect(
        useCallback(() => {
            fetchNotifications(1);
            fetchUnreadCount();
        }, [])
    );

    // Fetch notifications
    const fetchNotifications = async (page = 1, append = false) => {
        try {
            if (page === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await NotificationService.getNotifications({
                page: page,
                limit: pagination.limit
            });

            if (response.status === 'success') {
                if (append) {
                    setNotifications(prev => [...prev, ...response.data]);
                } else {
                    setNotifications(response.data);
                }
                setPagination(response.pagination);
                setUnreadCount(response.summary?.unread_count || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดการแจ้งเตือนได้');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    // Fetch unread count
    const fetchUnreadCount = async () => {
        const count = await NotificationService.getUnreadCount();
        setUnreadCount(count);
    };

    // Pull to refresh
    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications(1);
    };

    // Load more (infinite scroll)
    const loadMore = () => {
        if (!loadingMore && pagination.page < pagination.total_pages) {
            fetchNotifications(pagination.page + 1, true);
        }
    };

    // Handle notification press
    const handleNotificationPress = async (notification) => {
        // Mark as read
        if (!notification.is_read) {
            try {
                await NotificationService.markAsRead(notification.id);
                setNotifications(prev =>
                    prev.map(n =>
                        n.id === notification.id ? { ...n, is_read: true } : n
                    )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        }

        // Navigate to related screen based on reference_type
        navigateToReference(notification);
    };

    // Navigate to reference screen
    const navigateToReference = (notification) => {
        const { reference_type, reference_id, data } = notification;

        switch (reference_type) {
            case 'repair':
                // Navigate to repair detail
                if (reference_id) {
                    navigation.navigate('RepairDetail', { repairId: reference_id });
                }
                break;
            case 'issue':
                // Navigate to issue detail - check prefix to determine personal vs common
                if (reference_id) {
                    if (reference_id.startsWith('CI-')) {
                        // Common Issue
                        navigation.navigate('CommonIssueDetail', { issueId: reference_id });
                    } else {
                        // Personal Issue (PI- prefix or default)
                        navigation.navigate('IssueDetail', { issueId: reference_id });
                    }
                }
                break;
            case 'visitor':
                // Navigate to visitor/estamp screen
                navigation.navigate('Estamp', { visitorId: reference_id });
                break;
            case 'announcement':
                // Navigate to news detail
                if (reference_id) {
                    navigation.navigate('NewsDetail', { announcementId: reference_id });
                }
                break;
            default:
                // No navigation
                break;
        }
    };

    // Mark all as read
    const handleMarkAllAsRead = async () => {
        try {
            await NotificationService.markAllAsRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
            Alert.alert('ผิดพลาด', 'ไม่สามารถดำเนินการได้');
        }
    };

    // Delete notification
    const handleDelete = async (notificationId) => {
        Alert.alert(
            'ลบการแจ้งเตือน',
            'คุณต้องการลบการแจ้งเตือนนี้?',
            [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                    text: 'ลบ',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await NotificationService.deleteNotification(notificationId);
                            setNotifications(prev =>
                                prev.filter(n => n.id !== notificationId)
                            );
                        } catch (error) {
                            console.error('Error deleting notification:', error);
                            Alert.alert('ผิดพลาด', 'ไม่สามารถลบได้');
                        }
                    }
                }
            ]
        );
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'เมื่อสักครู่';
        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
        if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Render notification item
    const renderNotificationItem = ({ item }) => {
        const config = NOTIFICATION_TYPE_CONFIG[item.type] || NOTIFICATION_TYPE_CONFIG.system;

        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    !item.is_read && styles.unreadItem
                ]}
                onPress={() => handleNotificationPress(item)}
                onLongPress={() => handleDelete(item.id)}
                activeOpacity={0.7}
            >
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
                    <Ionicons name={config.icon} size={24} color={config.color} />
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[
                            styles.typeLabel,
                            { color: config.color }
                        ]}>
                            {config.label}
                        </Text>
                        <Text style={styles.timeText}>
                            {formatDate(item.created_at)}
                        </Text>
                    </View>

                    <Text style={[
                        styles.titleText,
                        !item.is_read && styles.unreadText
                    ]} numberOfLines={1}>
                        {item.title}
                    </Text>

                    <Text style={styles.bodyText} numberOfLines={2}>
                        {item.body}
                    </Text>
                </View>

                {/* Unread indicator */}
                {!item.is_read && (
                    <View style={styles.unreadDot} />
                )}

                {/* Arrow */}
                <Ionicons name="chevron-forward" size={20} color="#C4C4C4" />
            </TouchableOpacity>
        );
    };

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>ไม่มีการแจ้งเตือน</Text>
            <Text style={styles.emptySubtitle}>เมื่อมีการแจ้งเตือนใหม่จะแสดงที่นี่</Text>
        </View>
    );

    // Render footer (loading more)
    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#6B7280" />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>การแจ้งเตือน</Text>

                {unreadCount > 0 && (
                    <TouchableOpacity
                        style={styles.markAllButton}
                        onPress={handleMarkAllAsRead}
                    >
                        <Text style={styles.markAllText}>อ่านทั้งหมด</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Unread count badge */}
            {unreadCount > 0 && (
                <View style={styles.unreadBanner}>
                    <Ionicons name="mail-unread" size={18} color="#3B82F6" />
                    <Text style={styles.unreadBannerText}>
                        มี {unreadCount} รายการที่ยังไม่อ่าน
                    </Text>
                </View>
            )}

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>กำลังโหลด...</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotificationItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.listContent,
                        notifications.length === 0 && styles.emptyListContent
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#3B82F6']}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListEmptyComponent={renderEmptyState}
                    ListFooterComponent={renderFooter}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontFamily: 'Kanit_700Bold',
        color: '#1F2937',
        fontFamily: 'Kanit_700Bold',
    },
    markAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    markAllText: {
        fontSize: 14,
        color: '#3B82F6',
        fontFamily: 'Kanit_400Regular',
    },
    unreadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: '#EFF6FF',
        borderBottomWidth: 1,
        borderBottomColor: '#DBEAFE',
    },
    unreadBannerText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#3B82F6',
        fontFamily: 'Kanit_400Regular',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
        fontFamily: 'Kanit_400Regular',
    },
    listContent: {
        paddingVertical: 8,
    },
    emptyListContent: {
        flex: 1,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 12,
        marginVertical: 4,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    unreadItem: {
        backgroundColor: '#FEFCE8',
        borderLeftWidth: 3,
        borderLeftColor: '#F59E0B',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
        marginRight: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    typeLabel: {
        fontSize: 12,
        fontFamily: 'Kanit_600SemiBold',
        fontFamily: 'Kanit_400Regular',
    },
    timeText: {
        fontSize: 11,
        color: '#9CA3AF',
        fontFamily: 'Kanit_400Regular',
    },
    titleText: {
        fontSize: 15,
        color: '#374151',
        marginBottom: 2,
        fontFamily: 'Kanit_400Regular',
    },
    unreadText: {
        fontFamily: 'Kanit_700Bold',
        color: '#1F2937',
        fontFamily: 'Kanit_700Bold',
    },
    bodyText: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
        fontFamily: 'Kanit_400Regular',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        marginRight: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        marginTop: 16,
        fontSize: 18,
        fontFamily: 'Kanit_700Bold',
        color: '#6B7280',
        fontFamily: 'Kanit_700Bold',
    },
    emptySubtitle: {
        marginTop: 8,
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        fontFamily: 'Kanit_400Regular',
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default NotificationScreen;
