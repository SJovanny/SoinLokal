import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';

interface NetworkStatusToastProps {
  visible: boolean;
  onDismiss?: () => void;
}

const TOAST_HEIGHT = 56;
const AUTO_DISMISS_MS = 3000;

export default function NetworkStatusToast({ visible, onDismiss }: NetworkStatusToastProps) {
  const translateY = useRef(new Animated.Value(-TOAST_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -TOAST_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onDismiss?.());
      }, AUTO_DISMISS_MS);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: -TOAST_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={onDismiss}
        activeOpacity={0.8}
      >
        <Ionicons
          name="wifi-outline"
          size={20}
          color={COLORS.WHITE}
          style={styles.icon}
        />
        <Text style={styles.text}>Connexion internet perdue</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.WARNING,
    paddingVertical: SIZES.SM,
    paddingHorizontal: SIZES.MD,
    minHeight: TOAST_HEIGHT,
  },
  icon: {
    marginRight: SIZES.SM,
  },
  text: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
});
