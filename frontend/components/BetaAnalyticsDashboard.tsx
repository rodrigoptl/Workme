import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useBeta } from '../contexts/BetaContext';

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
  user_name?: string;
  user_email?: string;
  user_type?: string;
  screen_name: string;
  feedback_type: string;
  rating?: number;
  message: string;
  created_at: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function BetaAnalyticsDashboard() {
  const { isBetaEnvironment } = useBeta();
  const [stats, setStats] = useState<BetaStats | null>(null);
  const [feedback, setFeedback] = useState<BetaFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'feedback'>('stats');

  useEffect(() => {
    if (isBetaEnvironment) {
      fetchData();
    }
  }, [isBetaEnvironment]);

  const fetchData = async () => {
    try {
      const [statsResponse, feedbackResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/beta/admin/stats`),
        axios.get(`${API_BASE_URL}/beta/admin/feedback?limit=20`),
      ]);

      setStats(statsResponse.data);
      setFeedback(feedbackResponse.data.feedback || []);
    } catch (error) {
      console.error('Error fetching beta data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (!isBetaEnvironment) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Carregando dados do beta...</Text>
      </View>
    );
  }

  const renderStatsCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statsContent}>
        <Text style={styles.statsValue}>{value}</Text>
        <Text style={styles.statsTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderFeedbackItem = (item: BetaFeedback) => {
    const typeColors = {
      bug: '#FF6B6B',
      suggestion: '#4ECDC4',
      complaint: '#FFB84D',
      praise: '#51CF66',
    };

    return (
      <View key={item.id} style={styles.feedbackItem}>
        <View style={styles.feedbackHeader}>
          <View style={styles.feedbackTypeContainer}>
            <View style={[styles.feedbackTypeDot, { backgroundColor: typeColors[item.feedback_type as keyof typeof typeColors] || '#8E8E93' }]} />
            <Text style={styles.feedbackType}>{item.feedback_type}</Text>
          </View>
          <Text style={styles.feedbackScreen}>{item.screen_name}</Text>
        </View>
        
        {item.rating && (
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= item.rating! ? 'star' : 'star-outline'}
                size={16}
                color="#FFD700"
              />
            ))}
          </View>
        )}
        
        <Text style={styles.feedbackMessage}>{item.message}</Text>
        
        <View style={styles.feedbackFooter}>
          <Text style={styles.feedbackUser}>
            {item.user_name || 'Usuário Anônimo'} ({item.user_type})
          </Text>
          <Text style={styles.feedbackDate}>
            {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>
    );
  };

  const renderStats = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
    >
      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Métricas Principais</Text>
        <View style={styles.statsGrid}>
          {renderStatsCard('Usuários Beta', stats?.total_beta_users || 0, 'people-outline', '#007AFF')}
          {renderStatsCard('Sessões Hoje', stats?.active_sessions_today || 0, 'pulse-outline', '#51CF66')}
          {renderStatsCard('Feedbacks', stats?.total_feedback_count || 0, 'chatbubble-outline', '#4ECDC4')}
          {renderStatsCard('Taxa de Erro', `${stats?.error_rate || 0}%`, 'warning-outline', '#FF6B6B')}
        </View>
      </View>

      {/* Conversion Funnel */}
      {stats?.conversion_funnel && (
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
              <Text style={styles.funnelPercentage}>
                {stats.conversion_funnel.registration_to_verification.toFixed(1)}%
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
            <View style={styles.funnelStep}>
              <Text style={styles.funnelNumber}>{stats.conversion_funnel.completed_bookings}</Text>
              <Text style={styles.funnelLabel}>Reservas</Text>
              <Text style={styles.funnelPercentage}>
                {stats.conversion_funnel.verification_to_booking.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Top Screens */}
      {stats?.top_screens && stats.top_screens.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Telas Mais Visitadas</Text>
          {stats.top_screens.slice(0, 5).map((screen, index) => (
            <View key={screen._id} style={styles.screenItem}>
              <Text style={styles.screenRank}>#{index + 1}</Text>
              <Text style={styles.screenName}>{screen._id || 'Desconhecida'}</Text>
              <Text style={styles.screenCount}>{screen.count} visitas</Text>
            </View>
          ))}
        </View>
      )}

      {/* Feedback Breakdown */}
      {stats?.feedback_breakdown && stats.feedback_breakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipos de Feedback</Text>
          {stats.feedback_breakdown.map((feedback) => (
            <View key={feedback._id} style={styles.feedbackBreakdownItem}>
              <Text style={styles.feedbackBreakdownType}>{feedback._id}</Text>
              <Text style={styles.feedbackBreakdownCount}>{feedback.count}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderFeedback = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feedbacks Recentes</Text>
        {feedback.length > 0 ? (
          feedback.map(renderFeedbackItem)
        ) : (
          <Text style={styles.emptyText}>Nenhum feedback encontrado</Text>
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Estatísticas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feedback' && styles.activeTab]}
          onPress={() => setActiveTab('feedback')}
        >
          <Text style={[styles.tabText, activeTab === 'feedback' && styles.activeTabText]}>
            Feedbacks
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'stats' ? renderStats() : renderFeedback()}
    </View>
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
    backgroundColor: '#0C0C0C',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    margin: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statsContent: {
    flex: 1,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsTitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  funnelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
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
  funnelPercentage: {
    fontSize: 10,
    color: '#007AFF',
    marginTop: 2,
  },
  screenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  screenRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    width: 32,
  },
  screenName: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  screenCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  feedbackBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  feedbackBreakdownType: {
    fontSize: 16,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  feedbackBreakdownCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  feedbackItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  feedbackType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  feedbackScreen: {
    fontSize: 12,
    color: '#8E8E93',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  feedbackMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 12,
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackUser: {
    fontSize: 12,
    color: '#8E8E93',
  },
  feedbackDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 32,
  },
});