import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BottomNavigation = ({ navigation, activeScreen }) => {
    return (
        <View style={styles.bottomNav}>
            <TouchableOpacity 
                style={styles.navItem}
                onPress={() => navigation.navigate('Home')}
            >
                <Ionicons 
                    name="home-outline" 
                    size={24} 
                    color={activeScreen === 'Home' ? '#007AFF' : '#666'} 
                />
                <Text style={[
                    styles.navText,
                    activeScreen === 'Home' && { color: '#007AFF' }
                ]}>หน้าหลัก</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.navItem}
                onPress={() => navigation.navigate('Services')}
            >
                <Ionicons 
                    name="grid-outline" 
                    size={24} 
                    color={activeScreen === 'Services' ? '#007AFF' : '#666'} 
                />
                <Text style={styles.navText}>บริการ</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.navItem}
                onPress={() => navigation.navigate('Chat')}
            >
                <Ionicons 
                    name="chatbubble-outline" 
                    size={24} 
                    color={activeScreen === 'Chat' ? '#007AFF' : '#666'} 
                />
                <Text style={styles.navText}>แชท</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.navItem}
                onPress={() => navigation.navigate('Profile')}
            >
                <Ionicons 
                    name="person-outline" 
                    size={24} 
                    color={activeScreen === 'Profile' ? '#007AFF' : '#666'} 
                />
                <Text style={styles.navText}>โปรไฟล์</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
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

export default BottomNavigation;