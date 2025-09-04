import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBeta } from '../contexts/BetaContext';
import * as ImagePicker from 'expo-image-picker';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  screenName: string;
}

const feedbackTypes = [
  { key: 'bug', label: 'Bug/Erro', icon: 'bug-outline', color: '#FF6B6B' },
  { key: 'suggestion', label: 'Sugestão', icon: 'bulb-outline', color: '#4ECDC4' },
  { key: 'complaint', label: 'Reclamação', icon: 'sad-outline', color: '#FFB84D' },
  { key: 'praise', label: 'Elogio', icon: 'happy-outline', color: '#51CF66' },
];

export default function FeedbackModal({ visible, onClose, screenName }: FeedbackModalProps) {
  const { submitFeedback } = useBeta();
  const [selectedType, setSelectedType] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [screenshotUri, setScreenshotUri] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSelectedType('');
    setRating(0);
    setMessage('');
    setScreenshotUri('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedType || !message.trim()) {
      Alert.alert('Campos obrigatórios', 'Por favor, selecione um tipo de feedback e escreva uma mensagem.');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await submitFeedback({
        screen_name: screenName,
        feedback_type: selectedType,
        rating: rating > 0 ? rating : undefined,
        message: message.trim(),
        screenshot_data: screenshotUri || undefined,
      });

      if (success) {
        Alert.alert(
          'Feedback enviado!',
          'Obrigado pelo seu feedback. Ele nos ajuda a melhorar o app.',
          [{ text: 'OK', onPress: handleClose }]
        );
      } else {
        Alert.alert('Erro', 'Não foi possível enviar o feedback. Tente novamente.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar o feedback. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const takeSreenshot = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setScreenshotUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
      Alert.alert('Erro', 'Não foi possível capturar a imagem.');
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        <Text style={styles.ratingLabel}>Como você avalia esta tela? (opcional)</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={32}
                color={star <= rating ? '#FFD700' : '#8E8E93'}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Enviar Feedback</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenInfo}>Tela: {screenName}</Text>

          {/* Feedback Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de Feedback</Text>
            <View style={styles.typeGrid}>
              {feedbackTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeButton,
                    selectedType === type.key && { backgroundColor: type.color + '20', borderColor: type.color }
                  ]}
                  onPress={() => setSelectedType(type.key)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={24}
                    color={selectedType === type.key ? type.color : '#8E8E93'}
                  />
                  <Text style={[
                    styles.typeLabel,
                    selectedType === type.key && { color: type.color }
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating */}
          {selectedType && renderStars()}

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sua Mensagem *</Text>
            <TextInput
              style={styles.messageInput}
              multiline
              numberOfLines={4}
              placeholder={`Descreva seu ${selectedType === 'bug' ? 'problema' : selectedType === 'suggestion' ? 'sugestão' : 'feedback'} em detalhes...`}
              placeholderTextColor="#8E8E93"
              value={message}
              onChangeText={setMessage}
              maxLength={500}
            />
            <Text style={styles.characterCount}>{message.length}/500</Text>
          </View>

          {/* Screenshot */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Anexar Imagem (opcional)</Text>
            <TouchableOpacity style={styles.screenshotButton} onPress={takeSreenshot}>
              <Ionicons name="camera-outline" size={24} color="#007AFF" />
              <Text style={styles.screenshotButtonText}>
                {screenshotUri ? 'Imagem Anexada' : 'Anexar Imagem'}
              </Text>
            </TouchableOpacity>
            {screenshotUri && (
              <TouchableOpacity onPress={() => setScreenshotUri('')}>
                <Text style={styles.removeScreenshot}>Remover imagem</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (!selectedType || !message.trim()) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedType || !message.trim() || isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#38383A',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  screenInfo: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38383A',
  },
  typeLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  starsContainer: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
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
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#38383A',
    minHeight: 120,
  },
  characterCount: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 12,
    color: '#8E8E93',
  },
  screenshotButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#38383A',
    borderStyle: 'dashed',
  },
  screenshotButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  removeScreenshot: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#FF6B6B',
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#38383A',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#38383A',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});