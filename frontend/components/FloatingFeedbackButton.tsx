import React, { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBeta } from '../contexts/BetaContext';
import FeedbackModal from './FeedbackModal';

interface FloatingFeedbackButtonProps {
  screenName: string;
}

export default function FloatingFeedbackButton({ screenName }: FloatingFeedbackButtonProps) {
  const { isBetaEnvironment } = useBeta();
  const [modalVisible, setModalVisible] = useState(false);
  const [scale] = useState(new Animated.Value(1));

  // Only show in beta environment
  if (!isBetaEnvironment) {
    return null;
  }

  const handlePress = () => {
    // Animation feedback
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setModalVisible(true);
  };

  return (
    <>
      <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* Beta badge */}
        <View style={styles.betaBadge}>
          <Text style={styles.betaText}>β</Text>
        </View>
      </Animated.View>

      <FeedbackModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        screenName={screenName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    zIndex: 1000,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  betaBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0C0C0C',
  },
  betaText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});