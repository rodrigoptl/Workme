import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBeta } from '../contexts/BetaContext';
import { showMessage } from 'react-native-flash-message';

interface FeedbackButtonProps {
  screenName: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-right' | 'top-left';
}

export default function FeedbackButton({ 
  screenName, 
  position = 'bottom-right' 
}: FeedbackButtonProps) {
  const { submitFeedback, trackEvent, isBetaEnvironment } = useBeta();
  const [modalVisible, setModalVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>('suggestion');
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Only show in beta environment
  if (!isBetaEnvironment) return null;

  const feedbackTypes = [
    { key: 'bug', label: 'Bug/Erro', icon: 'bug', color: '#FF3B30' },
    { key: 'suggestion', label: 'Sugestão', icon: 'bulb', color: '#007AFF' },
    { key: 'complaint', label: 'Reclamação', icon: 'sad', color: '#FF9500' },
    { key: 'praise', label: 'Elogio', icon: 'happy', color: '#34C759' },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) {
      showMessage({
        message: 'Digite uma mensagem',
        type: 'warning',
      });
      return;
    }

    setSubmitting(true);
    
    const success = await submitFeedback({
      screen_name: screenName,
      feedback_type: feedbackType,
      rating: rating || undefined,
      message: message.trim(),
    });

    if (success) {
      showMessage({
        message: 'Feedback enviado!',
        description: 'Obrigado por nos ajudar a melhorar',
        type: 'success',
      });
      
      // Track feedback submission
      trackEvent('feedback_submitted', screenName, 'feedback_modal', {
        feedback_type: feedbackType,
        rating,
        message_length: message.length,
      });
      
      // Reset form
      setMessage('');
      setRating(0);
      setFeedbackType('suggestion');
      setModalVisible(false);
    } else {
      showMessage({
        message: 'Erro ao enviar feedback',
        description: 'Tente novamente mais tarde',
        type: 'danger',
      });
    }
    
    setSubmitting(false);
  };

  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 999,
    };

    switch (position) {
      case 'bottom-left':
        return { ...baseStyle, bottom: 100, left: 20 };
      case 'bottom-right':
        return { ...baseStyle, bottom: 100, right: 20 };
      case 'top-left':
        return { ...baseStyle, top: 100, left: 20 };
      case 'top-right':
        return { ...baseStyle, top: 100, right: 20 };
      default:
        return { ...baseStyle, bottom: 100, right: 20 };
    }
  };

  const openModal = () => {
    setModalVisible(true);
    trackEvent('feedback_modal_opened', screenName, 'feedback_button');
  };

  const closeModal = () => {
    setModalVisible(false);
    trackEvent('feedback_modal_closed', screenName, 'close_button');
  };

  return (
    <>
      {/* Floating Feedback Button */}
      <TouchableOpacity
        style={[styles.feedbackButton, getPositionStyle()]}
        onPress={openModal}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Feedback Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Feedback Beta</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.screenInfo}>
              <Ionicons name="phone-portrait" size={16} color="#8E8E93" />
              <Text style={styles.screenInfoText}>Tela: {screenName}</Text>
            </View>

            <Text style={styles.sectionTitle}>Tipo de feedback</Text>
            <View style={styles.feedbackTypeGrid}>
              {feedbackTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.feedbackTypeButton,
                    feedbackType === type.key && styles.feedbackTypeButtonSelected,
                    { borderColor: type.color },
                  ]}
                  onPress={() => setFeedbackType(type.key)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={feedbackType === type.key ? type.color : '#8E8E93'}
                  />
                  <Text
                    style={[
                      styles.feedbackTypeText,
                      feedbackType === type.key && { color: type.color },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(feedbackType === 'suggestion' || feedbackType === 'praise') && (
              <>
                <Text style={styles.sectionTitle}>Avaliação (opcional)</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={32}
                        color={star <= rating ? '#FFD60A' : '#8E8E93'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Sua mensagem</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Descreva seu feedback aqui..."
              placeholderTextColor="#8E8E93"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Enviar Feedback</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.betaNote}>
              💡 Este feedback nos ajuda a melhorar o WorkMe durante o período beta.
              Suas sugestões são muito importantes!
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  feedbackButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#38383A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContent: {
    padding: 24,
  },
  screenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  screenInfoText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 16,
  },
  feedbackTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  feedbackTypeButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  feedbackTypeButtonSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  feedbackTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  messageInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#38383A',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#48484A',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  betaNote: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});