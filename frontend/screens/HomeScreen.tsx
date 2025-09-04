import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useBeta } from '../contexts/BetaContext';
import { Ionicons } from '@expo/vector-icons';
import FloatingFeedbackButton from '../components/FloatingFeedbackButton';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  const { trackEvent } = useBeta();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Track screen view
    trackEvent('screen_view', 'HomeScreen');
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      trackEvent('button_click', 'HomeScreen', 'search', { query: searchQuery });
      navigation.navigate('SmartSearch', { query: searchQuery });
    }
  };

  const handleBookDemo = () => {
    // Demo booking with mock professional
    const mockProfessional = {
      id: 'demo-professional-123',
      name: 'João Silva',
      category: 'Casa & Construção',
      price: 'R$ 80,00'
    };
    
    navigation.navigate('Booking', { professional: mockProfessional });
  };

  const renderClientHomeContent = () => (
    <View style={styles.clientContainer}>
      <Text style={styles.welcomeText}>Olá, {user?.full_name}!</Text>
      <Text style={styles.subtitle}>O que você precisa hoje?</Text>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar profissionais..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Busque com Inteligência Artificial</Text>
        <TouchableOpacity style={styles.aiSearchButton} onPress={() => navigation.navigate('SmartSearch')}>
          <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          <View style={styles.aiSearchText}>
            <Text style={styles.aiSearchTitle}>Busca Inteligente</Text>
            <Text style={styles.aiSearchSubtitle}>Descreva o que precisa em linguagem natural</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.sectionTitle}>Categorias Populares</Text>
        <View style={styles.categoryGrid}>
          {[
            { name: 'Casa & Construção', icon: 'hammer' },
            { name: 'Limpeza', icon: 'sparkles' },
            { name: 'Beleza', icon: 'cut' },
            { name: 'Tecnologia', icon: 'phone-portrait' },
          ].map((category, index) => (
            <TouchableOpacity key={index} style={styles.categoryCard}>
              <Ionicons name={category.icon as any} size={24} color="#007AFF" />
              <Text style={styles.categoryText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Demo Booking Section */}
      <View style={styles.demoSection}>
        <Text style={styles.sectionTitle}>Teste o Sistema</Text>
        <TouchableOpacity style={styles.demoButton} onPress={handleBookDemo}>
          <Ionicons name="play-circle" size={20} color="#FFFFFF" />
          <Text style={styles.demoButtonText}>Testar Contratação de Serviço</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Histórico Recente</Text>
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#48484A" />
          <Text style={styles.emptyStateText}>Nenhum serviço contratado ainda</Text>
          <Text style={styles.emptyStateSubtext}>Encontre profissionais qualificados</Text>
        </View>
      </View>
    </View>
  );

  const renderProfessionalHomeContent = () => (
    <View style={styles.professionalContainer}>
      <Text style={styles.welcomeText}>Bem-vindo, {user?.full_name}!</Text>
      <Text style={styles.subtitle}>Gerencie seus serviços</Text>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Pedidos Pendentes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Serviços Concluídos</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Completar Perfil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButtonSecondary}>
          <Ionicons name="document" size={20} color="#007AFF" />
          <Text style={styles.actionButtonSecondaryText}>Enviar Documentos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Pedidos Recentes</Text>
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color="#48484A" />
          <Text style={styles.emptyStateText}>Nenhum pedido ainda</Text>
          <Text style={styles.emptyStateSubtext}>Complete seu perfil para receber pedidos</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {user?.user_type === 'client' ? renderClientHomeContent() : renderProfessionalHomeContent()}
      </ScrollView>
      <FloatingFeedbackButton screenName="HomeScreen" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  scrollContent: {
    flexGrow: 1,
  },
  clientContainer: {
    padding: 24,
  },
  professionalContainer: {
    padding: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 16,
  },
  quickActions: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38383A',
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38383A',
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
  actionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonSecondaryText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recentSection: {
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
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
  demoSection: {
    marginBottom: 32,
  },
  demoButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  aiSearchButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FF8A5B',
  },
  aiSearchText: {
    flex: 1,
    marginLeft: 16,
  },
  aiSearchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  aiSearchSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});