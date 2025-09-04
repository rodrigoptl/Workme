import React from 'react';
import WalletScreen from '../../screens/WalletScreen';
import { useRouter } from 'expo-router';

export default function Wallet() {
  const router = useRouter();
  return <WalletScreen navigation={router} />;
}