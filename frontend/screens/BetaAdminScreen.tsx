import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { showMessage } from 'react-native-flash-message';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface BetaStats {
  total_beta_users: number;
  active_sessions_today: number;
  total_feedback_count: number;
  average_session_time: number;
  top_screens: Array<{ _id: string; count: number }>;
  feedback_breakdown: Array<{ _id: string; count: number }>;
  conversion_funnel: {
    registered: number;
    verified_professionals: number;
    completed_bookings: number;
    registration_to_verification: number;
    verification_to_booking: number;
  };
  error_rate: number;
}

interface BetaFeedback {
  id: string;
  screen_name: string;
  feedback_type: string;
  rating?: number;
  message: string;
  user_name?: string;
  user_email?: string;
  user_type?: string;
  created_at: string;
}

interface BetaUser {
  id: string;
  full_name: string;
  email: string;
  user_type: string;
  beta_joined_at: string;
  last_activity?: string;
  session_count: number;
  feedback_count: number;
}

interface BetaAdminScreenProps {
  navigation: any;
}

export default function BetaAdminScreen({ navigation }: BetaAdminScreenProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'feedback' | 'users'>('stats');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Stats data
  const [stats, setStats] = useState<BetaStats | null>(null);
  
  // Feedback data
  const [feedback, setFeedback] = useState<BetaFeedback[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<string>('all');
  
  // Users data
  const [betaUsers, setBetaUsers] = useState<BetaUser[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'stats':
          await fetchStats();
          break;
        case 'feedback':
          await fetchFeedback();
          break;
        case 'users':
          await fetchBetaUsers();
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/beta/admin/stats`);
      setStats(response.data);
    } catch (error) {
      showMessage({
        message: 'Erro ao carregar estatísticas',
        type: 'danger',
      });
    }
  };

  const fetchFeedback = async () => {
    try {
      const params = feedbackFilter !== 'all' ? `?feedback_type=${feedbackFilter}` : '';
      const response = await axios.get(`${API_BASE_URL}/beta/admin/feedback${params}`);
      setFeedback(response.data.feedback);
    } catch (error) {
      showMessage({
        message: 'Erro ao carregar feedback',
        type: 'danger',
      });
    }
  };

  const fetchBetaUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/beta/admin/users`);
      setBetaUsers(response.data.beta_users);
    } catch (error) {
      showMessage({
        message: 'Erro ao carregar usuários beta',
        type: 'danger',
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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

  const getFeedbackTypeColor = (type: string) => {
    switch (type) {
      case 'bug':
        return '#FF3B30';
      case 'suggestion':
        return '#007AFF';
      case 'complaint':
        return '#FF9500';
      case 'praise':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const renderStatsTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : stats ? (
        <>
          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{stats.total_beta_users}</Text>
              <Text style={styles.metricLabel}>Usuários Beta</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{stats.active_sessions_today}</Text>
              <Text style={styles.metricLabel}>Sessões Hoje</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{stats.total_feedback_count}</Text>
              <Text style={styles.metricLabel}>Feedbacks</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{stats.error_rate}%</Text>
              <Text style={styles.metricLabel}>Taxa de Erro</Text>
            </View>
          </View>

          {/* Conversion Funnel */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Funil de Conversão</Text>
            <View style={styles.funnelContainer}>
              <View style={styles.funnelStep}>
                <Text style={styles.funnelNumber}>{stats.conversion_funnel.registered}</Text>
                <Text style={styles.funnelLabel}>Registrados</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
              <View style={styles.funnelStep}>
                <Text style={styles.funnelNumber}>{stats.conversion_funnel.verified_professionals}</Text>
                <Text style={styles.funnelLabel}>Verificados</Text>
                <Text style={styles.funnelPercent}>
                  {stats.conversion_funnel.registration_to_verification.toFixed(1)}%
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
              <View style={styles.funnelStep}>
                <Text style={styles.funnelNumber}>{stats.conversion_funnel.completed_bookings}</Text>
                <Text style={styles.funnelLabel}>Contratações</Text>
                <Text style={styles.funnelPercent}>
                  {stats.conversion_funnel.verification_to_booking.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Top Screens */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Telas Mais Visitadas</Text>
            {stats.top_screens.slice(0, 5).map((screen, index) => (
              <View key={screen._id} style={styles.screenItem}>
                <Text style={styles.screenName}>{screen._id || 'Tela desconhecida'}</Text>
                <Text style={styles.screenCount}>{screen.count} visitas</Text>
              </View>
            ))}
          </View>

          {/* Feedback Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipos de Feedback</Text>
            {stats.feedback_breakdown.map((item) => (
              <View key={item._id} style={styles.feedbackBreakdownItem}>
                <View
                  style={[
                    styles.feedbackTypeIndicator,
                    { backgroundColor: getFeedbackTypeColor(item._id) },
                  ]}
                />
                <Text style={styles.feedbackTypeLabel}>{item._id}</Text>
                <Text style={styles.feedbackTypeCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.errorText}>Erro ao carregar estatísticas</Text>
      )}
    </ScrollView>
  );

  const renderFeedbackTab = () => (
    <View style={styles.tabContent}>
      {/* Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {['all', 'bug', 'suggestion', 'complaint', 'praise'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              feedbackFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => setFeedbackFilter(filter)}
          >
            <Text
              style={[
                styles.filterButtonText,
                feedbackFilter === filter && styles.filterButtonTextActive,
              ]}
            >
              {filter === 'all' ? 'Todos' : filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feedback List */}
      <FlatList
        data={feedback}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.feedbackItem}>
            <View style={styles.feedbackHeader}>
              <View
                style={[
                  styles.feedbackTypeIndicator,
                  { backgroundColor: getFeedbackTypeColor(item.feedback_type) },
                ]}
              />
              <Text style={styles.feedbackScreenName}>{item.screen_name}</Text>
              <Text style={styles.feedbackDate}>{formatDate(item.created_at)}</Text>
            </View>
            
            {item.rating && (
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= item.rating! ? 'star' : 'star-outline'}
                    size={12}
                    color={star <= item.rating! ? '#FFD60A' : '#8E8E93'}
                  />
                ))}
              </View>
            )}
            
            <Text style={styles.feedbackMessage}>{item.message}</Text>
            
            {item.user_name && (
              <Text style={styles.feedbackUser}>
                {item.user_name} ({item.user_type}) - {item.user_email}
              </Text>
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  const renderUsersTab = () => (
    <FlatList
      style={styles.tabContent}
      data={betaUsers}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.userItem}>
          <View style={styles.userHeader}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {item.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.full_name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              <Text style={styles.userType}>{item.user_type}</Text>
            </View>
          </View>
          
          <View style={styles.userStats}>
            <View style={styles.userStat}>
              <Text style={styles.userStatNumber}>{item.session_count}</Text>
              <Text style={styles.userStatLabel}>Sessões</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatNumber}>{item.feedback_count}</Text>
              <Text style={styles.userStatLabel}>Feedbacks</Text>
            </View>
          </View>
          
          <Text style={styles.userJoinDate}>
            Entrou em: {formatDate(item.beta_joined_at)}
          </Text>
          
          {item.last_activity && (
            <Text style={styles.userLastActivity}>
              Última atividade: {formatDate(item.last_activity)}
            </Text>
          )}
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Painel Beta Admin</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
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
            style={[
              styles.tabText,
              activeTab === 'stats' && styles.tabTextActive,
            ]}
          >
            Estatísticas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'feedback' && styles.tabActive]}
          onPress={() => setActiveTab('feedback')}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={20}
            color={activeTab === 'feedback' ? '#007AFF' : '#8E8E93'}
          />
          <Text
            style={[styles.tabText, activeTab === 'feedback' && styles.tabTextActive]}
          >
            Feedback
          </Text>
          {feedback.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{feedback.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'users' ? '#007AFF' : '#8E8E93'}
          />
          <Text
            style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}
          >
            Usuários
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'stats' && renderStatsTab()}
      {activeTab === 'feedback' && renderFeedbackTab()}
      {activeTab === 'users' && renderUsersTab()}
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
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38383A',
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  funnelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  funnelStep: {
    alignItems: 'center',
    flex: 1,
  },
  funnelNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  funnelLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  funnelPercent: {
    fontSize: 10,
    color: '#34C759',
    marginTop: 2,
  },
  screenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  screenName: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  screenCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  feedbackBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  feedbackTypeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  feedbackTypeLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  feedbackTypeCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  feedbackItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackScreenName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 8,
  },
  feedbackUser: {
    fontSize: 12,
    color: '#8E8E93',
  },
  userItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  userType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  userStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  userStat: {
    alignItems: 'center',
  },
  userStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userStatLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  userJoinDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  userLastActivity: {
    fontSize: 12,
    color: '#34C759',
  },
});