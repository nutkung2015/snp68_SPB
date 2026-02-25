import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    StatusBar,
    Modal,
    Animated,
    Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';

// Initial posts data
const initialPosts = [
    {
        userAlias: 'นายสมชาย ใจดี',
        emotionIcon: '😠',
        emotionTitle: 'อารมณ์ขุ่นข้องหมองใจ',
        discription: 'เพราะมีรถท่อดัง',
        subtitle: 'ซอย18',
        timePosted: '2 ชั่วโมงที่ผ่านมา',
    },
    {
        userAlias: 'นายสมหญิง ใจดำ',
        emotionIcon: '😠',
        emotionTitle: 'อารมณ์ว้าว',
        discription: 'เพราะมีรถขยะบีบน้ำ',
        subtitle: 'ซอย14',
        timePosted: '2 ชั่วโมงที่ผ่านมา',
    }
];



// แก้ไข EmotionPost component
const EmotionPost = ({ post }) => {
    const [showReactions, setShowReactions] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState(null);
    const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0 });

    const handleReactionPress = (event, reactionIcon) => {
        const { pageY, pageX } = event.nativeEvent;
        setReactionPosition({ x: pageX, y: pageY });
        setSelectedReaction(reactionIcon);
        setShowReactions(true);

        // ซ่อน reactions หลังจาก 2 วินาที
        setTimeout(() => {
            setShowReactions(false);
        }, 2000);
    };

    return (
        <View style={styles.postCard}>
            <View style={styles.postHeader}>
                <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                        <Ionicons name="person-circle" size={32} color="#666" />
                    </View>
                    <Text style={styles.userAlias}>{post.userAlias}</Text>
                </View>
                <Text style={styles.timePosted}>{post.timePosted}</Text>
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.emotionContainer}>
                    <Text style={styles.emotionIcon}>{post.emotionIcon}</Text>
                </View>

                <View style={styles.titleContainer}>
                    <Text style={styles.emotionTitle}>{post.emotionTitle}</Text>
                    <Text style={styles.discription}>{post.discription}</Text>
                </View>
            </View>

            <View style={styles.secondContainer}>
                {/* แทนที่ reactionsRow ด้วย single reaction button */}

                <View style={styles.containerSubtitle}>
                    <Text style={styles.subtitle}>{post.subtitle}</Text>
                </View>
            </View>





            {/* Reactions Popup */}
            {showReactions && (
                <View
                    style={[
                        styles.reactionsPopup,
                        {
                            position: 'absolute',
                            bottom: 0, // ปรับตำแหน่งตามต้องการ
                            left: 20,
                        }
                    ]}
                >
                    <View style={styles.reactionsRow}>
                        {['😢', '😐', '🙂', '😡', '❌'].map((emoji, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.reactionButton}
                                onPress={() => {
                                    setSelectedReaction(emoji);
                                    setShowReactions(false);
                                }}
                            >
                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            <View style={styles.actionButtonsContainer}>
                <View style={styles.reactionButtonContainer}>
                    <TouchableOpacity
                        style={styles.mainReactionButton}
                        onPress={(event) => handleReactionPress(event, '🙂')}
                    >
                        <Ionicons name="happy-outline" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>รายงาน</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
                    <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                        ดูรายละเอียด
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Create Post Modal Component (ย้ายออกมานอก NeighborhoodEmotionsScreen)
const CreatePostModal = ({ visible, onClose, onPost, selectedEmoji, setSelectedEmoji, postLocation, setPostLocation, isAnonymous, setIsAnonymous }) => {
    const [description, setDescription] = useState('');
    const [emotionTitle, setEmotionTitle] = useState('');

    const handlePost = () => {
        const newPost = {
            userAlias: isAnonymous ? 'ไม่ระบุตัวตน' : 'นายบุญถึง ใจดี',
            emotionIcon: selectedEmoji || '🤔',
            emotionTitle: emotionTitle || 'ความรู้สึก',
            discription: description,
            subtitle: postLocation,
            timePosted: 'เมื่อสักครู่',
        };
        onPost(newPost);
        // Reset form
        setDescription('');
        setEmotionTitle('');
        setSelectedEmoji(null);
        setPostLocation('');
        setIsAnonymous(false);
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.modalCloseButton}
                        >
                            <Text style={styles.modalCloseText}>ยกเลิก</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>สร้างโพสต์ใหม่</Text>
                        <TouchableOpacity style={styles.modalPostButton} onPress={handlePost}>
                            <Text style={styles.modalPostButtonText}>โพสต์</Text>
                        </TouchableOpacity>
                    </View>

                    <KeyboardAwareScrollView
                        enableOnAndroid={true}
                        extraScrollHeight={100}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Emoji Selection */}
                        <View style={styles.emojiSection}>
                            <Text style={styles.sectionTitle}>เลือกอารมณ์ของคุณ</Text>
                            <View style={styles.emojiGrid}>
                                {[
                                    { emoji: '😔', label: 'เศร้า' },
                                    { emoji: '😊', label: 'มีความสุข' },
                                    { emoji: '😡', label: 'โกรธ' },
                                    { emoji: '😨', label: 'กลัว' },
                                    { emoji: '🤢', label: 'รังเกียจ' },
                                    { emoji: '😮', label: 'ประหลาดใจ' },
                                ].map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.emojiButton,
                                            selectedEmoji === item.label && styles.selectedEmojiButton
                                        ]}
                                        onPress={() => setSelectedEmoji(item.label)}
                                    >
                                        <Text style={styles.emojiText}>{item.emoji}</Text>
                                        <Text style={styles.emojiLabel}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Location Input */}
                        <View style={styles.locationSection}>
                            <Text style={styles.sectionTitle}>ที่ไหน?</Text>
                            <TextInput
                                style={styles.locationInput}
                                placeholder="เลือกสถานที่..."
                                value={postLocation}
                                onChangeText={setPostLocation}
                            />
                        </View>

                        {/* Title Input */}
                        <View style={styles.descriptionSection}>
                            <Text style={styles.sectionTitle}>หัวข้อความรู้สึก</Text>
                            <TextInput
                                style={styles.locationInput}
                                placeholder="ระบุหัวข้อความรู้สึก..."
                                value={emotionTitle}
                                onChangeText={setEmotionTitle}
                            />
                        </View>

                        {/* Description Input */}
                        <View style={styles.descriptionSection}>
                            <Text style={styles.sectionTitle}>เหตุผล...</Text>
                            <TextInput
                                style={styles.descriptionInput}
                                placeholder="พิมพ์เหตุผลที่ทำให้คุณรู้สึก..."
                                multiline
                                textAlignVertical="top"
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>

                        {/* Anonymous Option */}
                        <View style={styles.anonymousSection}>
                            <Text style={styles.sectionTitle}>โพสต์แบบไม่ระบุตัวตน</Text>
                            <TouchableOpacity
                                style={styles.anonymousToggle}
                                onPress={() => setIsAnonymous(!isAnonymous)}
                            >
                                <View style={[
                                    styles.toggleButton,
                                    isAnonymous && styles.toggleButtonActive
                                ]}>
                                    <View style={[
                                        styles.toggleCircle,
                                        isAnonymous && styles.toggleCircleActive
                                    ]} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAwareScrollView>
                </View>
            </View>
        </Modal>
    );
};

const NeighborhoodEmotionsScreen = ({ navigation }) => {
    const [searchText, setSearchText] = useState('');
    const [selectedDate, setSelectedDate] = useState('วันนี้');
    const [selectedEmotion, setSelectedEmotion] = useState('อารมณ์ทั้งหมด');
    const [isCreatePostVisible, setIsCreatePostVisible] = useState(false);
    const [selectedEmoji, setSelectedEmoji] = useState(null);
    const [postLocation, setPostLocation] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [posts, setPosts] = useState(initialPosts);
    // posts state is now using initialPosts

    // เพิ่มฟังก์ชัน handleAddPost
    const handleAddPost = (newPost) => {
        setPosts([newPost, ...posts]); // เพิ่มโพสต์ใหม่ไว้ด้านบนสุด
        setIsCreatePostVisible(false); // ปิด modal หลังจากโพสต์
    };


    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

            {/* Navigation Bar */}
            <View style={styles.navBar}>
                <Text style={styles.navTitle}>ความรู้สึกเพื่อนบ้าน</Text>
                {/* Post Button */}
                <TouchableOpacity
                    style={styles.postButton}
                    onPress={() => setIsCreatePostVisible(true)}
                >
                    <Text style={styles.postButtonText}>+ โพสต์</Text>
                </TouchableOpacity>
            </View>

            {/* Create Post Modal */}
            <CreatePostModal
                visible={isCreatePostVisible}
                onClose={() => setIsCreatePostVisible(false)}
                onPost={handleAddPost}
                selectedEmoji={selectedEmoji}
                setSelectedEmoji={setSelectedEmoji}
                postLocation={postLocation}
                setPostLocation={setPostLocation}
                isAnonymous={isAnonymous}
                setIsAnonymous={setIsAnonymous}
            />

            {/* Search and Filters */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#666" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหาโพสต์จากสถานที่..."
                        placeholderTextColor="#666"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                <View style={styles.filtersRow}>
                    <TouchableOpacity style={styles.filterButton}>
                        <Text style={styles.filterButtonText}>{selectedDate} ▾</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.filterButton}>
                        <Text style={styles.filterButtonText}>{selectedEmotion} ▾</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resetButton}>
                        <Text style={styles.resetButtonText}>รีเซ็ต</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Posts List */}
            <ScrollView style={styles.postsContainer}>
                {posts.map((post, index) => (
                    <EmotionPost key={index} post={post} />
                ))}
            </ScrollView>

            {/* Bottom Tab Bar */}
            <View style={styles.tabBar}>
                {[
                    { icon: 'heart', label: 'ความรู้สึก' },
                    { icon: 'chatbubble', label: 'แชท' },
                    { icon: 'warning', label: 'รายงานปัญหา' },
                    { icon: 'person', label: 'โปรไฟล์' },
                ].map((tab, index) => (
                    <TouchableOpacity key={index} style={styles.tabItem}>
                        <Ionicons
                            name={tab.icon}
                            size={24}
                            color={index === 0 ? '#007AFF' : '#8E8E93'}
                        />
                        <Text style={[styles.tabLabel, index === 0 && styles.activeTabLabel]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    navTitle: {
        fontSize: 17,
        fontFamily: 'NotoSansThai_600SemiBold',
        color: '#000',
    },
    postButton: {
        backgroundColor: 'rgba(99, 99, 99, 1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    postButtonText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'NotoSansThai_600SemiBold',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 8,
        marginLeft: 8,
        fontSize: 16,
        color: '#000',
    },
    filtersRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterButton: {
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        marginRight: 8,
    },
    filterButtonText: {
        fontSize: 14,
        color: '#000',
    },
    resetButton: {
        marginLeft: 'auto',
    },
    resetButtonText: {
        color: 'rgba(99, 99, 99, 1)',
        fontSize: 14,
    },
    postsContainer: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    postCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        margin: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        marginRight: 8,
    },
    userAlias: {
        fontSize: 15,
        fontFamily: 'NotoSansThai_600SemiBold',
        color: '#000',
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
        paddingHorizontal: 4,
    },
    emotionContainer: {
        alignItems: 'left',
        marginVertical: 12,
        marginRight: 12,
    },
    titleContainer: {
    },
    emotionIcon: {
        fontSize: 48,
        marginBottom: 8,
    },
    emotionTitle: {
        fontSize: 18,
        fontFamily: 'NotoSansThai_600SemiBold',
        color: '#000',
    },
    discription: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    secondContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between', // เพิ่มการจัดวางแบบ space-between
        alignItems: 'center',
        marginVertical: 12,
        paddingHorizontal: 4,
        width: '100%', // ให้ container กินพื้นที่เต็มความกว้าง
    },
    containerSubtitle: {
        flex: 1, // ให้ส่วนนี้ยืดหยุ่นและใช้พื้นที่ที่เหลือ
        alignItems: 'flex-end', // จัดข้อความให้อยู่ขวา
        paddingLeft: 16, // เพิ่มระยะห่างจากปุ่ม reaction
    },

    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        textAlign: 'right', // จัดข้อความให้อยู่ขวา
    },
    timePosted: {
        fontSize: 12,
        color: '#8E8E93',
    },
    reactionButtonContainer: {
        // paddingVertical: 8,
        marginRight: 5, // เพิ่มระยะห่างจาก subtitle
    },
    mainReactionButton: {
        padding: 8,
        backgroundColor: '#ffffffff',
        borderColor: 'rgba(99, 99, 99, 1)',
        borderWidth: 1,
        borderRadius: 10,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionsPopup: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1000,
    },
    reactionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    reactionButton: {
        padding: 8,
        marginHorizontal: 4,
    },
    reactionEmoji: {
        fontSize: 20,
    },
    actionButtonsContainer: {
        height: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flex: 1,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 99, 99, 1)',
    },
    actionButtonText: {
        color: 'rgba(99, 99, 99, 1)',
        fontSize: 14,
        fontFamily: 'NotoSansThai_600SemiBold',
    },
    primaryButton: {
        backgroundColor: 'rgba(99, 99, 99, 1)',
    },
    primaryButtonText: {
        color: '#fff',
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    tabItem: {
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 10,
        color: '#8E8E93',
        marginTop: 4,
    },
    activeTabLabel: {
        color: '#007AFF',
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34, // สำหรับ iPhone X และใหม่กว่า
        minHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    modalCloseButton: {
        padding: 8,
    },
    modalCloseText: {
        color: '#424242ff',
        fontSize: 17,
    },
    modalTitle: {
        fontSize: 17,
        fontFamily: 'NotoSansThai_600SemiBold',
    },
    modalPostButton: {
        padding: 8,
    },
    modalPostButtonText: {
        color: '#474747ff',
        fontSize: 17,
        fontFamily: 'NotoSansThai_600SemiBold',
    },
    emojiSection: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontFamily: 'NotoSansThai_600SemiBold',
        marginBottom: 12,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 8,
        gap: 10,
    },
    emojiButton: {
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
        width: '30%',
        borderColor: '#F2F2F7',
        borderWidth: 2,
    },
    selectedEmojiButton: {
        backgroundColor: '#f1f1f1ff',
        borderColor: '#3b3b3bff',
        borderWidth: 2,
        // border: o
        // borderLn
    },
    emojiText: {
        fontSize: 32,
        marginBottom: 8,
    },
    emojiLabel: {
        fontSize: 13,
        color: '#666',
    },
    locationSection: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    locationInput: {
        backgroundColor: '#F2F2F7',
        padding: 12,
        borderRadius: 10,
        fontSize: 16,
    },
    descriptionSection: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    descriptionInput: {
        backgroundColor: '#F2F2F7',
        padding: 12,
        borderRadius: 10,
        fontSize: 16,
        height: 100,
    },
    anonymousSection: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    toggleButton: {
        width: 51,
        height: 31,
        backgroundColor: '#E5E5EA',
        borderRadius: 16,
        padding: 2,
    },
    toggleButtonActive: {
        backgroundColor: '#34C759',
    },
    toggleCircle: {
        width: 27,
        height: 27,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
    },
    toggleCircleActive: {
        transform: [{ translateX: 20 }],
    },
});

export default NeighborhoodEmotionsScreen;
