import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MessagingScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Messagerie Sécurisée - À développer</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  text: {
    fontSize: 18,
    color: '#666',
  },
});

export default MessagingScreen;
