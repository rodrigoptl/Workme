import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout },
      ]
    );
  };

  const renderUserInfo = () => (
    <View style={styles.userInfoSection}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.full_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.userName}>{user?.full_name}</Text>
      <Text style={styles.userEmail}>{user?.email}</Text>
      <View style={styles.userTypeBadge}>
        <Text style={styles.userTypeText}>
          {user?.user_type === 'client' ? 'Cliente' : 'Profissional'}
        </Text>
      </View>
    </View>
  );

  const renderMenuItems = () => {
    const menuItems = [
      {
        icon: 'person-outline',
        title: 'Editar Perfil',
        subtitle: 'Atualize suas informações',
        onPress: () => {
          if (user?.user_type === 'professional') {
            navigation.navigate('ProfessionalProfile');
          }
        },
      },
      ...(user?.user_type === 'professional' ? [
        {
          icon: 'document-text-outline',
          title: 'Documentos',
          subtitle: 'Verificação e certificados',
          onPress: () => navigation.navigate('Documents'),
        },
        {
          icon: 'images-outline',
          title: 'Portfólio',
          subtitle: 'Galeria dos seus trabalhos',
          onPress: () => navigation.navigate('Portfolio'),
        },
        {
          icon: 'star-outline',
          title: 'Avaliações',
          subtitle: 'Veja seu histórico de avaliações',
          onPress: () => {},
        },
      ] : [
        {
          icon: 'time-outline',
          title: 'Histórico',
          subtitle: 'Serviços contratados',
          onPress: () => {},
        },
        {
          icon: 'heart-outline',
          title: 'Favoritos',
          subtitle: 'Profissionais salvos',
          onPress: () => {},
        },
      ]),
      {
        icon: 'notifications-outline',
        title: 'Notificações',
        subtitle: 'Gerencie suas preferências',
        onPress: () => {},
      },
      {
        icon: 'card-outline',
        title: 'Carteira Digital',
        subtitle: 'Saldo e histórico de pagamentos',
        onPress: () => {},
      },
      {
        icon: 'shield-outline',
        title: 'Painel Admin',
        subtitle: 'Acesso administrativo (demo)',
        onPress: () => navigation.navigate('Admin'),
      },
      {
        icon: 'help-circle-outline',
        title: 'Suporte',
        subtitle: 'Central de ajuda',
        onPress: () => {},
      },
      {
        icon: 'settings-outline',
        title: 'Configurações',
        subtitle: 'Privacidade e segurança',
        onPress: () => {},
      },
    ];

    return (
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuItemIcon}>
                <Ionicons name={item.icon as any} size={20} color="#007AFF" />
              </View>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderUserInfo()}
        {renderMenuItems()}
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>WorkMe v1.0.0</Text>
      </ScrollView>
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
    padding: 24,
  },
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  userTypeBadge: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  userTypeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  menuSection: {
    marginBottom: 32,
  },
  menuItem: {
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
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    gap: 8,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: '#6D6D70',
    fontSize: 12,
  },
});