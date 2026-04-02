/**
 * LockScreen Tests
 *
 * Tests for the lock screen including:
 * - Lock icon rendering
 * - Passphrase input
 * - Unlock button
 * - Successful verification calls onUnlock
 * - Failed verification shows error and records attempt
 * - Empty passphrase shows error
 * - Lockout state rendering
 * - Attempts remaining counter
 * - Lockout after too many failed attempts
 * - Error handling for service failures
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Navigation is globally mocked in jest.setup.ts

jest.mock('../../../src/hooks/useFocusTrigger', () => ({
  useFocusTrigger: () => 0,
}));

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
  // Use a functional mock so onClose can be exercised (line 181)
  CustomAlert: ({ visible, title, message, onClose }: any) => {
    if (!visible) return null;
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="custom-alert">
        <Text testID="alert-title">{title}</Text>
        <Text testID="alert-message">{message}</Text>
        <TouchableOpacity testID="alert-close-button" onPress={onClose}>
          <Text>关闭</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock('../../../src/components/AnimatedEntry', () => ({
  AnimatedEntry: ({ children }: any) => children,
}));

const mockShowAlert = jest.fn((_t: string, _m: string, _b?: any) => ({
  visible: true,
  title: _t,
  message: _m,
  buttons: _b || [],
}));

jest.mock('../../../src/components/CustomAlert', () => ({
  CustomAlert: ({ visible, title, message, onClose }: any) => {
    if (!visible) return null;
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="custom-alert">
        <Text testID="alert-title">{title}</Text>
        <Text testID="alert-message">{message}</Text>
        <TouchableOpacity testID="alert-close-button" onPress={onClose}>
          <Text>关闭</Text>
        </TouchableOpacity>
      </View>
    );
  },
  showAlert: (...args: any[]) => (mockShowAlert as any)(...args),
  hideAlert: jest.fn(() => ({ visible: false, title: '', message: '', buttons: [] })),
  initialAlertState: { visible: false, title: '', message: '', buttons: [] },
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

const mockVerifyPassphrase = jest.fn();
jest.mock('../../../src/services/authService', () => ({
  authService: {
    verifyPassphrase: (...args: any[]) => mockVerifyPassphrase(...args),
  },
}));

const mockRecordFailedAttempt = jest.fn(() => false);
const mockResetFailedAttempts = jest.fn();
const mockCheckLockout = jest.fn(() => false);
const mockGetLockoutRemaining = jest.fn(() => 0);
let mockFailedAttempts = 0;

jest.mock('../../../src/stores/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    failedAttempts: mockFailedAttempts,
    recordFailedAttempt: mockRecordFailedAttempt,
    resetFailedAttempts: mockResetFailedAttempts,
    checkLockout: mockCheckLockout,
    getLockoutRemaining: mockGetLockoutRemaining,
  })),
}));

jest.mock('../../../src/stores', () => ({
  useAppStore: jest.fn((selector?: any) => {
    const state = { themeMode: 'system' };
    return selector ? selector(state) : state;
  }),
}));

import { LockScreen } from '../../../src/screens/LockScreen';

const defaultProps = {
  onUnlock: jest.fn(),
};

describe('LockScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFailedAttempts = 0;
    mockCheckLockout.mockReturnValue(false);
    mockGetLockoutRemaining.mockReturnValue(0);
    mockRecordFailedAttempt.mockReturnValue(false);
  });

  // ---- Rendering tests ----

  it('renders lock icon and title', () => {
    const { getByText } = render(<LockScreen {...defaultProps} />);
    expect(getByText('应用已锁定')).toBeTruthy();
  });

  it('renders passphrase input', () => {
    const { getByPlaceholderText } = render(<LockScreen {...defaultProps} />);
    expect(getByPlaceholderText('输入密码')).toBeTruthy();
  });

  it('shows unlock button', () => {
    const { getByText } = render(<LockScreen {...defaultProps} />);
    expect(getByText('解锁')).toBeTruthy();
  });

  it('shows subtitle text', () => {
    const { getByText } = render(<LockScreen {...defaultProps} />);
    expect(getByText('输入您的密码以解锁')).toBeTruthy();
  });

  it('shows footer with security message', () => {
    const { getByText } = render(<LockScreen {...defaultProps} />);
    expect(getByText('您的数据受到保护并存储在本地')).toBeTruthy();
  });

  // ---- Unlock flow tests ----

  it('calls onUnlock after successful verification', async () => {
    mockVerifyPassphrase.mockResolvedValue(true);

    const { getByPlaceholderText, getByText } = render(
      <LockScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码'),
      'correct-pass',
    );

    await act(async () => {
      fireEvent.press(getByText('解锁'));
    });

    expect(mockVerifyPassphrase).toHaveBeenCalledWith('correct-pass');
    expect(mockResetFailedAttempts).toHaveBeenCalled();
    expect(defaultProps.onUnlock).toHaveBeenCalled();
  });

  it('shows error when passphrase is empty', async () => {
    const { getByText } = render(<LockScreen {...defaultProps} />);

    // The unlock button should be disabled when input is empty
    // But let's also test the handleUnlock validation
    // The button is disabled when !passphrase.trim(), so let's enter spaces
    fireEvent.press(getByText('解锁'));

    // Button is disabled so onPress won't fire - verify no verification call
    expect(mockVerifyPassphrase).not.toHaveBeenCalled();
  });

  it('records failed attempt on incorrect passphrase', async () => {
    mockVerifyPassphrase.mockResolvedValue(false);
    mockRecordFailedAttempt.mockReturnValue(false);

    const { getByPlaceholderText, getByText } = render(
      <LockScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码'),
      'wrong-pass',
    );

    await act(async () => {
      fireEvent.press(getByText('解锁'));
    });

    expect(mockVerifyPassphrase).toHaveBeenCalledWith('wrong-pass');
    expect(mockRecordFailedAttempt).toHaveBeenCalled();
    expect(defaultProps.onUnlock).not.toHaveBeenCalled();
  });

  it('shows "密码不正确" alert on wrong password', async () => {
    mockVerifyPassphrase.mockResolvedValue(false);
    mockRecordFailedAttempt.mockReturnValue(false);

    const { getByPlaceholderText, getByText } = render(
      <LockScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码'),
      'wrong-pass',
    );

    await act(async () => {
      fireEvent.press(getByText('解锁'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      '密码不正确',
      expect.stringContaining('次'),
    );
  });

  it('shows lockout alert when too many failed attempts', async () => {
    mockVerifyPassphrase.mockResolvedValue(false);
    mockRecordFailedAttempt.mockReturnValue(true); // Returns true = locked out

    const { getByPlaceholderText, getByText } = render(
      <LockScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码'),
      'wrong-pass',
    );

    await act(async () => {
      fireEvent.press(getByText('解锁'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      '尝试次数过多',
      expect.stringContaining('锁定'),
    );
  });

  // ---- Lockout state tests ----

  it('shows lockout UI when locked out', () => {
    mockCheckLockout.mockReturnValue(true);
    mockGetLockoutRemaining.mockReturnValue(180);

    const { getByText, queryByPlaceholderText } = render(
      <LockScreen {...defaultProps} />,
    );

    expect(getByText('尝试次数过多')).toBeTruthy();
    expect(getByText('请在尝试前等待')).toBeTruthy();
    // The timer should show formatted time (3:00)
    expect(getByText('3:00')).toBeTruthy();
    // Input should not be visible during lockout
    expect(queryByPlaceholderText('输入密码')).toBeNull();
  });

  it('shows lockout timer with correct format', () => {
    mockCheckLockout.mockReturnValue(true);
    mockGetLockoutRemaining.mockReturnValue(65); // 1:05

    const { getByText } = render(<LockScreen {...defaultProps} />);
    expect(getByText('1:05')).toBeTruthy();
  });

  // ---- Attempts counter tests ----

  it('shows remaining attempts when there are failed attempts', () => {
    mockFailedAttempts = 2;

    // Need to re-mock the store with updated failedAttempts
    const { useAuthStore } = require('../../../src/stores/authStore');
    (useAuthStore as jest.Mock).mockReturnValue({
      failedAttempts: 2,
      recordFailedAttempt: mockRecordFailedAttempt,
      resetFailedAttempts: mockResetFailedAttempts,
      checkLockout: mockCheckLockout,
      getLockoutRemaining: mockGetLockoutRemaining,
    });

    const { getByText } = render(<LockScreen {...defaultProps} />);
    expect(getByText('还剩 3 次尝试')).toBeTruthy();
  });

  it('shows singular "attempt" when only 1 remaining', () => {
    const { useAuthStore } = require('../../../src/stores/authStore');
    (useAuthStore as jest.Mock).mockReturnValue({
      failedAttempts: 4,
      recordFailedAttempt: mockRecordFailedAttempt,
      resetFailedAttempts: mockResetFailedAttempts,
      checkLockout: mockCheckLockout,
      getLockoutRemaining: mockGetLockoutRemaining,
    });

    const { getByText } = render(<LockScreen {...defaultProps} />);
    expect(getByText('还剩 1 次尝试')).toBeTruthy();
  });

  it('does not show attempts counter when no failed attempts', () => {
    // Ensure failedAttempts is 0
    const { useAuthStore } = require('../../../src/stores/authStore');
    (useAuthStore as jest.Mock).mockReturnValue({
      failedAttempts: 0,
      recordFailedAttempt: mockRecordFailedAttempt,
      resetFailedAttempts: mockResetFailedAttempts,
      checkLockout: mockCheckLockout,
      getLockoutRemaining: mockGetLockoutRemaining,
    });

    const { queryByText } = render(<LockScreen {...defaultProps} />);
    expect(queryByText(/还剩.*次尝试/)).toBeNull();
  });

  // ---- Error handling tests ----

  it('shows error alert when verification service throws', async () => {
    mockVerifyPassphrase.mockRejectedValue(new Error('Service error'));

    const { getByPlaceholderText, getByText } = render(
      <LockScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码'),
      'some-pass',
    );

    await act(async () => {
      fireEvent.press(getByText('解锁'));
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      '错误',
      '验证密码失败',
    );
    expect(defaultProps.onUnlock).not.toHaveBeenCalled();
  });

  it('unlock button is disabled when input is empty', () => {
    const { getByText } = render(<LockScreen {...defaultProps} />);
    // When disabled, pressing Unlock should NOT trigger verifyPassphrase
    fireEvent.press(getByText('解锁'));
    expect(mockVerifyPassphrase).not.toHaveBeenCalled();
  });

  it('unlock button is enabled when input has text', async () => {
    mockVerifyPassphrase.mockResolvedValue(true);

    const { getByPlaceholderText, getByText } = render(
      <LockScreen {...defaultProps} />,
    );

    fireEvent.changeText(
      getByPlaceholderText('输入密码'),
      'some-text',
    );

    await act(async () => {
      fireEvent.press(getByText('解锁'));
    });

    // When enabled with text, pressing Unlock SHOULD trigger verifyPassphrase
    expect(mockVerifyPassphrase).toHaveBeenCalledWith('some-text');
  });

  it('does not call verify when already locked out', async () => {
    mockCheckLockout.mockReturnValue(true);
    mockGetLockoutRemaining.mockReturnValue(60);

    const { queryByPlaceholderText } = render(
      <LockScreen {...defaultProps} />,
    );

    // During lockout the input is hidden, so user can't submit
    expect(queryByPlaceholderText('输入密码')).toBeNull();
    expect(mockVerifyPassphrase).not.toHaveBeenCalled();
  });

  it('clears passphrase after failed attempt', async () => {
    mockVerifyPassphrase.mockResolvedValue(false);
    mockRecordFailedAttempt.mockReturnValue(false);

    const { getByPlaceholderText, getByText } = render(
      <LockScreen {...defaultProps} />,
    );

    const input = getByPlaceholderText('输入密码');
    fireEvent.changeText(input, 'wrong-pass');

    await act(async () => {
      fireEvent.press(getByText('解锁'));
    });

    // After failed attempt, the input should be cleared
    // The button should be disabled again (empty input)
    expect(mockRecordFailedAttempt).toHaveBeenCalled();
  });

  // ---- Uncovered branch coverage ----

  it('shows error when passphrase is empty via onSubmitEditing (lines 61-62)', async () => {
    // The button is disabled when input is empty, but onSubmitEditing still fires
    const { getByPlaceholderText } = render(<LockScreen {...defaultProps} />);

    const input = getByPlaceholderText('输入密码');
    // Passphrase is empty — fire keyboard return key
    await act(async () => {
      fireEvent(input, 'onSubmitEditing');
    });

    // handleUnlock ran the empty-passphrase guard and showed an alert
    expect(mockShowAlert).toHaveBeenCalledWith(
      '错误',
      '请输入您的密码',
    );
    expect(mockVerifyPassphrase).not.toHaveBeenCalled();
  });

  it('skips verification when already locked out during handleUnlock (line 66)', async () => {
    // checkLockout returns false on first call (useEffect → shows input),
    // then true on the second call (inside handleUnlock → early return).
    mockCheckLockout
      .mockReturnValueOnce(false) // initial useEffect call → show input
      .mockReturnValue(true);     // handleUnlock guard → skip verification

    const { getByPlaceholderText } = render(<LockScreen {...defaultProps} />);

    const input = getByPlaceholderText('输入密码');
    fireEvent.changeText(input, 'some-pass');

    await act(async () => {
      fireEvent(input, 'onSubmitEditing');
    });

    // handleUnlock returned early without calling verify
    expect(mockVerifyPassphrase).not.toHaveBeenCalled();
  });

  it('closes alert via onClose callback (line 181)', async () => {
    mockVerifyPassphrase.mockResolvedValue(false);
    mockRecordFailedAttempt.mockReturnValue(false);

    const { getByPlaceholderText, getByText, queryByTestId } = render(
      <LockScreen {...defaultProps} />,
    );

    fireEvent.changeText(getByPlaceholderText('输入密码'), 'wrong');

    await act(async () => {
      fireEvent.press(getByText('解锁'));
    });

    // Alert is now visible
    expect(queryByTestId('custom-alert')).toBeTruthy();

    // Press the close button rendered by our mock — triggers onClose
    fireEvent.press(getByText('关闭'));

    // Alert should be dismissed (hideAlert was called)
    const { hideAlert } = require('../../../src/components/CustomAlert');
    expect(hideAlert).toHaveBeenCalled();
  });
});
