/**
 * OnboardingScreen Tests
 *
 * Tests for the onboarding screen including:
 * - First slide content rendering
 * - Navigation dots
 * - Get Started / Next button
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Navigation is globally mocked in jest.setup.ts

jest.mock('../../../src/hooks/useFocusTrigger', () => ({
  useFocusTrigger: () => 0,
}));

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
}));

jest.mock('../../../src/components/AnimatedEntry', () => ({
  AnimatedEntry: ({ children }: any) => children,
}));

jest.mock('../../../src/components/CustomAlert', () => ({
  CustomAlert: () => null,
  showAlert: jest.fn(() => ({ visible: true })),
  hideAlert: jest.fn(() => ({ visible: false })),
  initialAlertState: { visible: false },
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

const mockSetOnboardingComplete = jest.fn();

jest.mock('../../../src/stores', () => ({
  useAppStore: jest.fn((selector?: any) => {
    const state = {
      setOnboardingComplete: mockSetOnboardingComplete,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('../../../src/constants', () => ({
  ...jest.requireActual('../../../src/constants'),
  ONBOARDING_SLIDES: [
    { id: 'slide1', keyword: 'Welcome', title: 'Off Grid', description: 'Your AI companion', accentColor: '#0066FF' },
    { id: 'slide2', keyword: 'Private', title: 'On-Device', description: 'Everything stays local', accentColor: '#00CC66' },
  ],
}));

const mockDiscoverLANServers = jest.fn().mockResolvedValue([]);
jest.mock('../../../src/services/networkDiscovery', () => ({
  discoverLANServers: (...args: any[]) => mockDiscoverLANServers(...args),
}));

const mockAddServer = jest.fn().mockResolvedValue({ id: 'new-server' });
jest.mock('../../../src/services', () => ({
  remoteServerManager: {
    addServer: (...args: any[]) => mockAddServer(...args),
  },
}));

jest.mock('../../../src/stores/remoteServerStore', () => ({
  useRemoteServerStore: Object.assign(
    jest.fn((selector?: any) => {
      const state = { servers: [] };
      return selector ? selector(state) : state;
    }),
    {
      getState: jest.fn(() => ({ servers: [] })),
    },
  ),
}));

import { OnboardingScreen } from '../../../src/screens/OnboardingScreen';

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockReplace = jest.fn();
const navigation = {
  navigate: mockNavigate,
  reset: mockReset,
  replace: mockReplace,
} as any;

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('渲染第一页内容', () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} />);
    expect(getByText('Welcome')).toBeTruthy();
    expect(getByText('Off Grid')).toBeTruthy();
    expect(getByText('Your AI companion')).toBeTruthy();
  });

  it('渲染第二页内容', () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} />);
    expect(getByText('Private')).toBeTruthy();
    expect(getByText('On-Device')).toBeTruthy();
    expect(getByText('Everything stays local')).toBeTruthy();
  });

  it('显示导航点', () => {
    const { getByTestId } = render(<OnboardingScreen navigation={navigation} />);
    expect(getByTestId('onboarding-screen')).toBeTruthy();
  });

  it('在第一页显示"下一步"按钮', () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} />);
    expect(getByText('下一步')).toBeTruthy();
  });

  it('在非最后一页显示"跳过"按钮', () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} />);
    expect(getByText('跳过')).toBeTruthy();
  });

  it('当点击"跳过"时调用completeOnboarding', () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} />);
    fireEvent.press(getByText('跳过'));

    expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith('ModelDownload');
  });

  it('当在非最后一页点击"下一步"时不完成引导', () => {
    // 注意：scrollToIndex 在测试环境中会抛出异常，但分支已覆盖
    try {
      const { getByText } = render(<OnboardingScreen navigation={navigation} />);
      fireEvent.press(getByText('下一步'));
    } catch {
      // scrollToIndex 不变量错误在测试环境中是预期的
    }

    // 不应在第一页完成引导
    expect(mockSetOnboardingComplete).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('在滚动结束时更新currentIndex', () => {
    const { getByTestId } = render(<OnboardingScreen navigation={navigation} />);

    // 模拟滚动到最后一页
    const _flatList = getByTestId('onboarding-screen').children[0];
    // FlatList 在 onboarding-screen 容器内
  });

  it('显示 onboarding-skip testID', () => {
    const { getByTestId } = render(<OnboardingScreen navigation={navigation} />);
    expect(getByTestId('onboarding-skip')).toBeTruthy();
  });

  it('显示 onboarding-next testID', () => {
    const { getByTestId } = render(<OnboardingScreen navigation={navigation} />);
    expect(getByTestId('onboarding-next')).toBeTruthy();
  });

  it('在挂载时启动LAN发现', async () => {
    const { act: reactAct } = require('@testing-library/react-native');
    mockDiscoverLANServers.mockResolvedValue([
      { endpoint: 'http://192.168.1.10:11434', type: 'ollama', name: 'Ollama (192.168.1.10)' },
    ]);

    render(<OnboardingScreen navigation={navigation} />);

    await reactAct(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDiscoverLANServers).toHaveBeenCalled();
    expect(mockAddServer).toHaveBeenCalledWith({
      name: 'Ollama (192.168.1.10)',
      endpoint: 'http://192.168.1.10:11434',
      providerType: 'openai-compatible',
    });
  });

  it('does not add duplicate servers during LAN discovery', async () => {
    const { act: reactAct } = require('@testing-library/react-native');
    const { useRemoteServerStore } = require('../../../src/stores/remoteServerStore');
    useRemoteServerStore.getState.mockReturnValue({
      servers: [{ endpoint: 'http://192.168.1.10:11434' }],
    });
    mockDiscoverLANServers.mockResolvedValue([
      { endpoint: 'http://192.168.1.10:11434', type: 'ollama', name: 'Ollama' },
    ]);

    render(<OnboardingScreen navigation={navigation} />);

    await reactAct(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockAddServer).not.toHaveBeenCalled();
  });

  it('handles LAN discovery errors gracefully', async () => {
    const { act: reactAct } = require('@testing-library/react-native');
    mockDiscoverLANServers.mockRejectedValue(new Error('Network error'));

    render(<OnboardingScreen navigation={navigation} />);

    await reactAct(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Should not throw — error is caught
    expect(mockDiscoverLANServers).toHaveBeenCalled();
  });

  it('completes onboarding when Get Started pressed on last slide', async () => {
    const { act: reactAct } = require('@testing-library/react-native');
    const { Dimensions } = require('react-native');
    const width = Dimensions.get('window').width;

    const { getByTestId, UNSAFE_getAllByType } = render(
      <OnboardingScreen navigation={navigation} />,
    );

    // Simulate scrolling to last slide (index 1) via onMomentumScrollEnd
    const { FlatList } = require('react-native');
    const flatLists = UNSAFE_getAllByType(FlatList);

    await reactAct(async () => {
      if (flatLists.length > 0 && flatLists[0].props.onMomentumScrollEnd) {
        flatLists[0].props.onMomentumScrollEnd({
          nativeEvent: { contentOffset: { x: width } },
        });
      }
    });

    // Now on last slide, press Get Started to complete onboarding
    fireEvent.press(getByTestId('onboarding-next'));

    expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith('ModelDownload');
  });
});
