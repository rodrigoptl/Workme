import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { showMessage } from 'react-native-flash-message';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface BookingScreenProps {
  route: {
    params: {
      professional: {
        id: string;
        name: string;
        category: string;
        price: string;
      };
    };
  };
  navigation: any;
}

export default function BookingScreen({ route, navigation }: BookingScreenProps) {
  const { user } = useAuth();
  const { professional } = route.params;
  
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceAmount, setServiceAmount] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const calculateFees = (amount: number) => {
    const platformFee = amount * 0.05;
    const cashback = amount * 0.02;
    return { platformFee, cashback };
  };

  const handleBooking = async () => {
    if (!serviceDescription || !serviceAmount || !scheduledDate) {
      showMessage({
        message: 'Preencha todos os campos',
        type: 'warning',
      });
      return;
    }

    const amount = parseFloat(serviceAmount);
    if (amount <= 0) {
      showMessage({
        message: 'Digite um valor válido',
        type: 'warning',
      });
      return;
    }

    Alert.alert(
      'Confirmar Contratação',
      `Você está contratando:\n\n` +
      `Profissional: ${professional.name}\n` +
      `Categoria: ${professional.category}\n` +
      `Valor: ${formatCurrency(amount)}\n\n` +
      `O pagamento será guardado em segurança até você confirmar a conclusão do serviço.\n\n` +
      `Após a conclusão, você receberá ${formatCurrency(calculateFees(amount).cashback)} em cashback!`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: confirmBooking },
      ]
    );
  };

  const confirmBooking = async () => {
    setLoading(true);
    try {
      const bookingData = {
        professional_id: professional.id,
        service_category: professional.category,
        description: serviceDescription,
        amount: parseFloat(serviceAmount),
        scheduled_date: new Date(scheduledDate).toISOString(),
      };

      const response = await axios.post(`${API_BASE_URL}/booking/create`, bookingData);

      if (response.data.status === 'success') {
        showMessage({
          message: 'Serviço contratado com sucesso!',
          description: 'O pagamento está em segurança até a conclusão',
          type: 'success',
          duration: 4000,
        });

        navigation.goBack();
      }

    } catch (error: any) {
      console.error('Booking error:', error);
      showMessage({
        message: error.response?.data?.detail || 'Erro ao contratar serviço',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const amount = parseFloat(serviceAmount) || 0;
  const fees = calculateFees(amount);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contratar Serviço</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Professional Info */}
        <View style={styles.professionalCard}>
          <View style={styles.professionalAvatar}>
            <Text style={styles.professionalAvatarText}>
              {professional.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.professionalInfo}>
            <Text style={styles.professionalName}>{professional.name}</Text>
            <Text style={styles.professionalCategory}>{professional.category}</Text>
            <Text style={styles.professionalPrice}>A partir de {professional.price}</Text>
          </View>
        </View>

        {/* Booking Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Detalhes do Serviço</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Descrição do serviço</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Descreva o serviço que você precisa..."
              placeholderTextColor="#8E8E93"
              value={serviceDescription}
              onChangeText={setServiceDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Valor acordado</Text>
            <TextInput
              style={styles.input}
              placeholder="R$ 0,00"
              placeholderTextColor="#8E8E93"
              value={serviceAmount}
              onChangeText={setServiceAmount}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Data do serviço</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#8E8E93"
              value={scheduledDate}
              onChangeText={setScheduledDate}
            />
          </View>
        </View>

        {/* Payment Summary */}
        {amount > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Resumo do Pagamento</Text>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Valor do serviço</Text>
              <Text style={styles.summaryValue}>{formatCurrency(amount)}</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Taxa da plataforma (5%)</Text>
              <Text style={styles.summaryValue}>-{formatCurrency(fees.platformFee)}</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cashback para você (2%)</Text>
              <Text style={[styles.summaryValue, styles.cashbackValue]}>
                +{formatCurrency(fees.cashback)}
              </Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryTotalLabel}>Total a pagar</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(amount)}</Text>
            </View>
          </View>
        )}

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <View style={styles.securityIcon}>
            <Ionicons name="shield-checkmark" size={24} color="#34C759" />
          </View>
          <View style={styles.securityText}>
            <Text style={styles.securityTitle}>Pagamento Seguro</Text>
            <Text style={styles.securityDescription}>
              Seu dinheiro fica em segurança até você confirmar que o serviço foi concluído.
              Se houver problemas, você pode solicitar reembolso.
            </Text>
          </View>
        </View>

        {/* Book Button */}
        <TouchableOpacity
          style={[styles.bookButton, loading && styles.bookButtonDisabled]}
          onPress={handleBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="calendar" size={20} color="#FFFFFF" />
              <Text style={styles.bookButtonText}>Contratar Serviço</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#38383A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
  },
  professionalCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  professionalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  professionalAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  professionalInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  professionalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  professionalCategory: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  professionalPrice: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  textArea: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#38383A',
    minHeight: 100,
  },
  summarySection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  cashbackValue: {
    color: '#34C759',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#38383A',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  securityInfo: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  securityIcon: {
    marginRight: 12,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  bookButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#48484A',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});