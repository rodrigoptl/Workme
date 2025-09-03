import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface ServiceCategory {
  name: string;
  icon: string;
  color: string;
  description: string;
}

const SERVICE_ICONS: { [key: string]: string } = {
  'Casa & Construção': 'hammer',
  'Limpeza & Diarista': 'sparkles',
  'Beleza & Bem-estar': 'cut',
  'Tecnologia & Suporte': 'phone-portrait',
  'Cuidados com Pets': 'paw',
  'Eventos & Serviços': 'calendar',
};

const SERVICE_COLORS: { [key: string]: string } = {
  'Casa & Construção': '#FF6B35',
  'Limpeza & Diarista': '#4ECDC4',
  'Beleza & Bem-estar': '#FFB6C1',
  'Tecnologia & Suporte': '#007AFF',
  'Cuidados com Pets': '#F7DC6F',
  'Eventos & Serviços': '#9B59B6',
};

const SERVICE_DESCRIPTIONS: { [key: string]: string } = {
  'Casa & Construção': 'Pedreiros, pintores, eletricistas, encanadores',
  'Limpeza & Diarista': 'Limpeza residencial, comercial, passadeiras',
  'Beleza & Bem-estar': 'Cabeleireiros, manicures, massagistas',
  'Tecnologia & Suporte': 'Assistência técnica, instalações',
  'Cuidados com Pets': 'Banho, tosa, dog walker, pet sitter',
  'Eventos & Serviços': 'Fotógrafos, garçons, decoração, música',
};

export default function ServicesScreen() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const renderCategoryCard = ({ item: category }: { item: string }) => {
    const isSelected = selectedCategory === category;
    const icon = SERVICE_ICONS[category] || 'construct';
    const color = SERVICE_COLORS[category] || '#007AFF';
    const description = SERVICE_DESCRIPTIONS[category] || 'Serviços profissionais';

    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          isSelected && { ...styles.categoryCardSelected, borderColor: color }
        ]}
        onPress={() => handleCategoryPress(category)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIconContainer, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon as any} size={24} color={color} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <Text style={styles.categoryDescription}>{description}</Text>
          </View>
          <Ionicons
            name={isSelected ? "chevron-up" : "chevron-down"}
            size={16}
            color="#8E8E93"
          />
        </View>

        {isSelected && (
          <View style={styles.categoryExpanded}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Profissionais</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Avaliações</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>R$ --</Text>
                <Text style={styles.statLabel}>Preço médio</Text>
              </View>
            </View>
            
            <TouchableOpacity style={[styles.exploreButton, { backgroundColor: color }]}>
              <Text style={styles.exploreButtonText}>Explorar Profissionais</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando categorias...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categorias de Serviços</Text>
        <Text style={styles.headerSubtitle}>
          Encontre profissionais qualificados em diversas áreas
        </Text>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryCard}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  listContainer: {
    padding: 24,
    paddingTop: 8,
  },
  categoryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38383A',
    overflow: 'hidden',
  },
  categoryCardSelected: {
    borderWidth: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#8E8E93',
  },
  categoryExpanded: {
    borderTopWidth: 1,
    borderTopColor: '#38383A',
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});