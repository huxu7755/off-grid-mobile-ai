import React, { useEffect, useState, useCallback } from 'react';
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
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { useTheme, useThemedStyles } from '../theme';
import { SPACING } from '../constants';
import { useAppStore, useChatStore } from '../stores';
import { hardwareService, modelManager } from '../services';
import { OrphanedFilesSection } from './OrphanedFilesSection';
import { createStyles } from './StorageSettingsScreen.styles';

export const StorageSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [storageUsed, setStorageUsed] = useState(0);
  const [availableStorage, setAvailableStorage] = useState(0);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);

  const {
    downloadedModels,
    downloadedImageModels,
    activeBackgroundDownloads,
    setBackgroundDownload,
  } = useAppStore();
  const { conversations } = useChatStore();

  const imageStorageUsed = downloadedImageModels.reduce((total, m) => total + (m.size || 0), 0);

  const staleDownloads = Object.entries(activeBackgroundDownloads).filter(([_, info]) => {
    return !info?.modelId || !info?.fileName || !info?.totalBytes;
  });

  const loadStorageInfo = useCallback(async () => {
    const used = await modelManager.getStorageUsed();
    const available = await modelManager.getAvailableStorage();
    setStorageUsed(used + imageStorageUsed);
    setAvailableStorage(available);
  }, [imageStorageUsed]);

  useEffect(() => {
    loadStorageInfo();
  }, [loadStorageInfo]);

  const handleClearStaleDownload = useCallback(
    (downloadId: number) => {
      setBackgroundDownload(downloadId, null);
    },
    [setBackgroundDownload],
  );

  const handleClearAllStaleDownloads = useCallback(() => {
    setAlertState(
      showAlert(
        '清除过期下载',
        `清除 ${staleDownloads.length} 个过期下载条目？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '全部清除',
            style: 'destructive',
            onPress: () => {
              setAlertState(hideAlert());
              for (const [downloadId] of staleDownloads) {
                setBackgroundDownload(Number(downloadId), null);
              }
            },
          },
        ],
      ),
    );
  }, [staleDownloads, setBackgroundDownload]);

  const totalStorage = storageUsed + availableStorage;
  const usedPercentage = totalStorage > 0 ? (storageUsed / totalStorage) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>存储</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>存储使用</Text>
          <View style={styles.storageBar}>
            <View style={[styles.storageUsed, { width: `${Math.min(usedPercentage, 100)}%` }]} />
          </View>
          <View style={styles.storageLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>已用: {hardwareService.formatBytes(storageUsed)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.surfaceLight }]} />
              <Text style={styles.legendText}>可用: {hardwareService.formatBytes(availableStorage)}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>明细</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Icon name="cpu" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>LLM模型</Text>
            </View>
            <Text style={styles.infoValue}>{downloadedModels.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Icon name="image" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>图像模型</Text>
            </View>
            <Text style={styles.infoValue}>{downloadedImageModels.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Icon name="hard-drive" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>模型存储</Text>
            </View>
            <Text style={styles.infoValue}>{hardwareService.formatBytes(storageUsed)}</Text>
          </View>
          <View style={[styles.infoRow, styles.lastRow]}>
            <View style={styles.infoRowLeft}>
              <Icon name="message-circle" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>对话</Text>
            </View>
            <Text style={styles.infoValue}>{conversations.length}</Text>
          </View>
        </Card>

        {downloadedModels.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>LLM模型</Text>
            {downloadedModels.map((model, index) => (
              <View
                key={model.id}
                style={[styles.modelRow, index === downloadedModels.length - 1 && styles.lastRow]}
              >
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName} numberOfLines={1}>{model.name}</Text>
                  <Text style={styles.modelMeta}>{model.quantization}</Text>
                </View>
                <Text style={styles.modelSize}>{hardwareService.formatModelSize(model)}</Text>
              </View>
            ))}
          </Card>
        )}

        {downloadedImageModels.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>图像模型</Text>
            {downloadedImageModels.map((model, index) => (
              <View
                key={model.id}
                style={[styles.modelRow, index === downloadedImageModels.length - 1 && styles.lastRow]}
              >
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName} numberOfLines={1}>{model.name}</Text>
                  <Text style={styles.modelMeta}>
                    {(() => {
                      if (model.backend === 'coreml') return 'Core ML';
                      if (model.backend === 'qnn') return 'Qualcomm NPU';
                      return 'GPU';
                    })()}
                    {model.style ? ` • ${model.style}` : ''}
                  </Text>
                </View>
                <Text style={styles.modelSize}>{hardwareService.formatBytes(model.size)}</Text>
              </View>
            ))}
          </Card>
        )}

        {staleDownloads.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>过期下载</Text>
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={handleClearAllStaleDownloads}
              >
                <Text style={styles.clearAllText}>全部清除</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { textAlign: 'left' as const, marginBottom: SPACING.md }]}>
              这些下载条目数据无效或缺失，可以安全清除。
            </Text>
            {staleDownloads.map(([downloadId, info]) => (
              <View key={downloadId} style={styles.orphanedRow}>
                <View style={styles.orphanedInfo}>
                  <Text style={styles.orphanedName}>下载 #{downloadId}</Text>
                  <Text style={styles.orphanedMeta}>
                    {info?.fileName ?? '未知文件'} • {info?.modelId ?? '未知模型'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleClearStaleDownload(Number(downloadId))}
                >
                  <Icon name="x" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}

        <OrphanedFilesSection onStorageChange={loadStorageInfo} />

        <Text style={styles.hint}>
          要释放空间，您可以从模型标签页删除模型。
        </Text>
      </ScrollView>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={() => setAlertState(hideAlert())}
      />
    </SafeAreaView>
  );
};
