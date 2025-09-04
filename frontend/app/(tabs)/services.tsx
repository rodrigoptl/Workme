import React from 'react';
import ServicesScreen from '../../screens/ServicesScreen';
import { useRouter } from 'expo-router';

export default function Services() {
  const router = useRouter();
  return <ServicesScreen navigation={router} />;
}