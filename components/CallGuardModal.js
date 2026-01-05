import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GuardService from '../services/guardService';

const { width } = Dimensions.get('window');

/**
 * CallGuardModal Component
 * Popup สำหรับแสดงข้อมูลป้อมยามและเรียก รปภ.
 */
const CallGuardModal = ({
    visible,
    onClose,
    primaryColor = '#1F7EFF',
    secondaryColor = '#2A405E'
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [guardData, setGuardData] = useState(null);

    useEffect(() => {
        if (visible) {
            fetchGuardInfo();
        }
    }, [visible]);

    const fetchGuardInfo = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await GuardService.getMyGuardPhone();

            if (response.status === 'success') {
                setGuardData(response.data);
            } else {
                setError('ไม่สามารถดึงข้อมูลป้อมยามได้');
            }
        } catch (err) {
            console.error('Error fetching guard info:', err);
            setError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phoneNumber) => {
        if (!phoneNumber) {
            return;
        }

        const phoneUrl = Platform.OS === 'ios'
            ? `telprompt:${phoneNumber}`
            : `tel:${phoneNumber}`;

        Linking.canOpenURL(phoneUrl)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(phoneUrl);
                } else {
                    console.error('Phone calls not supported');
                }
            })
            .catch((err) => console.error('Error opening phone:', err));
    };

    const renderPhoneButton = (label, phoneNumber, isPrimary = true) => {
        if (!phoneNumber) return null;

        return (
            <TouchableOpacity
                style={[
                    styles.phoneButton,
                    isPrimary
                        ? { backgroundColor: primaryColor }
                        : styles.phoneButtonSecondary
                ]}
                onPress={() => handleCall(phoneNumber)}
                activeOpacity={0.8}
            >
                <Ionicons
                    name="call"
                    size={24}
                    color={isPrimary ? '#fff' : primaryColor}
                />
                <View style={styles.phoneButtonContent}>
                    <Text style={[
                        styles.phoneLabel,
                        isPrimary ? styles.phoneLabelPrimary : { color: primaryColor }
                    ]}>
                        {label}
                    </Text>
                    <Text style={[
                        styles.phoneNumber,
                        isPrimary ? styles.phoneNumberPrimary : { color: '#333' }
                    ]}>
                        {phoneNumber}
                    </Text>
                </View>
                <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isPrimary ? '#fff' : '#999'}
                />
            </TouchableOpacity>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.centerContent}>
                    <Ionicons name="alert-circle" size={48} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: primaryColor }]}
                        onPress={fetchGuardInfo}
                    >
                        <Text style={styles.retryButtonText}>ลองใหม่</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!guardData) {
            return (
                <View style={styles.centerContent}>
                    <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.noDataText}>ไม่พบข้อมูลป้อมยาม</Text>
                </View>
            );
        }

        const hasGuardPost = guardData.guard_post?.id;
        const guardPhone1 = guardData.guard_phone;
        const guardPhone2 = guardData.guard_phone_2;
        const hasAnyPhone = guardPhone1 || guardPhone2;

        return (
            <View style={styles.contentContainer}>
                {/* Guard Post Info Card */}
                <View style={styles.guardInfoCard}>
                    <View style={[styles.guardIconContainer, { backgroundColor: primaryColor + '15' }]}>
                        <Ionicons name="shield-checkmark" size={32} color={primaryColor} />
                    </View>
                    <View style={styles.guardInfoText}>
                        {hasGuardPost ? (
                            <>
                                <Text style={styles.guardPostName}>
                                    {guardData.guard_post.name}
                                </Text>
                                <Text style={styles.guardZoneName}>
                                    ดูแลโซน: {guardData.zone_name || '-'}
                                </Text>
                            </>
                        ) : guardData.zone_name ? (
                            <>
                                <Text style={styles.guardPostName}>
                                    ป้อมยาม {guardData.zone_name}
                                </Text>
                                <Text style={styles.guardZoneName}>
                                    {guardData.guard_booth_info || 'ป้อมยามประจำโซน'}
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.guardPostName}>ป้อมยามหลัก</Text>
                        )}
                    </View>
                </View>

                {/* Unit Info */}
                <View style={styles.unitInfoRow}>
                    <Ionicons name="home-outline" size={16} color="#6B7280" />
                    <Text style={styles.unitInfoText}>
                        บ้านเลขที่ {guardData.unit_number || '-'} • {guardData.project_name || '-'}
                    </Text>
                </View>

                {/* Phone Buttons */}
                {hasAnyPhone ? (
                    <View style={styles.phoneButtonsContainer}>
                        {renderPhoneButton('เบอร์หลัก (โทรเลย)', guardPhone1, true)}
                        {renderPhoneButton('เบอร์สำรอง', guardPhone2, false)}
                    </View>
                ) : (
                    <View style={styles.noPhoneContainer}>
                        <Ionicons name="call-outline" size={24} color="#9CA3AF" />
                        <Text style={styles.noPhoneText}>
                            ไม่พบเบอร์โทรศัพท์ป้อมยาม
                        </Text>
                        <Text style={styles.noPhoneSubText}>
                            กรุณาติดต่อนิติบุคคล
                        </Text>
                    </View>
                )}

                {/* Guard Booth Info */}
                {guardData.guard_booth_info && (
                    <View style={styles.boothInfoContainer}>
                        <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                        <Text style={styles.boothInfoText}>
                            {guardData.guard_booth_info}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    style={styles.modalContainer}
                    activeOpacity={1}
                    onPress={() => { }} // Prevent closing when clicking inside
                >
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: primaryColor }]}>
                        <View style={styles.headerIconContainer}>
                            <Ionicons name="shield" size={28} color="#fff" />
                        </View>
                        <Text style={styles.headerTitle}>เรียก รปภ.</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    {renderContent()}

                    {/* Footer */}
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                    >
                        <Text style={styles.cancelButtonText}>ปิด</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: width - 40,
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingVertical: 20,
    },
    headerIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: 'Kanit_700Bold',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 20,
    },
    centerContent: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
        fontFamily: 'Kanit_400Regular',
    },
    errorText: {
        marginTop: 12,
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
        fontFamily: 'Kanit_400Regular',
    },
    noDataText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        fontFamily: 'Kanit_400Regular',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Kanit_400Regular',
    },
    guardInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    guardIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    guardInfoText: {
        flex: 1,
    },
    guardPostName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        fontFamily: 'Kanit_700Bold',
    },
    guardZoneName: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
        fontFamily: 'Kanit_400Regular',
    },
    unitInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    unitInfoText: {
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 6,
        fontFamily: 'Kanit_400Regular',
    },
    phoneButtonsContainer: {
        gap: 12,
    },
    phoneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
    },
    phoneButtonSecondary: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    phoneButtonContent: {
        flex: 1,
        marginLeft: 12,
    },
    phoneLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    phoneLabelPrimary: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: 'Kanit_400Regular',
    },
    phoneNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    phoneNumberPrimary: {
        color: '#fff',
        fontFamily: 'Kanit_700Bold',
    },
    noPhoneContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
    },
    noPhoneText: {
        marginTop: 8,
        fontSize: 14,
        color: '#6B7280',
        fontFamily: 'Kanit_400Regular',
    },
    noPhoneSubText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
        fontFamily: 'Kanit_400Regular',
    },
    boothInfoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 16,
        padding: 12,
        backgroundColor: '#F0F9FF',
        borderRadius: 8,
    },
    boothInfoText: {
        flex: 1,
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 8,
        fontFamily: 'Kanit_400Regular',
    },
    cancelButton: {
        padding: 16,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#6B7280',
        fontFamily: 'Kanit_400Regular',
    },
});

export default CallGuardModal;
