import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { BetaProvider } from '../contexts/BetaContext';
import FlashMessage from 'react-native-flash-message';

export default function RootLayout() {
  return (
    <AuthProvider>
      <BetaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="beta-admin" />
          <Stack.Screen name="documents" />
          <Stack.Screen name="portfolio" />
          <Stack.Screen name="professional-profile" />
          <Stack.Screen name="smart-search" />
          <Stack.Screen name="booking" options={{ presentation: 'modal' }} />
        </Stack>
        <FlashMessage position="top" />
      </BetaProvider>
    </AuthProvider>
  );
}