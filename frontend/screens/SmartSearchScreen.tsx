import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { showMessage } from 'react-native-flash-message';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface MatchedProfessional {
  professional_id: string;
  score: number;
  reasoning: string;
  match_factors: {
    service_relevance: number;
    specialties_match?: number;
    location_score: number;
    rating_experience?: number;
    availability_fit?: number;
  };
  profile: {
    name: string;
    rating: number;
    reviews_count: number;
    services: string[];
    specialties: string[];
    location: string;
    hourly_rate?: number;
    portfolio_count: number;
    verification_status: string;
  };
}

interface SmartSearchScreenProps {
  navigation: any;
}

export default function SmartSearchScreen({ navigation }: SmartSearchScreenProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchedProfessional[]>([]);
  const [searchInterpretation, setSearchInterpretation] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchSearchSuggestions();
  }, []);

  const fetchSearchSuggestions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/search-suggestions`);
      setSearchSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const performSmartSearch = async () => {
    if (!searchQuery.trim()) {
      showMessage({
        message: 'Digite o que você precisa',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/ai/smart-search`, {
        query: searchQuery,
        location: user?.location || null,
        limit: 10,
      });

      setMatches(response.data.matches);
      setSearchInterpretation(response.data.search_interpretation);
      setSuggestions(response.data.suggestions);

      if (response.data.matches.length === 0) {
        showMessage({
          message: 'Nenhum profissional encontrado',
          description: 'Tente ajustar sua busca',
          type: 'info',
        });
      }

    } catch (error: any) {
      console.error('Smart search error:', error);
      showMessage({
        message: 'Erro na busca inteligente',
        description: error.response?.data?.detail || 'Tente novamente',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#34C759';
    if (score >= 80) return '#32D74B';
    if (score >= 70) return '#FFD60A';
    if (score >= 60) return '#FF9F0A';
    return '#FF453A';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const renderMatchedProfessional = ({ item }: { item: MatchedProfessional }) => {
    return (
      <TouchableOpacity
        style={styles.professionalCard}
        onPress={() => {
          // Navigate to professional details or booking
          navigation.navigate('Booking', {
            professional: {
              id: item.professional_id,
              name: item.profile.name,
              category: item.profile.services[0] || 'Serviços Gerais',
              price: item.profile.hourly_rate ? formatCurrency(item.profile.hourly_rate) : 'A combinar',
            },
          });
        }}
      >
        <View style={styles.professionalHeader}>
          <View style={styles.professionalAvatar}>
            <Text style={styles.professionalAvatarText}>
              {item.profile.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.professionalInfo}>
            <Text style={styles.professionalName}>{item.profile.name}</Text>
            <View style={styles.professionalMeta}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD60A" />
                <Text style={styles.ratingText}>
                  {item.profile.rating.toFixed(1)} ({item.profile.reviews_count})
                </Text>
              </View>
              {item.profile.verification_status === 'verified' && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                  <Text style={styles.verifiedText}>Verificado</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.matchScore}>
            <Text style={[styles.scoreText, { color: getScoreColor(item.score) }]}>
              {Math.round(item.score)}%
            </Text>
            <Text style={styles.matchLabel}>Match</Text>
          </View>
        </View>

        <Text style={styles.reasoningText}>{item.reasoning}</Text>

        <View style={styles.servicesContainer}>
          {item.profile.services.slice(0, 2).map((service, index) => (
            <View key={index} style={styles.serviceTag}>
              <Text style={styles.serviceTagText}>{service}</Text>
            </View>
          ))}
        </View>

        <View style={styles.professionalFooter}>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#8E8E93" />
            <Text style={styles.locationText}>{item.profile.location || 'Localização não informada'}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              {item.profile.hourly_rate ? formatCurrency(item.profile.hourly_rate) + '/h' : 'A combinar'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSuggestionChip = (suggestion: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.suggestionChip}
      onPress={() => {
        setSearchQuery(suggestion);
        performSmartSearch();
      }}
    >
      <Text style={styles.suggestionChipText}>{suggestion}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Busca Inteligente</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search Input */}
        <View style={styles.searchSection}>
          <Text style={styles.searchTitle}>O que você precisa?</Text>
          <Text style={styles.searchSubtitle}>
            Descreva naturalmente o serviço que está buscando
          </Text>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ex: Preciso de um eletricista para instalar chuveiro..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.searchButton, loading && styles.searchButtonDisabled]}
            onPress={performSmartSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                <Text style={styles.searchButtonText}>Buscar com IA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Suggestions */}
        {!loading && matches.length === 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsTitle}>Exemplos de busca:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.suggestionsContainer}>
                {searchSuggestions.slice(0, 5).map(renderSuggestionChip)}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Search Interpretation */}
        {searchInterpretation && (
          <View style={styles.interpretationSection}>
            <View style={styles.interpretationHeader}>
              <Ionicons name="bulb" size={16} color="#FF9500" />
              <Text style={styles.interpretationTitle}>Entendi que você procura:</Text>
            </View>
            <Text style={styles.interpretationText}>{searchInterpretation}</Text>
          </View>
        )}

        {/* Results */}
        {matches.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {matches.length} profissionais encontrados
            </Text>
            <FlatList
              data={matches}
              renderItem={renderMatchedProfessional}
              keyExtractor={(item) => item.professional_id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.aiSuggestionsSection}>
            <Text style={styles.aiSuggestionsTitle}>💡 Dicas da IA:</Text>
            {suggestions.map((suggestion, index) => (
              <View key={index} style={styles.aiSuggestionItem}>
                <Text style={styles.aiSuggestionText}>• {suggestion}</Text>
              </View>
            ))}
          </View>
        )}
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
  searchSection: {
    marginBottom: 24,
  },
  searchTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  searchSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38383A',
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 80,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#48484A',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsSection: {
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  suggestionChipText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  interpretationSection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  interpretationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  interpretationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  interpretationText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  resultsSection: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  professionalCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  professionalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  professionalAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  professionalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  matchScore: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  matchLabel: {
    fontSize: 10,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  reasoningText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 18,
  },
  servicesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  serviceTag: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  serviceTagText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  professionalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  aiSuggestionsSection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  aiSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  aiSuggestionItem: {
    marginBottom: 8,
  },
  aiSuggestionText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
});