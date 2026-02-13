import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const repairTypes = [
    { id: 1, value: 'electrical', name: 'ระบบไฟฟ้า', icon: 'flash-on' },
    { id: 2, value: 'plumbing', name: 'ระบบประปา', icon: 'water-drop' },
    { id: 3, value: 'air_conditioning', name: 'ระบบปรับอากาศ', icon: 'ac-unit' },
    { id: 4, value: 'door_window', name: 'ระบบประตู-หน้าต่าง', icon: 'window' },
    { id: 5, value: 'wall_roof', name: 'ระบบผนัง-ฝ้าเพดาน', icon: 'wallpaper' },
    { id: 6, value: 'sanitary', name: 'ระบบสุขภัณฑ์', icon: 'bathtub' },
    { id: 7, value: 'other', name: 'อื่นๆ', icon: 'more-horiz' },
];

export default function RepairTypeModal({ visible, onClose, onSelectType, primaryColor = "#2A405E" }) {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>เลือกประเภทงานซ่อม</Text>

                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.modalDescription}>เลือกรายการที่คุณต้องการแจ้งซ่อม</Text>

                    <View style={styles.typeList}>
                        {repairTypes.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                style={styles.typeItem}
                                onPress={() => onSelectType(type)}
                            >
                                <View style={[styles.typeIconContainer, { backgroundColor: primaryColor + '20' }]}>
                                    <MaterialIcons name={type.icon} size={24} color={primaryColor} />
                                </View>
                                <Text style={styles.typeName}>{type.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        // maxHeight: '100%',
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: "Kanit_500Medium",
    },
    modalDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
        textAlign: 'center',
        paddingBottom: 10,
        fontFamily: "Kanit_500Medium",
    },
    closeButton: {
        padding: 5,
    },
    typeList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        fontFamily: "Kanit_500Medium",
    },
    typeItem: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        fontFamily: "Kanit_500Medium",
    },
    typeIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        fontFamily: "Kanit_500Medium",
    },
    typeName: {
        fontSize: 14,
        color: '#333',
        flex: 1,
        fontFamily: "Kanit_500Medium",
    },
});
