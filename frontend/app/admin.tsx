import React from 'react';
import AdminScreen from '../screens/AdminScreen';
import { useRouter } from 'expo-router';

export default function Admin() {
  const router = useRouter();
  return <AdminScreen navigation={router} />;
}