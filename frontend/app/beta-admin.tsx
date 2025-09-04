import React from 'react';
import BetaAdminScreen from '../screens/BetaAdminScreen';
import { useRouter } from 'expo-router';

export default function BetaAdmin() {
  const router = useRouter();
  return <BetaAdminScreen navigation={router} />;
}