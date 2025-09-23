import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Image,
    ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNavigation from '../components/BottomNavigation';

const HomeScreen = ({ navigation }) => {
    const renderMenuItem = (icon, label, onPress) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuIconContainer}>
                <Ionicons name={icon} size={24} color="#666" />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>

            {/* แทนที่ View ด้วย ImageBackground */}
            <ImageBackground
                source={require('../assets/mockup_banner_header_2.svg')}
                style={styles.headerBackground}
                resizeMode="cover"
                imageStyle={{ // เพิ่ม style สำหรับรูปภาพ
                    width: '100%',
                    height: '100%'
                }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logoText}>logo</Text>
                        </View>
                        <TouchableOpacity style={styles.notificationButton}>
                            <Ionicons name="notifications-outline" size={24} color="#fff" />
                            <View style={styles.notificationBadge}>
                                <Text style={styles.badgeText}>5</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* บ้านของฉัน */}
                <TouchableOpacity style={styles.homeAddressCard}>
                    <View style={styles.addressIcon}>
                        <Ionicons name="home-outline" size={24} color="#fff" />
                    </View>
                    <View style={styles.addressContent}>
                        <Text style={[styles.addressLabel, { color: '#fff' }]}>บ้านของฉัน</Text>
                        <Text style={[styles.addressText, { color: '#fff' }]}>77/392 พฤษภา30/1</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                </TouchableOpacity>
            </ImageBackground>

            <ScrollView style={styles.content}>
                {/* ข้อมูลหมู่บ้านและบ้าน */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ข้อมูลหมู่บ้านและบ้าน</Text>
                    <View style={styles.menuGrid}>
                        <TouchableOpacity style={styles.menuButton}>
                            <Ionicons name="home-outline" size={24} color="#666" />
                            <Text style={styles.menuText}>บ้านของฉัน</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuButton}>
                            <Ionicons name="people-outline" size={24} color="#666" />
                            <Text style={styles.menuText}>หมู่บ้านของฉัน</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* รายการโปรด */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>รายการโปรด</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>ดูเพิ่มเติม {'>'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.favoriteGrid}>
                        {renderMenuItem('megaphone-outline', 'ข่าวสาร', () => { })}
                        {renderMenuItem('warning-outline', 'แจ้งปัญหา', () => { })}
                        {renderMenuItem('car-outline', 'ผู้มาเยี่ยม', () => { })}
                        {renderMenuItem('chatbubble-outline', 'ขอความช่วยเหลือ', () => { })}
                    </View>
                </View>

                {/* ข่าวสารและประกาศ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ข่าวสารและประกาศ</Text>
                    <View style={styles.newsContainer}>
                        <View style={styles.newsImage}>
                            <Text style={styles.placeholderText}>News Image</Text>
                        </View>
                    </View>
                </View>
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
        backgroundColor: '#f5f5f5',
    },
    headerBackground: {
        backgroundColor: '#666', // ใส่สีไว้ก่อนเป็น placeholder
        // เมื่อมีรูปให้ใช้:
        // backgroundImage: require('../assets/header-bg.png'),
        // backgroundSize: 'cover',
        paddingBottom: 16,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'transparent', // ทำให้พื้นหลังโปร่งใส
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    notificationButton: {
        position: 'relative',
        padding: 8,
    },
    notificationBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'red',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
    },
    logoContainer: {
        backgroundColor: '#666',
        padding: 8,
        borderRadius: 8,
    },
    logoText: {
        color: '#fff',
    },
    content: {
        flex: 1,
    },
    homeAddressCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)', // เปลี่ยนเป็นโปร่งใสเล็กน้อย
        margin: 16,
        marginTop: 8,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    addressIcon: {
        backgroundColor: '#666',
        padding: 8,
        borderRadius: 8,
        marginRight: 12,
    },
    addressContent: {
        flex: 1,
    },
    addressLabel: {
        fontSize: 14,
        color: '#666',
    },
    addressText: {
        fontSize: 16,
        fontWeight: '600',
    },
    section: {
        padding: 16,
        backgroundColor: '#fff',
        marginBottom: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    seeAllText: {
        color: '#666',
    },
    menuGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    menuButton: {
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        width: '45%',
    },
    menuText: {
        marginTop: 8,
        color: '#666',
    },
    favoriteGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    menuItem: {
        width: '23%',
        alignItems: 'center',
        marginBottom: 16,
    },
    menuIconContainer: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    menuLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    newsContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    newsImage: {
        width: '100%',
        height: 200,
        backgroundColor: '#f5f5f5',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    navItem: {
        alignItems: 'center',
    },
    navText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
});

export default HomeScreen;
