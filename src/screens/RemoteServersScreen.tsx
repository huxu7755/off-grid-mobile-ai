/**
 * Remote Servers Settings Screen
 *
 * Manage connections to remote LLM servers (Ollama, LM Studio, etc.)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useThemedStyles } from '../theme';
import { useRemoteServerStore } from '../stores';
import { RemoteServerModal } from '../components/RemoteServerModal';
import { RootStackParamList } from '../navigation/types';
import { remoteServerManager } from '../services/remoteServerManager';
import { discoverLANServers } from '../services/networkDiscovery';
import { CustomAlert, AlertState, initialAlertState, showAlert } from '../components/CustomAlert';
import { createStyles } from './RemoteServersScreen.styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RemoteServers'>;

export const RemoteServersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { servers, serverHealth, testConnection, activeServerId, setActiveServerId } = useRemoteServerStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<typeof servers[0] | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);

  // Auto-check all server statuses when screen opens
  useEffect(() => {
    servers.forEach(server => {
      testConnection(server.id).catch(() => { });
    });

  }, []);

  const handleTestServer = useCallback(async (serverId: string) => {
    setTestingId(serverId);
    try {
      const result = await testConnection(serverId);
      if (result.success) {
        setAlertState(showAlert('成功', `连接成功 (${result.latency}ms)`));
      } else {
        setAlertState(showAlert('连接失败', result.error || '未知错误'));
      }
    } catch (error) {
      setAlertState(showAlert('错误', error instanceof Error ? error.message : '未知错误'));
    } finally {
      setTestingId(null);
    }
  }, [testConnection]);

  const handleScanNetwork = useCallback(async () => {
    setIsScanning(true);
    try {
      const discovered = await discoverLANServers();
      if (discovered.length === 0) {
        setAlertState(showAlert('未找到服务器', '在您的本地网络上未找到LLM服务器。'));
        return;
      }
      const existingEndpoints = new Set(servers.map(s => s.endpoint));
      const newServers = discovered.filter(d => !existingEndpoints.has(d.endpoint));
      if (newServers.length === 0) {
        setAlertState(showAlert('已添加', '所有发现的服务器都已在您的列表中。'));
        return;
      }
      const added = await Promise.all(
        newServers.map(d =>
          remoteServerManager.addServer({
            name: d.name,
            endpoint: d.endpoint,
            providerType: 'openai-compatible',
          })
        )
      );
      added.forEach(s => remoteServerManager.testConnection(s.id).catch(() => { }));
      setAlertState(showAlert('发现完成', `已添加 ${newServers.length} 个服务器。`));
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setAlertState(showAlert('扫描失败', message));
    } finally {
      setIsScanning(false);
    }
  }, [servers]);

  const handleDeleteServer = useCallback((server: typeof servers[0]) => {
    setAlertState(showAlert(
      '删除服务器',
      `您确定要删除 "${server.name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            if (activeServerId === server.id) setActiveServerId(null);
            await remoteServerManager.removeServer(server.id);
          },
        },
      ]
    ));
  }, [activeServerId, setActiveServerId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>远程服务器</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {servers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Icon name="wifi" size={32} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>无远程服务器</Text>
            <Text style={styles.emptyText}>
              连接到您网络上的Ollama、LM Studio或其他LLM服务器
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Icon name="plus" size={20} color={theme.colors.background} />
              <Text style={styles.addButtonText}>添加服务器</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanButton} onPress={handleScanNetwork} disabled={isScanning}>
              {isScanning ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <Icon name="wifi" size={20} color={theme.colors.text} />
              )}
              <Text style={styles.scanButtonText}>{isScanning ? '正在扫描...' : '扫描网络'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {servers.map((server) => {
              const isTesting = testingId === server.id;
              const health = serverHealth[server.id];

              let statusColor = styles.statusDotUnknown;
              if (health?.isHealthy === true) statusColor = styles.statusDotActive;
              else if (health?.isHealthy === false) statusColor = styles.statusDotInactive;

              let statusText = '未知';
              if (isTesting) statusText = '正在测试...';
              else if (health?.isHealthy === true) statusText = '已连接';
              else if (health?.isHealthy === false) statusText = '离线';

              return (
                <View key={server.id} style={styles.serverItem}>
                  <View style={styles.serverHeader}>
                    <View style={styles.serverInfo}>
                      <Text style={styles.serverName}>{server.name}</Text>
                      <Text style={styles.serverEndpoint}>{server.endpoint}</Text>
                    </View>
                  </View>

                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, statusColor]} />
                    <Text style={styles.statusText}>{statusText}</Text>
                  </View>

                  <View style={styles.serverActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleTestServer(server.id)}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <ActivityIndicator size="small" color={theme.colors.text} />
                      ) : (
                        <>
                          <Icon name="refresh-cw" size={16} color={theme.colors.text} />
                          <Text style={styles.actionButtonText}>测试</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setEditingServer(server)}
                    >
                      <Icon name="edit-2" size={16} color={theme.colors.text} />
                      <Text style={styles.actionButtonText}>编辑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteServer(server)}
                    >
                      <Icon name="trash-2" size={16} color={theme.colors.error} />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>删除</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Icon name="plus" size={20} color={theme.colors.background} />
              <Text style={styles.addButtonText}>添加另一个服务器</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanButton} onPress={handleScanNetwork} disabled={isScanning}>
              {isScanning ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <Icon name="wifi" size={20} color={theme.colors.text} />
              )}
              <Text style={styles.scanButtonText}>{isScanning ? '正在扫描...' : '扫描网络'}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>关于远程服务器</Text>
          <Text style={styles.infoText}>
            连接到在您本地网络上运行的LLM服务器，例如Ollama或LM Studio。{'\n\n'}
            确保您的服务器正在运行并且可以从您的设备访问。为了安全起见，只连接到受信任网络上的服务器。
          </Text>
        </View>
      </ScrollView>

      <RemoteServerModal
        visible={showAddModal || !!editingServer}
        onClose={() => {
          setShowAddModal(false);
          setEditingServer(null);
        }}
        server={editingServer || undefined}
        onSave={() => {
          setShowAddModal(false);
          setEditingServer(null);
        }}
      />

      <CustomAlert
        {...alertState}
        onClose={() => setAlertState(initialAlertState)}
      />
    </SafeAreaView>
  );
};

export default RemoteServersScreen;