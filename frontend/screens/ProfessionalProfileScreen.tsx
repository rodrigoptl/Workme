import React, { useState, useEffect } from 'react';
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

interface ProfessionalProfileScreenProps {
  navigation: any;
}

export default function ProfessionalProfileScreen({ navigation }: ProfessionalProfileScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({});
  
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [serviceRadius, setServiceRadius] = useState('');
  const [location, setLocation] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const categories = [
    'Casa & Construção',
    'Limpeza & Diarista',
    'Beleza & Bem-estar',
    'Tecnologia & Suporte',
    'Cuidados com Pets',
    'Eventos & Serviços',
  ];

  const specialties = {
    'Casa & Construção': ['Pedreiro', 'Pintor', 'Eletricista', 'Encanador', 'Marceneiro', 'Vidraceiro'],
    'Limpeza & Diarista': ['Limpeza Residencial', 'Limpeza Comercial', 'Passadeira', 'Organização'],
    'Beleza & Bem-estar': ['Cabeleireiro', 'Manicure', 'Massagista', 'Maquiador', 'Barbeiro'],
    'Tecnologia & Suporte': ['Celular', 'Computador', 'TV', 'Instalação Internet', 'Câmeras'],
    'Cuidados com Pets': ['Banho e Tosa', 'Dog Walker', 'Pet Sitter', 'Adestramento'],
    'Eventos & Serviços': ['Fotógrafo', 'Garçom', 'Decoração', 'Música', 'Buffet'],
  };

  useEffect(() => {
    if (user?.user_type !== 'professional') {
      navigation.goBack();
      return;
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/profile/professional/${user?.id}`);
      const profileData = response.data;
      
      setProfile(profileData);
      setBio(profileData.bio || '');
      setExperienceYears(profileData.experience_years?.toString() || '');
      setHourlyRate(profileData.hourly_rate?.toString() || '');
      setServiceRadius(profileData.service_radius_km?.toString() || '');
      setLocation(profileData.location || '');
      setSelectedServices(profileData.services || []);
      setSelectedSpecialties(profileData.specialties || []);
      
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      showMessage({
        message: 'Erro ao carregar perfil',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updateData = {
        bio,
        experience_years: experienceYears ? parseInt(experienceYears) : undefined,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        service_radius_km: serviceRadius ? parseInt(serviceRadius) : undefined,
        location,
        services: selectedServices,
        specialties: selectedSpecialties,
      };

      const response = await axios.put(`${API_BASE_URL}/profile/professional`, updateData);
      
      showMessage({
        message: 'Perfil atualizado com sucesso!',
        description: `Progresso: ${Math.round(response.data.profile_completion)}%`,
        type: 'success',
      });

      fetchProfile(); // Refresh data
    } catch (error: any) {
      console.error('Save error:', error);
      showMessage({
        message: error.response?.data?.detail || 'Erro ao salvar perfil',
        type: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    if (selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  };

  const getAvailableSpecialties = () => {
    let available: string[] = [];
    selectedServices.forEach(service => {
      if (specialties[service as keyof typeof specialties]) {
        available = [...available, ...specialties[service as keyof typeof specialties]];
      }
    });
    return [...new Set(available)]; // Remove duplicates
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
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
        <Text style={styles.headerTitle}>Perfil Profissional</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Completude do Perfil</Text>
            <Text style={styles.progressPercentage}>
              {Math.round(profile.profile_completion || 0)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${profile.profile_completion || 0}%` },
              ]}
            />
          </View>
          <Text style={styles.progressDescription}>
            Perfis completos recebem mais contratações
          </Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Sobre você</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Conte um pouco sobre sua experiência profissional..."
              placeholderTextColor="#8E8E93"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Anos de experiência</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 5"
                placeholderTextColor="#8E8E93"
                value={experienceYears}
                onChangeText={setExperienceYears}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Valor por hora (R$)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 50"
                placeholderTextColor="#8E8E93"
                value={hourlyRate}
                onChangeText={setHourlyRate}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Localização</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: São Paulo, SP"
                placeholderTextColor="#8E8E93"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Raio de atendimento (km)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 10"
                placeholderTextColor="#8E8E93"
                value={serviceRadius}
                onChangeText={setServiceRadius}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorias de Serviços</Text>
          <Text style={styles.sectionDescription}>
            Selecione as categorias em que você atua
          </Text>
          
          <View style={styles.chipContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.chip,
                  selectedServices.includes(category) && styles.chipSelected,
                ]}
                onPress={() => toggleService(category)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedServices.includes(category) && styles.chipTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Specialties */}
        {selectedServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Especialidades</Text>
            <Text style={styles.sectionDescription}>
              Defina suas especialidades específicas
            </Text>
            
            <View style={styles.chipContainer}>
              {getAvailableSpecialties().map((specialty) => (
                <TouchableOpacity
                  key={specialty}
                  style={[
                    styles.chip,
                    selectedSpecialties.includes(specialty) && styles.chipSelected,
                  ]}
                  onPress={() => toggleSpecialty(specialty)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedSpecialties.includes(specialty) && styles.chipTextSelected,
                    ]}
                  >
                    {specialty}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.documentsButton}
            onPress={() => navigation.navigate('Documents')}
          >
            <Ionicons name="document-text" size={20} color="#007AFF" />
            <Text style={styles.documentsButtonText}>Gerenciar Documentos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.portfolioButton}
            onPress={() => navigation.navigate('Portfolio')}
          >
            <Ionicons name="images" size={20} color="#007AFF" />
            <Text style={styles.portfolioButtonText}>Meu Portfólio</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Perfil</Text>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
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
  row: {
    flexDirection: 'row',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  documentsButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  documentsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  portfolioButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  portfolioButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#48484A',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});