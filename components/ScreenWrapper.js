import React from 'react';
import { View, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ScreenWrapper - Universal wrapper for all screens
 * Handles safe areas for Android, iOS, and Web/Browser
 * 
 * @param {object} props
 * @param {React.ReactNode} props.children - Screen content
 * @param {object} props.style - Additional styles for the container
 * @param {string} props.backgroundColor - Background color (default: '#fff')
 * @param {boolean} props.edges - Which edges to apply safe area (default: all)
 * @param {boolean} props.noTop - Skip top safe area padding
 * @param {boolean} props.noBottom - Skip bottom safe area padding
 */
export default function ScreenWrapper({
    children,
    style,
    backgroundColor = '#fff',
    edges,
    noTop = false,
    noBottom = false
}) {
    const insets = useSafeAreaInsets();

    // สร้าง padding สำหรับแต่ละ platform
    const getPadding = () => {
        if (Platform.OS === 'web') {
            // Web/Browser - ไม่ต้องจัดการ safe area
            return {};
        }

        return {
            paddingTop: noTop ? 0 : insets.top,
            paddingBottom: noBottom ? 0 : insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
        };
    };

    // ถ้าระบุ edges ให้ใช้ SafeAreaView
    if (edges) {
        return (
            <SafeAreaView
                style={[
                    styles.container,
                    { backgroundColor },
                    style
                ]}
                edges={edges}
            >
                {children}
            </SafeAreaView>
        );
    }

    // ใช้ View + manual padding สำหรับ control ที่ละเอียดกว่า
    return (
        <View
            style={[
                styles.container,
                { backgroundColor },
                getPadding(),
                style
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
