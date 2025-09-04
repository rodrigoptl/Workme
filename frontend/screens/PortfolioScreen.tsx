import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { showMessage } from 'react-native-flash-message';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';
const { width } = Dimensions.get('window');

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  image_data: string;
  category: string;
  work_date?: string;
  client_feedback?: string;
  created_at: string;
}

interface PortfolioScreenProps {
  navigation: any;
}

export default function PortfolioScreen({ navigation }: PortfolioScreenProps) {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');
  const [imageData, setImageData] = useState('');

  const categories = [
    'Casa & Construção',
    'Limpeza & Diarista',
    'Beleza & Bem-estar',
    'Tecnologia & Suporte',
    'Cuidados com Pets',
    'Eventos & Serviços',
  ];

  useEffect(() => {
    if (user?.user_type !== 'professional') {
      navigation.goBack();
      return;
    }
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/portfolio/${user?.id}`);
      setPortfolio(response.data.portfolio);
    } catch (error: any) {
      console.error('Error fetching portfolio:', error);
      showMessage({
        message: 'Erro ao carregar portfólio',
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

  const pickImage = async () => {
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
          setImageData(asset.base64);
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

  const takePhoto = async () => {
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
          setImageData(asset.base64);
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

  const showImagePicker = () => {
    Alert.alert(
      'Adicionar foto',
      'Como você gostaria de adicionar a foto do trabalho?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Câmera', onPress: takePhoto },
        { text: 'Galeria', onPress: pickImage },
      ]
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedCategory('');
    setClientFeedback('');
    setImageData('');
  };

  const addPortfolioItem = async () => {
    if (!title || !description || !selectedCategory || !imageData) {
      showMessage({
        message: 'Preencha todos os campos obrigatórios',
        type: 'warning',
      });
      return;
    }

    setUploading(true);
    try {
      await axios.post(`${API_BASE_URL}/portfolio/upload`, {
        title,
        description,
        image_data: imageData,
        category: selectedCategory,
        client_feedback: clientFeedback,
      });

      showMessage({
        message: 'Item adicionado ao portfólio!',
        type: 'success',
      });

      resetForm();
      setAddModalVisible(false);
      fetchPortfolio();
    } catch (error: any) {
      console.error('Upload error:', error);
      showMessage({
        message: error.response?.data?.detail || 'Erro ao adicionar item',
        type: 'danger',
      });
    } finally {
      setUploading(false);
    }
  };

  const deletePortfolioItem = async (itemId: string) => {
    Alert.alert(
      'Excluir item',
      'Tem certeza que deseja excluir este item do portfólio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/portfolio/${itemId}`);
              showMessage({
                message: 'Item excluído com sucesso!',
                type: 'success',
              });
              fetchPortfolio();
            } catch (error: any) {
              showMessage({
                message: 'Erro ao excluir item',
                type: 'danger',
              });
            }
          },
        },
      ]
    );
  };

  const renderPortfolioItem = ({ item }: { item: PortfolioItem }) => {
    return (
      <TouchableOpacity
        style={styles.portfolioItem}
        onPress={() => setSelectedImage(`data:image/jpeg;base64,${item.image_data}`)}
      >
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.image_data}` }}
          style={styles.portfolioImage}
        />
        <View style={styles.portfolioOverlay}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deletePortfolioItem(item.id)}
          >
            <Ionicons name="trash" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.portfolioInfo}>
          <Text style={styles.portfolioTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.portfolioCategory}>{item.category}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando portfólio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Portfólio</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {portfolio.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={64} color="#48484A" />
          <Text style={styles.emptyStateTitle}>Nenhum trabalho ainda</Text>
          <Text style={styles.emptyStateDescription}>
            Adicione fotos dos seus trabalhos para mostrar sua qualidade aos clientes
          </Text>
          <TouchableOpacity
            style={styles.addFirstButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addFirstButtonText}>Adicionar Primeiro Trabalho</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={portfolio}
          renderItem={renderPortfolioItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.portfolioGrid}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Portfolio Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Adicionar Trabalho</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Image Selection */}
            <TouchableOpacity style={styles.imageSelector} onPress={showImagePicker}>
              {imageData ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${imageData}` }}
                  style={styles.selectedImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera" size={32} color="#8E8E93" />
                  <Text style={styles.imagePlaceholderText}>Adicionar foto</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Título do trabalho *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Reforma de cozinha"
                placeholderTextColor="#8E8E93"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Descrição *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Descreva o trabalho realizado..."
                placeholderTextColor="#8E8E93"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Category */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categorySelector}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category && styles.categoryChipSelected,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selectedCategory === category && styles.categoryChipTextSelected,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Client Feedback */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Feedback do cliente (opcional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="O que o cliente disse sobre o trabalho?"
                placeholderTextColor="#8E8E93"
                value={clientFeedback}
                onChangeText={setClientFeedback}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.addButton, uploading && styles.addButtonDisabled]}
              onPress={addPortfolioItem}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Adicionar ao Portfólio</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImage} transparent>
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} />
          )}
        </View>
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
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
    lineHeight: 20,
    marginBottom: 24,
  },
  addFirstButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  portfolioGrid: {
    padding: 16,
  },
  portfolioItem: {
    flex: 1,
    margin: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#38383A',
  },
  portfolioImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#38383A',
  },
  portfolioOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioInfo: {
    padding: 12,
  },
  portfolioTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  portfolioCategory: {
    fontSize: 12,
    color: '#8E8E93',
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
  imageSelector: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#38383A',
    borderStyle: 'dashed',
    marginBottom: 24,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  imagePlaceholderText: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 8,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  inputContainer: {
    marginBottom: 20,
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
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  addButtonDisabled: {
    backgroundColor: '#48484A',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width - 40,
    height: width - 40,
    borderRadius: 12,
  },
});