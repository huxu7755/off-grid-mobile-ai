import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import { useAppStore } from '../stores';
import { hardwareService } from '../services';

export const DeviceInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const { deviceInfo } = useAppStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const totalRamGB = hardwareService.getTotalMemoryGB();
  const deviceTier = hardwareService.getDeviceTier();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>设备信息</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>硬件</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>型号</Text>
            <Text style={styles.infoValue}>{deviceInfo?.deviceModel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>系统</Text>
            <Text style={styles.infoValue}>
              {deviceInfo?.systemName} {deviceInfo?.systemVersion}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>总内存</Text>
            <Text style={styles.infoValue}>{totalRamGB.toFixed(1)} GB</Text>
          </View>
          <View style={[styles.infoRow, styles.lastRow]}>
            <Text style={styles.infoLabel}>设备等级</Text>
            <Text style={[styles.infoValue, styles.tierBadge]}>
              {deviceTier.charAt(0).toUpperCase() + deviceTier.slice(1)}
            </Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>兼容性</Text>
          <Text style={styles.description}>
            您的设备等级决定了哪些模型可以流畅运行。更高的内存允许使用更大、更强大的模型。
          </Text>

          <View style={styles.tierInfo}>
            <View style={[styles.tierItem, deviceTier === 'low' && styles.tierItemActive]}>
              <Text style={[styles.tierName, deviceTier === 'low' && styles.tierNameActive]}>低</Text>
              <Text style={styles.tierDesc}>{'< 4GB RAM'}</Text>
              <Text style={styles.tierModels}>仅小型模型</Text>
            </View>
            <View style={[styles.tierItem, deviceTier === 'medium' && styles.tierItemActive]}>
              <Text style={[styles.tierName, deviceTier === 'medium' && styles.tierNameActive]}>中</Text>
              <Text style={styles.tierDesc}>4-6GB RAM</Text>
              <Text style={styles.tierModels}>大多数模型</Text>
            </View>
            <View style={[styles.tierItem, deviceTier === 'high' && styles.tierItemActive]}>
              <Text style={[styles.tierName, deviceTier === 'high' && styles.tierNameActive]}>高</Text>
              <Text style={styles.tierDesc}>{'>6GB RAM'}</Text>
              <Text style={styles.tierModels}>所有模型</Text>
            </View>
            <View style={[styles.tierItem, deviceTier === 'flagship' && styles.tierItemActive]}>
              <Text style={[styles.tierName, deviceTier === 'flagship' && styles.tierNameActive]}>旗舰</Text>
              <Text style={styles.tierDesc}>{'8GB+ RAM'}</Text>
              <Text style={styles.tierModels}>所有模型 + 最大模型</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors, shadows: ThemeShadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.small,
    zIndex: 1,
    gap: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.h2,
    flex: 1,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: colors.text,
    marginBottom: SPACING.md,
  },
  description: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    ...TYPOGRAPHY.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...TYPOGRAPHY.body,
    color: colors.text,
  },
  tierBadge: {
    ...TYPOGRAPHY.label,
    textTransform: 'uppercase' as const,
    backgroundColor: `${colors.primary  }20`,
    color: colors.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    overflow: 'hidden' as const,
  },
  tierInfo: {
    flexDirection: 'row' as const,
    gap: SPACING.sm,
  },
  tierItem: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierItemActive: {
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  tierName: {
    ...TYPOGRAPHY.body,
    color: colors.text,
    marginBottom: SPACING.xs,
  },
  tierNameActive: {
    color: colors.primary,
  },
  tierDesc: {
    ...TYPOGRAPHY.meta,
    color: colors.textMuted,
    marginBottom: SPACING.xs,
  },
  tierModels: {
    ...TYPOGRAPHY.meta,
    color: colors.textSecondary,
    textAlign: 'center' as const,
  },
});
