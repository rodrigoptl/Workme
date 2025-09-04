import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { showMessage } from 'react-native-flash-message';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface Wallet {
  balance: number;
  cashback_balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  payment_method: string;
  description: string;
  created_at: string;
}

export default function WalletScreen() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWalletData();
    fetchTransactions();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/wallet/${user?.id}`);
      setWallet(response.data);
    } catch (error: any) {
      console.error('Error fetching wallet:', error);
      showMessage({
        message: 'Erro ao carregar carteira',
        type: 'danger',
      });
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/${user?.id}`);
      setTransactions(response.data.transactions);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      showMessage({
        message: 'Digite um valor válido',
        type: 'warning',
      });
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/payment/deposit`, {
        amount: parseFloat(depositAmount),
        payment_method: selectedPaymentMethod,
      });

      if (selectedPaymentMethod === 'pix') {
        // For PIX, show QR code or PIX key (simplified for demo)
        Alert.alert(
          'PIX Gerado',
          `Use a chave PIX abaixo para fazer o depósito:\n\nChave: workme-pix-${response.data.payment_intent_id}\nValor: R$ ${depositAmount}`,
          [
            {
              text: 'Copiar Chave',
              onPress: () => {
                showMessage({
                  message: 'Chave PIX copiada!',
                  type: 'success',
                });
              },
            },
            { text: 'OK' },
          ]
        );
      } else {
        // For credit card, would integrate with Stripe Elements
        showMessage({
          message: 'Integração com cartão em desenvolvimento',
          type: 'info',
        });
      }

      setDepositModalVisible(false);
      setDepositAmount('');
      
      // Simulate successful payment for demo
      setTimeout(() => {
        fetchWalletData();
        fetchTransactions();
        showMessage({
          message: 'Depósito realizado com sucesso!',
          type: 'success',
        });
      }, 2000);

    } catch (error: any) {
      console.error('Deposit error:', error);
      showMessage({
        message: error.response?.data?.detail || 'Erro ao processar depósito',
        type: 'danger',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showMessage({
        message: 'Digite um valor válido',
        type: 'warning',
      });
      return;
    }

    if (!pixKey) {
      showMessage({
        message: 'Digite uma chave PIX válida',
        type: 'warning',
      });
      return;
    }

    setProcessing(true);
    try {
      await axios.post(`${API_BASE_URL}/payment/withdraw`, {
        amount: parseFloat(withdrawAmount),
        pix_key: pixKey,
      });

      showMessage({
        message: 'Saque realizado com sucesso!',
        type: 'success',
      });

      setWithdrawModalVisible(false);
      setWithdrawAmount('');
      setPixKey('');
      fetchWalletData();
      fetchTransactions();

    } catch (error: any) {
      console.error('Withdraw error:', error);
      showMessage({
        message: error.response?.data?.detail || 'Erro ao processar saque',
        type: 'danger',
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'add-circle';
      case 'withdrawal':
        return 'remove-circle';
      case 'cashback':
        return 'gift';
      case 'escrow_hold':
        return 'lock-closed';
      case 'escrow_release':
        return 'unlock';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'cashback':
      case 'escrow_release':
        return '#34C759';
      case 'withdrawal':
      case 'escrow_hold':
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando carteira...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo disponível</Text>
          <Text style={styles.balanceAmount}>
            {wallet ? formatCurrency(wallet.balance) : 'R$ 0,00'}
          </Text>
          
          {wallet && wallet.cashback_balance > 0 && (
            <View style={styles.cashbackContainer}>
              <Ionicons name="gift" size={16} color="#FF9500" />
              <Text style={styles.cashbackText}>
                Cashback: {formatCurrency(wallet.cashback_balance)}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.depositButton]}
            onPress={() => setDepositModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Depositar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.withdrawButton]}
            onPress={() => setWithdrawModalVisible(true)}
            disabled={!wallet || wallet.balance <= 0}
          >
            <Ionicons name="remove" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Sacar</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Histórico de Transações</Text>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#48484A" />
              <Text style={styles.emptyStateText}>Nenhuma transação ainda</Text>
              <Text style={styles.emptyStateSubtext}>
                Suas transações aparecerão aqui
              </Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.transactionIcon,
                      { backgroundColor: `${getTransactionColor(transaction.type)}20` },
                    ]}
                  >
                    <Ionicons
                      name={getTransactionIcon(transaction.type) as any}
                      size={20}
                      color={getTransactionColor(transaction.type)}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.created_at)}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: getTransactionColor(transaction.type) },
                  ]}
                >
                  {transaction.amount >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(transaction.amount))}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Deposit Modal */}
      <Modal
        visible={depositModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Depositar</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Valor do depósito</Text>
            <TextInput
              style={styles.input}
              placeholder="R$ 0,00"
              placeholderTextColor="#8E8E93"
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Método de pagamento</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  selectedPaymentMethod === 'pix' && styles.paymentMethodSelected,
                ]}
                onPress={() => setSelectedPaymentMethod('pix')}
              >
                <Ionicons name="flash" size={20} color="#007AFF" />
                <Text style={styles.paymentMethodText}>PIX</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  selectedPaymentMethod === 'credit_card' && styles.paymentMethodSelected,
                ]}
                onPress={() => setSelectedPaymentMethod('credit_card')}
              >
                <Ionicons name="card" size={20} color="#007AFF" />
                <Text style={styles.paymentMethodText}>Cartão</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, processing && styles.confirmButtonDisabled]}
              onPress={handleDeposit}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Depositar</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        visible={withdrawModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sacar</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Valor do saque</Text>
            <TextInput
              style={styles.input}
              placeholder="R$ 0,00"
              placeholderTextColor="#8E8E93"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Chave PIX</Text>
            <TextInput
              style={styles.input}
              placeholder="CPF, email ou telefone"
              placeholderTextColor="#8E8E93"
              value={pixKey}
              onChangeText={setPixKey}
            />

            <TouchableOpacity
              style={[styles.confirmButton, processing && styles.confirmButtonDisabled]}
              onPress={handleWithdraw}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Sacar</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 16,
    marginTop: 16,
  },
  scrollContent: {
    padding: 24,
  },
  balanceCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  cashbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  cashbackText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  depositButton: {
    backgroundColor: '#34C759',
  },
  withdrawButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6D6D70',
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
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
    flex: 1,
    padding: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 16,
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
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38383A',
    gap: 8,
  },
  paymentMethodSelected: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  paymentMethodText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmButtonDisabled: {
    backgroundColor: '#48484A',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});