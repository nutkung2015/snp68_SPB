import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNavigation from '../components/BottomNavigation';

const ServiceScreen = ({ navigation }) => {
    const services = [
        {
            id: '1',
            title: 'ข่าวสารประกาศ',
            icon: 'megaphone-outline',
            onPress: () => navigation.navigate('News'),
        },
        {
            id: '2',
            title: 'แจ้งปัญหา',
            icon: 'warning-outline',
            onPress: () => navigation.navigate('ReportProblem'),
        },
        {
            id: '3',
            title: 'ผู้มาเยี่ยม',
            icon: 'car-outline',
            onPress: () => navigation.navigate('Visitors'),
        },
        {
            id: '4',
            title: 'ขอความช่วยเหลือ',
            icon: 'help-buoy-outline',
            onPress: () => navigation.navigate('Help'),
        },
        {
            id: '5',
            title: 'เบอร์ฉุกเฉิน',
            icon: 'call-outline',
            onPress: () => navigation.navigate('NumberEmergency'),
        },
        {
            id: '6',
            title: 'ค่าส่วนกลาง',
            icon: 'cash-outline',
            onPress: () => navigation.navigate('CommonFee'),
        },
    ];

    const renderServiceItem = ({ id, title, icon, onPress }) => (
        <TouchableOpacity
            key={id}
            style={styles.serviceItem}
            onPress={onPress}
        >
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={24} color="#666" />
            </View>
            <Text style={styles.serviceText}>{title}</Text>
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
                    {services.map(service => renderServiceItem(service))}
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            {/* <BottomNavigation
                navigation={navigation}
                activeScreen="Services"
            /> */}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingTop: 50, // สำหรับ status bar
    },
    backButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        color: '#000',
        fontSize: 16,
        marginLeft: 4,
    },
    titleContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    content: {
        flex: 1,
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        justifyContent: 'space-between',
    },
    serviceItem: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    serviceText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});

export default ServiceScreen;