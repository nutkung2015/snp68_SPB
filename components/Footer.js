import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

/**
 * Footer Component - Reusable footer for app screens
 * 
 * @param {Object} props
 * @param {string} props.companyName - Company name to display (default: "LivLink Co., Ltd.")
 * @param {number} props.year - Copyright year (default: current year)
 * @param {Object} props.logoSource - Custom logo source (default: livlink_logo.png)
 * @param {Object} props.style - Additional container styles
 */
const Footer = ({
    companyName = "LivLink Co., Ltd.",
    year = new Date().getFullYear(),
    logoSource,
    style
}) => {
    return (
        <View style={[styles.footerContainer, style]}>
            {/* Divider */}
            <View style={styles.footerDivider} />

            {/* Logo */}
            <Image
                source={logoSource || require("../assets/livlink_logo.png")}
                style={styles.footerLogo}
                resizeMode="contain"
            />

            {/* Copyright Text */}
            <Text style={styles.footerCopyright}>
                Copyright © {year} {companyName}
            </Text>
            <Text style={styles.footerSubtext}>
                All rights reserved.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    footerContainer: {
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: "#f8f9fa",
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#e9ecef",
    },
    footerDivider: {
        width: 60,
        height: 3,
        backgroundColor: "#1F7EFF",
        borderRadius: 2,
        marginBottom: 24,
    },
    footerLogo: {
        width: 120,
        height: 48,
        marginBottom: 16,
    },
    footerCopyright: {
        fontSize: 13,
        fontFamily: "Kanit_400Regular",
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 4,
    },
    footerSubtext: {
        fontSize: 12,
        fontFamily: "Kanit_400Regular",
        color: "#9CA3AF",
        textAlign: "center",
    },
});

export default Footer;
