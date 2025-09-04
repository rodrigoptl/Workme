import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { showMessage } from 'react-native-flash-message';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface PendingDocument {
  _id: string;
  document_type: string;
  file_name: string;
  user_name: string;
  user_email: string;
  uploaded_at: string;
  has_file: boolean;
}

interface AdminScreenProps {
  navigation: any;
}

export default function AdminScreen({ navigation }: AdminScreenProps) {
  const [activeTab, setActiveTab] = useState<'documents' | 'stats'>('documents');
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'documents') {
        await fetchPendingDocuments();
      } else {
        await fetchStats();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDocuments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/documents/pending`);
      setPendingDocuments(response.data.pending_documents);
    } catch (error: any) {
      console.error('Error fetching pending documents:', error);
      showMessage({
        message: 'Erro ao carregar documentos pendentes',
        type: 'danger',
      });
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/stats`);
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      showMessage({
        message: 'Erro ao carregar estatísticas',
        type: 'danger',
      });
    }
  };

  const fetchDocumentDetails = async (documentId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents/view/${documentId}`);
      setSelectedDocument(response.data);
      setReviewModalVisible(true);
    } catch (error: any) {
      console.error('Error fetching document details:', error);
      showMessage({
        message: 'Erro ao carregar detalhes do documento',
        type: 'danger',
      });
    }
  };

  const submitReview = async () => {
    if (!selectedDocument) return;

    setReviewing(true);
    try {
      await axios.post(`${API_BASE_URL}/admin/documents/review`, {
        document_id: selectedDocument._id,
        status: reviewStatus,
        admin_notes: adminNotes.trim() || undefined,
      });

      showMessage({
        message: `Documento ${reviewStatus === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso!`,
        type: 'success',
      });

      setReviewModalVisible(false);
      setSelectedDocument(null);
      setAdminNotes('');
      fetchPendingDocuments();

    } catch (error: any) {
      console.error('Review error:', error);
      showMessage({
        message: error.response?.data?.detail || 'Erro ao revisar documento',
        type: 'danger',
      });
    } finally {
      setReviewing(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      rg_front: 'RG - Frente',
      rg_back: 'RG - Verso',
      cpf: 'CPF',
      address_proof: 'Comprovante de Residência',
      selfie: 'Selfie com Documento',
      certificate: 'Certificado',
    };
    return labels[type] || type;
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

  const renderDocumentsTab = () => (
    <View style={styles.tabContent}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando documentos...</Text>
        </View>
      ) : pendingDocuments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#34C759" />
          <Text style={styles.emptyStateTitle}>Tudo em dia!</Text>
          <Text style={styles.emptyStateDescription}>
            Não há documentos pendentes para revisão
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {pendingDocuments.map((doc) => (
            <TouchableOpacity
              key={doc._id}
              style={styles.documentCard}
              onPress={() => fetchDocumentDetails(doc._id)}
            >
              <View style={styles.documentHeader}>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentType}>
                    {getDocumentTypeLabel(doc.document_type)}
                  </Text>
                  <Text style={styles.userName}>{doc.user_name}</Text>
                  <Text style={styles.userEmail}>{doc.user_email}</Text>
                </View>
                <View style={styles.documentMeta}>
                  <Text style={styles.uploadDate}>
                    {formatDate(doc.uploaded_at)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando estatísticas...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* User Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Usuários</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.total_users || 0}</Text>
                <Text style={styles.statLabel}>Total de Usuários</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.total_clients || 0}</Text>
                <Text style={styles.statLabel}>Clientes</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.total_professionals || 0}</Text>
                <Text style={styles.statLabel}>Profissionais</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.verified_professionals || 0}</Text>
                <Text style={styles.statLabel}>Verificados</Text>
              </View>
            </View>
          </View>

          {/* Booking Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Serviços</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.total_bookings || 0}</Text>
                <Text style={styles.statLabel}>Total de Serviços</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.completed_bookings || 0}</Text>
                <Text style={styles.statLabel}>Concluídos</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.active_bookings || 0}</Text>
                <Text style={styles.statLabel}>Ativos</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.pending_documents || 0}</Text>
                <Text style={styles.statLabel}>Docs Pendentes</Text>
              </View>
            </View>
          </View>

          {/* Financial Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Financeiro</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardLarge]}>
                <Text style={styles.statNumber}>
                  {formatCurrency(stats.total_transaction_volume || 0)}
                </Text>
                <Text style={styles.statLabel}>Volume Total</Text>
              </View>
              <View style={[styles.statCard, styles.statCardLarge]}>
                <Text style={styles.statNumber}>
                  {formatCurrency(stats.platform_revenue || 0)}
                </Text>
                <Text style={styles.statLabel}>Receita da Plataforma</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Painel Administrativo</Text>
        <TouchableOpacity onPress={fetchData}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.tabActive]}
          onPress={() => setActiveTab('documents')}
        >
          <Ionicons
            name="document-text"
            size={20}
            color={activeTab === 'documents' ? '#007AFF' : '#8E8E93'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'documents' && styles.tabTextActive,
            ]}
          >
            Documentos
          </Text>
          {pendingDocuments.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingDocuments.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons
            name="bar-chart"
            size={20}
            color={activeTab === 'stats' ? '#007AFF' : '#8E8E93'}
          />
          <Text
            style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}
          >
            Estatísticas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'documents' ? renderDocumentsTab() : renderStatsTab()}

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Revisar Documento</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedDocument && (
              <>
                {/* Document Info */}
                <View style={styles.documentReviewInfo}>
                  <Text style={styles.reviewDocType}>
                    {getDocumentTypeLabel(selectedDocument.document_type)}
                  </Text>
                  <Text style={styles.reviewUserName}>
                    {selectedDocument.user_name}
                  </Text>
                  <Text style={styles.reviewUploadDate}>
                    Enviado em: {formatDate(selectedDocument.uploaded_at)}
                  </Text>
                </View>

                {/* Document Image */}
                {selectedDocument.file_data && (
                  <View style={styles.documentImageContainer}>
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${selectedDocument.file_data}` }}
                      style={styles.documentImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Review Actions */}
                <View style={styles.reviewActions}>
                  <Text style={styles.reviewLabel}>Decisão:</Text>
                  <View style={styles.reviewButtons}>
                    <TouchableOpacity
                      style={[
                        styles.reviewButton,
                        styles.approveButton,
                        reviewStatus === 'approved' && styles.reviewButtonSelected,
                      ]}
                      onPress={() => setReviewStatus('approved')}
                    >
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      <Text style={styles.reviewButtonText}>Aprovar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.reviewButton,
                        styles.rejectButton,
                        reviewStatus === 'rejected' && styles.reviewButtonSelected,
                      ]}
                      onPress={() => setReviewStatus('rejected')}
                    >
                      <Ionicons name="close" size={20} color="#FFFFFF" />
                      <Text style={styles.reviewButtonText}>Rejeitar</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Admin Notes */}
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>
                    Observações {reviewStatus === 'rejected' && '(obrigatório para rejeição)'}:
                  </Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Adicione observações sobre a revisão..."
                    placeholderTextColor="#8E8E93"
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, reviewing && styles.submitButtonDisabled]}
                  onPress={submitReview}
                  disabled={reviewing || (reviewStatus === 'rejected' && !adminNotes.trim())}
                >
                  {reviewing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {reviewStatus === 'approved' ? 'Aprovar Documento' : 'Rejeitar Documento'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
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
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  documentCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#6D6D70',
  },
  documentMeta: {
    alignItems: 'flex-end',
  },
  uploadDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38383A',
  },
  statCardLarge: {
    minWidth: '100%',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
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
  documentReviewInfo: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  reviewDocType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  reviewUserName: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  reviewUploadDate: {
    fontSize: 12,
    color: '#6D6D70',
  },
  documentImageContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  documentImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  reviewActions: {
    marginBottom: 20,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  reviewButtonSelected: {
    opacity: 1,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#38383A',
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#48484A',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});