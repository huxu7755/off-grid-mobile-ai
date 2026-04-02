/**
 * VoiceSettingsScreen Tests
 *
 * Tests for the voice settings screen including:
 * - Title display
 * - Description text about Whisper
 * - Download options when no model
 * - Back button navigation
 * - Downloaded model state (name, status badge, remove button)
 * - Download progress display
 * - Model download trigger
 * - Remove model confirmation alert
 * - Error display and clear
 * - Privacy card display
 *
 * Priority: P1 (High)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../src/hooks/useFocusTrigger', () => ({
  useFocusTrigger: () => 0,
}));

jest.mock('../../../src/components', () => ({
  Card: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
  Button: ({ title, onPress, disabled, style }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} style={style}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../../src/components/AnimatedEntry', () => ({
  AnimatedEntry: ({ children }: any) => children,
}));

const mockShowAlert = jest.fn((title: string, message: string, buttons?: any[]) => ({
  visible: true,
  title,
  message,
  buttons: buttons || [],
}));

jest.mock('../../../src/components/CustomAlert', () => ({
  CustomAlert: ({ visible, title, message, buttons, _onClose }: any) => {
    if (!visible) return null;
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="custom-alert">
        <Text testID="alert-title">{title}</Text>
        <Text testID="alert-message">{message}</Text>
        {buttons && buttons.map((btn: any, i: number) => (
          <TouchableOpacity key={i} testID={`alert-btn-${i}`} onPress={btn.onPress}>
            <Text>{btn.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  },
  showAlert: (...args: any[]) => (mockShowAlert as any)(...args),
  hideAlert: jest.fn(() => ({ visible: false, title: '', message: '', buttons: [] })),
  initialAlertState: { visible: false, title: '', message: '', buttons: [] },
}));

jest.mock('../../../src/components/Button', () => ({
  Button: ({ title, onPress, disabled, style }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} style={style}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

const mockDownloadModel = jest.fn();
const mockDeleteModel = jest.fn();
const mockClearError = jest.fn();

let mockWhisperStoreValues: any = {
  downloadedModelId: null,
  isDownloading: false,
  downloadProgress: 0,
  downloadModel: mockDownloadModel,
  deleteModel: mockDeleteModel,
  error: null,
  clearError: mockClearError,
};

jest.mock('../../../src/stores', () => ({
  useWhisperStore: jest.fn(() => mockWhisperStoreValues),
}));

jest.mock('../../../src/services', () => ({
  WHISPER_MODELS: [
    { id: 'tiny.en', name: 'Whisper Tiny (English)', size: 75, description: '最快，仅英语，适合基本转录' },
    { id: 'tiny', name: 'Whisper Tiny (Multilingual)', size: 75, description: '快速，支持多种语言' },
    { id: 'base.en', name: 'Whisper Base (English)', size: 142, description: '更好的准确性，仅英语' },
    { id: 'base', name: 'Whisper Base (Multilingual)', size: 142, description: '更好的准确性，多种语言' },
    { id: 'small.en', name: 'Whisper Small (English)', size: 466, description: '高准确性，仅英语，需要更多内存' },
  ],
}));

import { VoiceSettingsScreen } from '../../../src/screens/VoiceSettingsScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({ params: {} }),
  };
});

describe('VoiceSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhisperStoreValues = {
      downloadedModelId: null,
      isDownloading: false,
      downloadProgress: 0,
      downloadModel: mockDownloadModel,
      deleteModel: mockDeleteModel,
      error: null,
      clearError: mockClearError,
    };
  });

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('基本渲染', () => {
    it('渲染"语音转录"标题', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('语音转录')).toBeTruthy();
    });

    it('显示关于Whisper的描述文本', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(
        getByText(/下载Whisper模型以启用设备上的语音输入/),
      ).toBeTruthy();
    });

    it('显示隐私卡片', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('隐私优先')).toBeTruthy();
      expect(
        getByText(/语音转录完全在您的设备上进行/),
      ).toBeTruthy();
    });

    it('返回按钮调用goBack', () => {
      const { UNSAFE_getAllByType } = render(<VoiceSettingsScreen />);
      const { TouchableOpacity } = require('react-native');
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      // 第一个TouchableOpacity是返回按钮
      fireEvent.press(touchables[0]);
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 未下载模型 - 下载选项
  // ============================================================================
  describe('下载选项（无模型）', () => {
    it('当未下载模型时显示下载选项', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('Whisper Tiny (English)')).toBeTruthy();
      expect(getByText('Whisper Tiny (Multilingual)')).toBeTruthy();
      expect(getByText('Whisper Base (English)')).toBeTruthy();
    });

    it('只显示前3个模型 (slice(0, 3))', () => {
      const { queryByText } = render(<VoiceSettingsScreen />);
      // 4th model (base multilingual) should NOT be shown due to .slice(0, 3)
      expect(queryByText('Whisper Base (Multilingual)')).toBeNull();
    });

    it('显示"选择要下载的模型"标签', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('选择要下载的模型：')).toBeTruthy();
    });

    it('shows model size for each option', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('75 MB')).toBeTruthy();
      expect(getByText('75 MB')).toBeTruthy();
      expect(getByText('142 MB')).toBeTruthy();
    });

    it('shows model description for each option', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('最快，仅英语，适合基本转录')).toBeTruthy();
      expect(getByText('快速，支持多种语言')).toBeTruthy();
      expect(getByText('更好的准确性，仅英语')).toBeTruthy();
    });

    it('calls downloadModel when a model option is pressed', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      fireEvent.press(getByText('Whisper Base (English)'));
      expect(mockDownloadModel).toHaveBeenCalledWith('base.en');
    });

    it('calls downloadModel with correct id for tiny model', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      fireEvent.press(getByText('Whisper Tiny (English)'));
      expect(mockDownloadModel).toHaveBeenCalledWith('tiny.en');
    });
  });

  // ============================================================================
  // Downloaded Model State
  // ============================================================================
  describe('downloaded model state', () => {
    beforeEach(() => {
      mockWhisperStoreValues = {
        ...mockWhisperStoreValues,
        downloadedModelId: 'base',
      };
    });

    it('shows downloaded model name', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('Whisper Base')).toBeTruthy();
    });

    it('显示"已下载"状态标签', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('已下载')).toBeTruthy();
    });

    it('显示"移除模型"按钮', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('移除模型')).toBeTruthy();
    });

    it('当模型已下载时不显示下载选项', () => {
      const { queryByText } = render(<VoiceSettingsScreen />);
      expect(queryByText('选择要下载的模型：')).toBeNull();
    });

    it('shows model id as fallback when model not found in WHISPER_MODELS', () => {
      mockWhisperStoreValues = {
        ...mockWhisperStoreValues,
        downloadedModelId: 'unknown-model',
      };
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('unknown-model')).toBeTruthy();
    });

    it('按下移除模型按钮显示确认警告', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      fireEvent.press(getByText('移除模型'));
      expect(mockShowAlert).toHaveBeenCalledWith(
        '移除Whisper模型',
        '这将禁用语音输入，直到您再次下载模型。',
        expect.arrayContaining([
          expect.objectContaining({ text: '取消', style: 'cancel' }),
          expect.objectContaining({ text: '移除', style: 'destructive' }),
        ]),
      );
    });
  });

  // ============================================================================
  // Download Progress State
  // ============================================================================
  describe('download progress', () => {
    beforeEach(() => {
      mockWhisperStoreValues = {
        ...mockWhisperStoreValues,
        isDownloading: true,
        downloadProgress: 0.45,
      };
    });

    it('显示下载状态和百分比', () => {
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('正在下载... 45%')).toBeTruthy();
    });

    it('下载期间不显示下载选项', () => {
      const { queryByText } = render(<VoiceSettingsScreen />);
      expect(queryByText('选择要下载的模型：')).toBeNull();
    });

    it('下载开始时显示0%', () => {
      mockWhisperStoreValues = {
        ...mockWhisperStoreValues,
        isDownloading: true,
        downloadProgress: 0,
      };
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('正在下载... 0%')).toBeTruthy();
    });

    it('下载接近结束时显示100%', () => {
      mockWhisperStoreValues = {
        ...mockWhisperStoreValues,
        isDownloading: true,
        downloadProgress: 1,
      };
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('正在下载... 100%')).toBeTruthy();
    });

    it('四舍五入进度百分比', () => {
      mockWhisperStoreValues = {
        ...mockWhisperStoreValues,
        isDownloading: true,
        downloadProgress: 0.678,
      };
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('正在下载... 68%')).toBeTruthy();
    });
  });

  // ============================================================================
  // Error State
  // ============================================================================
  describe('error state', () => {
    it('shows error message when whisperError is set', () => {
      mockWhisperStoreValues = {
        ...mockWhisperStoreValues,
        error: 'Download failed: network error',
      };
      const { getByText } = render(<VoiceSettingsScreen />);
      expect(getByText('Download failed: network error')).toBeTruthy();
    });

    it('calls clearError when error is tapped', () => {
      mockWhisperStoreValues = {
        ...mockWhisperStoreValues,
        error: 'Download failed',
      };
      const { getByText } = render(<VoiceSettingsScreen />);
      fireEvent.press(getByText('Download failed'));
      expect(mockClearError).toHaveBeenCalled();
    });

    it('does not show error when error is null', () => {
      const { queryByText } = render(<VoiceSettingsScreen />);
      expect(queryByText('Download failed')).toBeNull();
    });
  });
});
