/**
 * PassphraseSetupScreen Tests
 *
 * Tests for the passphrase setup/change screen including:
 * - Title display for new setup vs change mode
 * - Input fields rendering
 * - Cancel button behavior
 * - Form validation (too short, too long, mismatch)
 * - Successful submit for new passphrase
 * - Successful submit for change passphrase
 * - Error states (wrong current passphrase, service failure)
 * - Button disabled while submitting
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

jest.mock('../../../src/components', () => ({
  Card: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
  Button: ({ title, onPress, disabled }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={`button-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../../src/components/Button', () => ({
  Button: ({ title, onPress, disabled }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={`button-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

const mockShowAlert = jest.fn((_t: string, _m: string, _b?: any) => ({
  visible: true,
  title: _t,
  message: _m,
  buttons: _b || [],
}));

jest.mock('../../../src/components/CustomAlert', () => ({
  CustomAlert: ({ visible, title, message }: any) => {
    if (!visible) return null;
    const { View, Text } = require('react-native');
    return (
      <View testID="custom-alert">
        <Text testID="alert-title">{title}</Text>
        <Text testID="alert-message">{message}</Text>
      </View>
    );
  },
  showAlert: (...args: any[]) => (mockShowAlert as any)(...args),
  hideAlert: jest.fn(() => ({ visible: false, title: '', message: '', buttons: [] })),
  initialAlertState: { visible: false, title: '', message: '', buttons: [] },
}));

jest.mock('../../../src/components/AnimatedEntry', () => ({
  AnimatedEntry: ({ children }: any) => children,
}));

const mockSetPassphrase = jest.fn(() => Promise.resolve(true));
const mockChangePassphrase = jest.fn(() => Promise.resolve(true));

jest.mock('../../../src/services/authService', () => ({
  authService: {
    setPassphrase: (...args: any[]) => (mockSetPassphrase as any)(...args),
    changePassphrase: (...args: any[]) => (mockChangePassphrase as any)(...args),
  },
}));

const mockSetEnabled = jest.fn();
jest.mock('../../../src/stores/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    setEnabled: mockSetEnabled,
  })),
}));

jest.mock('../../../src/stores', () => ({
  useAppStore: jest.fn((selector?: any) => {
    const state = {
      themeMode: 'system',
    };
    return selector ? selector(state) : state;
  }),
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

import { PassphraseSetupScreen } from '../../../src/screens/PassphraseSetupScreen';

const defaultProps = {
  onComplete: jest.fn(),
  onCancel: jest.fn(),
};

describe('PassphraseSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Rendering tests ----

  it('renders "设置密码" title for new setup', () => {
    const { getByText } = render(<PassphraseSetupScreen {...defaultProps} />);
    expect(getByText('设置密码')).toBeTruthy();
  });

  it('renders passphrase input fields', () => {
    const { getByPlaceholderText } = render(
      <PassphraseSetupScreen {...defaultProps} />,
    );
    expect(
      getByPlaceholderText('输入密码（至少6个字符）'),
    ).toBeTruthy();
  });

  it('shows confirm passphrase field', () => {
    const { getByPlaceholderText } = render(
      <PassphraseSetupScreen {...defaultProps} />,
    );
    expect(getByPlaceholderText('重新输入密码')).toBeTruthy();
  });

  it('shows current passphrase field when isChanging=true', () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(
      <PassphraseSetupScreen {...defaultProps} isChanging={true} />,
    );
    expect(getAllByText('修改密码').length).toBeGreaterThanOrEqual(1);
    expect(getByText('当前密码')).toBeTruthy();
    expect(
      getByPlaceholderText('输入当前密码'),
    ).toBeTruthy();
  });

  it('cancel button calls onCancel', () => {
    const { getByText } = render(<PassphraseSetupScreen {...defaultProps} />);
    fireEvent.press(getByText('取消'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows "启用锁定" button text for new setup', () => {
    const { getByText } = render(<PassphraseSetupScreen {...defaultProps} />);
    expect(getByText('启用锁定')).toBeTruthy();
  });

  it('shows "修改密码" button text when isChanging', () => {
    const { getAllByText } = render(
      <PassphraseSetupScreen {...defaultProps} isChanging />,
    );
    // Title and button both say "修改密码"
    expect(getAllByText('修改密码').length).toBeGreaterThanOrEqual(2);
  });

  it('renders tips section', () => {
    const { getByText } = render(<PassphraseSetupScreen {...defaultProps} />);
    expect(getByText('好密码的提示：')).toBeTruthy();
    expect(getByText(/使用单词和数字的组合/)).toBeTruthy();
  });

  it('shows description for new setup', () => {
    const { getByText } = render(<PassphraseSetupScreen {...defaultProps} />);
    expect(getByText(/创建一个密码来锁定应用/)).toBeTruthy();
  });

  it('shows description for change mode', () => {
    const { getByText } = render(
      <PassphraseSetupScreen {...defaultProps} isChanging />,
    );
    expect(getByText(/输入您当前的密码/)).toBeTruthy();
  });

  // ---- Validation tests ----

  it('shows validation error when passphrase is too short', async () => {
    const { getByPlaceholderText, getByText } = render(
      <PassphraseSetupScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码（至少6个字符）'),
      'abc',
    );
    fireEvent.changeText(getByPlaceholderText('重新输入密码'), 'abc');

    await act(async () => {
      fireEvent.press(getByText('启用锁定'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      '无效密码',
      '密码至少需要6个字符',
    );
    expect(mockSetPassphrase).not.toHaveBeenCalled();
  });

  it('shows validation error when passphrase is too long', async () => {
    const longPass = 'a'.repeat(51);
    const { getByPlaceholderText, getByText } = render(
      <PassphraseSetupScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码（至少6个字符）'),
      longPass,
    );
    fireEvent.changeText(getByPlaceholderText('重新输入密码'), longPass);

    await act(async () => {
      fireEvent.press(getByText('启用锁定'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      '无效密码',
      '密码最多50个字符',
    );
    expect(mockSetPassphrase).not.toHaveBeenCalled();
  });

  it('shows mismatch error when passphrases do not match', async () => {
    const { getByPlaceholderText, getByText } = render(
      <PassphraseSetupScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码（至少6个字符）'),
      'password123',
    );
    fireEvent.changeText(
      getByPlaceholderText('重新输入密码'),
      'differentpassword',
    );

    await act(async () => {
      fireEvent.press(getByText('启用锁定'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      '不匹配',
      '两次输入的密码不一致',
    );
    expect(mockSetPassphrase).not.toHaveBeenCalled();
  });

  // ---- Successful submit tests ----

  it('calls setPassphrase on valid new setup', async () => {
    mockSetPassphrase.mockResolvedValue(true);

    const { getByPlaceholderText, getByText } = render(
      <PassphraseSetupScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码（至少6个字符）'),
      'securepass123',
    );
    fireEvent.changeText(
      getByPlaceholderText('重新输入密码'),
      'securepass123',
    );

    await act(async () => {
      fireEvent.press(getByText('启用锁定'));
    });

    expect(mockSetPassphrase).toHaveBeenCalledWith('securepass123');
    expect(mockSetEnabled).toHaveBeenCalledWith(true);
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it('calls changePassphrase on valid change', async () => {
    mockChangePassphrase.mockResolvedValue(true);

    const { getByPlaceholderText, getAllByText } = render(
      <PassphraseSetupScreen {...defaultProps} isChanging />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入当前密码'),
      'oldpassword',
    );
    fireEvent.changeText(
      getByPlaceholderText('输入密码（至少6个字符）'),
      'newpassword',
    );
    fireEvent.changeText(
      getByPlaceholderText('重新输入密码'),
      'newpassword',
    );

    // Press "修改密码" button (last one)
    const buttons = getAllByText('修改密码');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(mockChangePassphrase).toHaveBeenCalledWith('oldpassword', 'newpassword');
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  // ---- Error handling tests ----

  it('shows error when current passphrase is incorrect on change', async () => {
    mockChangePassphrase.mockResolvedValue(false);

    const { getByPlaceholderText, getAllByText } = render(
      <PassphraseSetupScreen {...defaultProps} isChanging />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入当前密码'),
      'wrongpassword',
    );
    fireEvent.changeText(
      getByPlaceholderText('输入密码（至少6个字符）'),
      'newpassword',
    );
    fireEvent.changeText(
      getByPlaceholderText('重新输入密码'),
      'newpassword',
    );

    const buttons = getAllByText('修改密码');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      '错误',
      '当前密码不正确',
    );
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
  });

  it('shows error when setPassphrase fails', async () => {
    mockSetPassphrase.mockResolvedValue(false);

    const { getByPlaceholderText, getByText } = render(
      <PassphraseSetupScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码（至少6个字符）'),
      'validpass123',
    );
    fireEvent.changeText(
      getByPlaceholderText('重新输入密码'),
      'validpass123',
    );

    await act(async () => {
      fireEvent.press(getByText('启用锁定'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      '错误',
      '设置密码失败',
    );
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
  });

  it('shows generic error when setPassphrase throws', async () => {
    mockSetPassphrase.mockRejectedValue(new Error('Network error'));

    const { getByPlaceholderText, getByText } = render(
      <PassphraseSetupScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码（至少6个字符）'),
      'validpass123',
    );
    fireEvent.changeText(
      getByPlaceholderText('重新输入密码'),
      'validpass123',
    );

    await act(async () => {
      fireEvent.press(getByText('启用锁定'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      '错误',
      '发生错误，请重试。',
    );
  });

  it('shows "保存中..." button text while submitting', async () => {
    // Make setPassphrase hang to observe loading state
    let resolveSetPassphrase: (value: boolean) => void;
    mockSetPassphrase.mockImplementation(
      () => new Promise((resolve) => { resolveSetPassphrase = resolve; }),
    );

    const { getByPlaceholderText, getByText, queryByText } = render(
      <PassphraseSetupScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码（至少6个字符）'),
      'validpass123',
    );
    fireEvent.changeText(
      getByPlaceholderText('重新输入密码'),
      'validpass123',
    );

    // Start submit
    await act(async () => {
      fireEvent.press(getByText('启用锁定'));
    });

    // During submission, button text changes
    expect(queryByText('保存中...')).toBeTruthy();

    // Resolve
    await act(async () => {
      resolveSetPassphrase!(true);
    });
  });

  it('does not call setEnabled when setting passphrase in change mode', async () => {
    mockChangePassphrase.mockResolvedValue(true);

    const { getByPlaceholderText, getAllByText } = render(
      <PassphraseSetupScreen {...defaultProps} isChanging />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入当前密码'),
      'oldpass',
    );
    fireEvent.changeText(
      getByPlaceholderText('输入密码（至少6个字符）'),
      'newpass123',
    );
    fireEvent.changeText(
      getByPlaceholderText('重新输入密码'),
      'newpass123',
    );

    const buttons = getAllByText('修改密码');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    // setEnabled should NOT be called in change mode
    expect(mockSetEnabled).not.toHaveBeenCalled();
  });

  it('shows Password label for new setup', () => {
    const { getByText, queryByText } = render(
      <PassphraseSetupScreen {...defaultProps} />,
    );
    expect(getByText('密码')).toBeTruthy();
    expect(queryByText('新密码')).toBeNull();
  });

  it('shows New Passphrase label for change mode', () => {
    const { getByText } = render(
      <PassphraseSetupScreen {...defaultProps} isChanging />,
    );
    expect(getByText('新密码')).toBeTruthy();
  });
});
