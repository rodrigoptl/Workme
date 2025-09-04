import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { showMessage } from 'react-native-flash-message';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  status: string;
  admin_notes?: string;
  uploaded_at: string;
  has_file: boolean;
}

interface DocumentsScreenProps {
  navigation: any;
}

const DOCUMENT_TYPES = [
  {
    type: 'rg_front',
    title: 'RG - Frente',
    description: 'Foto da frente do RG ou CNH',
    icon: 'card-outline',
    required: true,
  },
  {
    type: 'rg_back',
    title: 'RG - Verso',
    description: 'Foto do verso do RG ou CNH',
    icon: 'card-outline',
    required: true,
  },
  {
    type: 'cpf',
    title: 'CPF',
    description: 'Foto do CPF (se não constar na CNH)',
    icon: 'document-text-outline',
    required: true,
  },
  {
    type: 'address_proof',
    title: 'Comprovante de Residência',
    description: 'Conta de luz, água ou telefone',
    icon: 'home-outline',
    required: true,
  },
  {
    type: 'selfie',
    title: 'Selfie com Documento',
    description: 'Foto sua segurando o RG/CNH',
    icon: 'camera-outline',
    required: true,
  },
  {
    type: 'certificate',
    title: 'Certificados',
    description: 'Certificados profissionais (opcional)',
    icon: 'school-outline',
    required: false,
  },
];

export default function DocumentsScreen({ navigation }: DocumentsScreenProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);

  useEffect(() => {
    if (user?.user_type !== 'professional') {
      navigation.goBack();
      return;
    }
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents/${user?.id}`);
      setDocuments(response.data.documents);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      showMessage({
        message: 'Erro ao carregar documentos',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos da permissão para acessar suas fotos',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async (documentType: string) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          await uploadDocument(documentType, asset.base64, asset.fileName || 'document.jpg');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showMessage({
        message: 'Erro ao selecionar imagem',
        type: 'danger',
      });
    }
  };

  const takePhoto = async (documentType: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos da permissão para acessar a câmera',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          await uploadDocument(documentType, asset.base64, 'camera_photo.jpg');
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showMessage({
        message: 'Erro ao tirar foto',
        type: 'danger',
      });
    }
  };

  const uploadDocument = async (documentType: string, base64Data: string, fileName: string) => {
    setUploading(true);
    try {
      await axios.post(`${API_BASE_URL}/documents/upload`, {
        document_type: documentType,
        file_data: base64Data,
        file_name: fileName,
        description: `Upload de ${DOCUMENT_TYPES.find(dt => dt.type === documentType)?.title}`,
      });

      showMessage({
        message: 'Documento enviado com sucesso!',
        description: 'Aguarde a análise da nossa equipe',
        type: 'success',
      });

      fetchDocuments(); // Refresh the list
    } catch (error: any) {
      console.error('Upload error:', error);
      showMessage({
        message: error.response?.data?.detail || 'Erro ao enviar documento',
        type: 'danger',
      });
    } finally {
      setUploading(false);
    }
  };

  const showImagePicker = (documentType: string) => {
    setSelectedDocType(documentType);
    Alert.alert(
      'Selecionar imagem',
      'Como você gostaria de adicionar o documento?',
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => setSelectedDocType(null) },
        { text: 'Câmera', onPress: () => takePhoto(documentType) },
        { text: 'Galeria', onPress: () => pickImage(documentType) },
      ]
    );
  };

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find(d => d.document_type === docType);
    return doc ? doc.status : 'not_uploaded';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'pending':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'pending':
        return 'time';
      default:
        return 'add-circle-outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'pending':
        return 'Análise';
      default:
        return 'Enviar';
    }
  };

  const renderDocumentItem = (docConfig: any) => {
    const status = getDocumentStatus(docConfig.type);
    const document = documents.find(d => d.document_type === docConfig.type);

    return (
      <TouchableOpacity
        key={docConfig.type}
        style={styles.documentItem}
        onPress={() => status === 'not_uploaded' && showImagePicker(docConfig.type)}
        disabled={uploading}
      >
        <View style={styles.documentLeft}>
          <View
            style={[
              styles.documentIcon,
              { backgroundColor: `${getStatusColor(status)}20` },
            ]}
          >
            <Ionicons
              name={docConfig.icon as any}
              size={24}
              color={getStatusColor(status)}
            />
          </View>
          <View style={styles.documentInfo}>
            <View style={styles.documentHeader}>
              <Text style={styles.documentTitle}>{docConfig.title}</Text>
              {docConfig.required && (
                <Text style={styles.requiredLabel}>Obrigatório</Text>
              )}
            </View>
            <Text style={styles.documentDescription}>{docConfig.description}</Text>
            {document?.admin_notes && status === 'rejected' && (
              <Text style={styles.adminNotes}>Motivo: {document.admin_notes}</Text>
            )}
          </View>
        </View>
        <View style={styles.documentRight}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(status) },
            ]}
          >
            <Ionicons
              name={getStatusIcon(status) as any}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.statusText}>{getStatusText(status)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const calculateProgress = () => {
    const requiredDocs = DOCUMENT_TYPES.filter(dt => dt.required);
    const approvedDocs = requiredDocs.filter(dt => getDocumentStatus(dt.type) === 'approved');
    return (approvedDocs.length / requiredDocs.length) * 100;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando documentos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = calculateProgress();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documentos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progresso da Verificação</Text>
            <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.progressDescription}>
            {progress === 100
              ? 'Todos os documentos obrigatórios foram enviados!'
              : `${DOCUMENT_TYPES.filter(dt => dt.required && getDocumentStatus(dt.type) === 'approved').length} de ${DOCUMENT_TYPES.filter(dt => dt.required).length} documentos obrigatórios aprovados`}
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Verificação de Documentos</Text>
            <Text style={styles.infoDescription}>
              Envie fotos claras dos seus documentos. Nossa equipe analisa em até 24 horas.
              Documentos aprovados aumentam sua credibilidade.
            </Text>
          </View>
        </View>

        {/* Documents List */}
        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>Documentos</Text>
          {DOCUMENT_TYPES.map(renderDocumentItem)}
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {uploading && (
        <Modal transparent visible={uploading}>
          <View style={styles.uploadingOverlay}>
            <View style={styles.uploadingCard}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.uploadingText}>Enviando documento...</Text>
            </View>
          </View>
        </Modal>
      )}
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
  progressCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#38383A',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressDescription: {
    fontSize: 12,
    color: '#8E8E93',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  documentsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  documentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  requiredLabel: {
    fontSize: 10,
    color: '#FF9500',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  documentDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  adminNotes: {
    fontSize: 11,
    color: '#FF3B30',
    fontStyle: 'italic',
  },
  documentRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  uploadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
});