/**
 * ModelDownloadScreen Tests
 *
 * Tests for the model download screen including:
 * - Screen rendering (loading state)
 * - Loaded state with recommended models
 * - Skip button
 * - Download flow (foreground and background)
 * - Error handling
 * - Warning card for limited compatibility
 * - Network section integration (scan, connect, add server)
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      replace: mockReplace,
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
  };
});

const mockAppState = {
  downloadedModels: [],
  settings: {},
  deviceInfo: { deviceModel: 'Test Device', availableMemory: 8000000000 },
  setDeviceInfo: jest.fn(),
  setModelRecommendation: jest.fn(),
  downloadProgress: {} as Record<string, any>,
  setDownloadProgress: jest.fn(),
  addDownloadedModel: jest.fn(),
  setActiveModelId: jest.fn(),
  themeMode: 'system',
};

jest.mock('../../../src/stores', () => ({
  useAppStore: jest.fn((selector?: any) => {
    return selector ? selector(mockAppState) : mockAppState;
  }),
}));

const mockRemoteServerState = {
  servers: [] as any[],
  discoveredModels: {} as Record<string, any[]>,
  testConnection: jest.fn().mockResolvedValue({ success: false }),
};

jest.mock('../../../src/stores/remoteServerStore', () => ({
  useRemoteServerStore: Object.assign(
    jest.fn((selector?: any) => {
      return selector ? selector(mockRemoteServerState) : mockRemoteServerState;
    }),
    {
      getState: jest.fn(() => mockRemoteServerState),
    },
  ),
}));

const mockGetModelFiles = jest.fn<Promise<any[]>, any[]>(() => Promise.resolve([]));
const mockDownloadModel = jest.fn();
const mockDownloadModelBackground = jest.fn();

jest.mock('../../../src/services', () => ({
  hardwareService: {
    getDeviceInfo: jest.fn(() => Promise.resolve({ deviceModel: 'Test Device', availableMemory: 8000000000 })),
    getModelRecommendation: jest.fn(() => ({ tier: 'medium' })),
    getTotalMemoryGB: jest.fn(() => 8),
    formatBytes: jest.fn((bytes: number) => `${(bytes / 1e9).toFixed(1)}GB`),
  },
  huggingFaceService: {
    getModelFiles: jest.fn((...args: any[]) => (mockGetModelFiles as any)(...args)),
  },
  modelManager: {
    isBackgroundDownloadSupported: jest.fn(() => false),
    downloadModel: jest.fn((...args: any[]) => mockDownloadModel(...args)),
    downloadModelBackground: jest.fn((...args: any[]) => mockDownloadModelBackground(...args)),
    watchDownload: jest.fn(),
  },
  remoteServerManager: {
    addServer: jest.fn().mockResolvedValue({ id: 'new-server' }),
    testConnection: jest.fn().mockResolvedValue({ success: false }),
    setActiveRemoteTextModel: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../src/services/networkDiscovery', () => ({
  discoverLANServers: jest.fn().mockResolvedValue([]),
}));

const { hardwareService: mockHardwareService, modelManager: mockModelManager, huggingFaceService: mockHuggingFaceService } = jest.requireMock('../../../src/services');

jest.mock('../../../src/components/CustomAlert', () =>
  require('../../helpers/mockCustomAlert').customAlertMock,
);
const { mockShowAlert } = require('../../helpers/mockCustomAlert');

jest.mock('../../../src/components', () => ({
  Card: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
  Button: ({ title, onPress, disabled, testID }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={testID}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
  ModelCard: ({ model, onPress, onDownload, testID, _file, isDownloading }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={testID}>
        <Text>{model?.name || 'ModelCard'}</Text>
        {onPress && (
          <TouchableOpacity testID={`${testID}-press`} onPress={onPress}>
            <Text>Select</Text>
          </TouchableOpacity>
        )}
        {onDownload && (
          <TouchableOpacity testID={`${testID}-download`} onPress={onDownload}>
            <Text>Download</Text>
          </TouchableOpacity>
        )}
        {isDownloading && <Text testID={`${testID}-downloading`}>Downloading...</Text>}
      </View>
    );
  },
}));

jest.mock('../../../src/components/Button', () => ({
  Button: ({ title, onPress, disabled, testID }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={testID}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../../src/components/RemoteServerModal', () => ({
  RemoteServerModal: ({ visible }: any) => {
    if (!visible) return null;
    const { View, Text } = require('react-native');
    return <View testID="remote-server-modal"><Text>Add Remote Server</Text></View>;
  },
}));

jest.mock('../../../src/components/AnimatedEntry', () => ({
  AnimatedEntry: ({ children }: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('react-native-vector-icons/Feather', () => {
  const { Text } = require('react-native');
  return ({ name }: any) => <Text>{name}</Text>;
});

// Mock the NetworkSection component to simplify screen-level tests
const mockOnScanNetwork = jest.fn();
const mockOnAddManually = jest.fn();
jest.mock('../../../src/screens/ModelDownloadHelpers', () => {
  const actual = jest.requireActual('../../../src/screens/ModelDownloadHelpers');
  return {
    ...actual,
    NetworkSection: ({ onScanNetwork, onAddManually, servers, isCheckingNetwork, isScanning }: any) => {
      const { View, Text, TouchableOpacity } = require('react-native');
      // Store refs so tests can call them
      mockOnScanNetwork.mockImplementation(onScanNetwork);
      mockOnAddManually.mockImplementation(onAddManually);
      return (
        <View testID="network-section">
          <Text>网络模型</Text>
          {isCheckingNetwork && <Text testID="network-checking">扫描中...</Text>}
          {isScanning && <Text testID="network-scanning">扫描网络...</Text>}
          {servers && servers.map((s: any) => (
            <Text key={s.id} testID={`network-server-${s.id}`}>{s.name}</Text>
          ))}
          <TouchableOpacity testID="scan-network-btn" onPress={onScanNetwork}>
            <Text>Scan Network</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="add-server-btn" onPress={onAddManually}>
            <Text>Add Server</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});

import { ModelDownloadScreen } from '../../../src/screens/ModelDownloadScreen';

const MOCK_FILE = {
  name: 'model-Q4_K_M.gguf',
  size: 4000000000,
  quantization: 'Q4_K_M',
  downloadUrl: 'https://example.com/model.gguf',
};

const mockNavigation: any = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  replace: mockReplace,
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

async function flushPromises(count = 10) {
  for (let i = 0; i < count; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

describe('ModelDownloadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppState.downloadProgress = {};
    mockRemoteServerState.servers = [];
    mockRemoteServerState.discoveredModels = {};
    mockRemoteServerState.testConnection.mockResolvedValue({ success: false });
    mockGetModelFiles.mockResolvedValue([]);
    mockDownloadModel.mockResolvedValue(undefined);
    mockDownloadModelBackground.mockResolvedValue(undefined);
    mockHardwareService.getDeviceInfo.mockResolvedValue({ deviceModel: 'Test Device', availableMemory: 8000000000 });
    mockHardwareService.getModelRecommendation.mockReturnValue({ tier: 'medium' });
    mockHardwareService.getTotalMemoryGB.mockReturnValue(8);
    mockHardwareService.formatBytes.mockImplementation((bytes: number) => `${(bytes / 1e9).toFixed(1)}GB`);
    mockModelManager.isBackgroundDownloadSupported.mockReturnValue(true);
    mockModelManager.downloadModel.mockImplementation((...args: any[]) => (mockDownloadModel as any)(...args));
    mockModelManager.downloadModelBackground.mockImplementation((...args: any[]) => (mockDownloadModelBackground as any)(...args));
    mockHuggingFaceService.getModelFiles.mockImplementation((...args: any[]) => (mockGetModelFiles as any)(...args));
  });

  // ===========================================================================
  // Loading state
  // ===========================================================================
  it('初始渲染加载状态', () => {
    const { getByText } = render(
      <ModelDownloadScreen navigation={mockNavigation} />,
    );
    expect(getByText(/正在分析您的设备/)).toBeTruthy();
  });

  it('渲染加载状态的testID', () => {
    const { getByTestId } = render(
      <ModelDownloadScreen navigation={mockNavigation} />,
    );
    expect(getByTestId('model-download-loading')).toBeTruthy();
  });

  // ===========================================================================
  // 加载完成状态
  // ===========================================================================
  it('渲染加载完成状态，显示"设置您的AI"标题', async () => {
    mockGetModelFiles.mockResolvedValue([MOCK_FILE]);

    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();

    expect(result.getByTestId('model-download-screen')).toBeTruthy();
    expect(result.getByText('设置您的AI')).toBeTruthy();
    expect(result.getByText(/连接到模型服务器/)).toBeTruthy();
  });

  it('加载后渲染设备信息卡片', async () => {
    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();

    expect(result.getByText('您的设备')).toBeTruthy();
    expect(result.getByText('Test Device')).toBeTruthy();
    expect(result.getByText('可用内存')).toBeTruthy();
  });

  it('渲染网络模型部分', async () => {
    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();

    expect(result.getByTestId('network-section')).toBeTruthy();
    expect(result.getByText('网络模型')).toBeTruthy();
  });

  it('渲染"下载到您的设备"部分标题', async () => {
    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();

    expect(result.getByText('下载到您的设备')).toBeTruthy();
  });

  // ===========================================================================
  // 跳过按钮
  // ===========================================================================
  it('跳过按钮导航到主页', async () => {
    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();

    const skipButton = result.getByTestId('model-download-skip');
    fireEvent.press(skipButton);
    expect(mockReplace).toHaveBeenCalledWith('Main');
  });

  // ===========================================================================
  // 模型渲染和下载
  // ===========================================================================
  it('根据设备RAM渲染推荐模型', async () => {
    mockGetModelFiles.mockResolvedValue([MOCK_FILE]);

    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();

    expect(result.getByTestId('recommended-model-0')).toBeTruthy();
  });

  it('当没有兼容模型时显示警告卡片', async () => {
    mockHardwareService.getTotalMemoryGB.mockReturnValue(1);

    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();

    expect(result.getByText('有限兼容性')).toBeTruthy();
  });

  it('download button triggers handleDownload via background download', async () => {
    mockGetModelFiles.mockResolvedValue([MOCK_FILE]);
    mockDownloadModelBackground.mockResolvedValue({ downloadId: 1 });

    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);

    const downloadBtn = await result.findByTestId('recommended-model-0-download');
    await act(async () => {
      fireEvent.press(downloadBtn);
    });

    expect(mockDownloadModelBackground).toHaveBeenCalled();
  });

  it('download button triggers background download when supported', async () => {
    mockGetModelFiles.mockResolvedValue([MOCK_FILE]);
    mockModelManager.isBackgroundDownloadSupported.mockReturnValue(true);
    mockDownloadModelBackground.mockResolvedValue({ downloadId: 123 });

    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();

    const downloadBtn = await result.findByTestId('recommended-model-0-download', {}, { timeout: 5000 });
    await act(async () => {
      fireEvent.press(downloadBtn);
    });

    expect(mockDownloadModelBackground).toHaveBeenCalled();
  }, 20000);

  async function setupDownloadCompletion() {
    mockGetModelFiles.mockResolvedValue([MOCK_FILE]);
    const completedModel = {
      id: 'test-model', name: 'Test Model', author: 'test',
      fileName: 'model-Q4_K_M.gguf', filePath: '/path',
      fileSize: 4000000000, quantization: 'Q4_K_M',
      downloadedAt: new Date().toISOString(),
    };
    mockDownloadModelBackground.mockResolvedValue({ downloadId: 42 });
    let capturedOnComplete: ((model: any) => void) | undefined;
    mockModelManager.watchDownload.mockImplementation((_id: number, onComplete: any) => {
      capturedOnComplete = onComplete;
    });
    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();
    const downloadBtn = result.getByTestId('recommended-model-0-download');
    await act(async () => { fireEvent.press(downloadBtn); });
    await act(async () => { capturedOnComplete?.(completedModel); });
    return { result, completedModel };
  }

  it('download calls onComplete callback and shows alert', async () => {
    const { completedModel } = await setupDownloadCompletion();

    expect(mockAppState.addDownloadedModel).toHaveBeenCalledWith(completedModel);
    expect(mockShowAlert).toHaveBeenCalledWith(
      '下载完成！',
      expect.stringContaining('已成功下载'),
      expect.any(Array),
    );
  });

  it('download calls onError callback and shows error alert', async () => {
    mockGetModelFiles.mockResolvedValue([MOCK_FILE]);

    mockDownloadModelBackground.mockResolvedValue({ downloadId: 42 });
    let capturedOnError: ((err: Error) => void) | undefined;
    mockModelManager.watchDownload.mockImplementation((_id: number, _onComplete: any, onError: any) => {
      capturedOnError = onError;
    });

    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();

    const downloadBtn = result.getByTestId('recommended-model-0-download');
    await act(async () => {
      fireEvent.press(downloadBtn);
    });

    await act(async () => {
      capturedOnError?.(new Error('下载失败'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith('下载失败', '下载失败');
  });

  it('download catch block shows error on exception', async () => {
    mockGetModelFiles.mockResolvedValue([MOCK_FILE]);

    mockDownloadModelBackground.mockRejectedValue(new Error('Unexpected error'));

    const result = render(<ModelDownloadScreen navigation={mockNavigation} />);
    await flushPromises();

    const downloadBtn = result.getByTestId('recommended-model-0-download');
    await act(async () => {
      fireEvent.press(downloadBtn);
    });

    expect(mockShowAlert).toHaveBeenCalledWith('下载失败', 'Unexpected error');
  });

  it('init error shows error alert', async () => {
    mockHardwareService.getDeviceInfo.mockRejectedValueOnce(new Error('Hardware error'));

    render(<ModelDownloadScreen navigation={mockNavigation} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockShowAlert).toHaveBeenCalledWith('错误', '初始化失败，请重试。');
  });
});
