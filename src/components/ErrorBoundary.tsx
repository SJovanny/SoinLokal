import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.debug('[ErrorBoundary]', error.message, errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons
            name="alert-circle-outline"
            size={80}
            color={COLORS.DANGER}
          />
          <Text style={styles.title}>Une erreur est survenue</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? 'Erreur inconnue'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.handleReset}
            activeOpacity={0.7}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={COLORS.WHITE}
              style={styles.retryIcon}
            />
            <Text style={styles.retryText}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: SIZES.XXL,
  },
  title: {
    fontSize: SIZES.FONT_XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SIZES.LG,
    textAlign: 'center',
  },
  message: {
    fontSize: SIZES.FONT_MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SIZES.SM,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.NURSE_PRIMARY,
    paddingVertical: SIZES.MD,
    paddingHorizontal: SIZES.XXL,
    borderRadius: SIZES.BORDER_RADIUS_MD,
    marginTop: SIZES.XXL,
  },
  retryIcon: {
    marginRight: SIZES.SM,
  },
  retryText: {
    fontSize: SIZES.FONT_MD,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
});
