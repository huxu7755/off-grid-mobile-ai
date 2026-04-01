import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Button, Card } from '../components';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors, ThemeShadows } from '../theme';
import { TYPOGRAPHY, SPACING } from '../constants';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import logger from '../utils/logger';

interface PassphraseSetupScreenProps {
  isChanging?: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export const PassphraseSetupScreen: React.FC<PassphraseSetupScreenProps> = ({
  isChanging = false,
  onComplete,
  onCancel,
}) => {
  const [currentPassphrase, setCurrentPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { setEnabled } = useAuthStore();

  const validatePassphrase = (passphrase: string): string | null => {
    if (passphrase.length < 6) {
      return '密码至少需要6个字符';
    }
    if (passphrase.length > 50) {
      return '密码最多50个字符';
    }
    return null;
  };

  const handleSubmit = async () => {
    // 验证新密码
    const error = validatePassphrase(newPassphrase);
    if (error) {
      setAlertState(showAlert('无效密码', error));
      return;
    }

    // 检查确认密码是否匹配
    if (newPassphrase !== confirmPassphrase) {
      setAlertState(showAlert('不匹配', '两次输入的密码不一致'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (isChanging) {
        // 验证当前密码并修改
        const success = await authService.changePassphrase(currentPassphrase, newPassphrase);
        if (!success) {
          setAlertState(showAlert('错误', '当前密码不正确'));
          setIsSubmitting(false);
          return;
        }
        setAlertState(showAlert('成功', '密码修改成功'));
      } else {
        // 设置新密码
        const success = await authService.setPassphrase(newPassphrase);
        if (!success) {
          setAlertState(showAlert('错误', '设置密码失败'));
          setIsSubmitting(false);
          return;
        }
        setEnabled(true);
        setAlertState(showAlert('成功', '密码锁定已启用'));
      }

      onComplete();
    } catch (err) {
      logger.warn('[PassphraseSetup] Operation failed:', err);
      setAlertState(showAlert('错误', '发生错误，请重试。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelButton}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isChanging ? '修改密码' : '设置密码'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBox}>
              <Icon name="lock" size={48} color={colors.primary} />
            </View>
          </View>

          <Text style={styles.description}>
            {isChanging
              ? '输入您当前的密码，然后设置新密码。'
              : '创建一个密码来锁定应用。每次打开应用时都需要输入。'}
          </Text>

          <Card style={styles.inputCard}>
            {isChanging && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>当前密码</Text>
                <TextInput
                  style={styles.input}
                  value={currentPassphrase}
                  onChangeText={setCurrentPassphrase}
                  placeholder="输入当前密码"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isChanging ? '新密码' : '密码'}
              </Text>
              <TextInput
                style={styles.input}
                value={newPassphrase}
                onChangeText={setNewPassphrase}
                placeholder="输入密码（至少6个字符）"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>确认密码</Text>
              <TextInput
                style={styles.input}
                value={confirmPassphrase}
                onChangeText={setConfirmPassphrase}
                placeholder="重新输入密码"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </Card>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>好密码的提示：</Text>
            <Text style={styles.tipItem}>• 使用单词和数字的组合</Text>
            <Text style={styles.tipItem}>• 使其容易记住但不明显</Text>
            <Text style={styles.tipItem}>• 避免使用个人信息</Text>
          </View>

          <Button
            title={(() => {
              if (isSubmitting) return '保存中...';
              return isChanging ? '修改密码' : '启用锁定';
            })()}
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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

const createStyles = (colors: ThemeColors, _shadows: ThemeShadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSpacer: {
    width: 50,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    ...TYPOGRAPHY.body,
    color: colors.textSecondary,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  iconContainer: {
    alignItems: 'center' as const,
    marginVertical: SPACING.xl,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  inputCard: {
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.text,
    marginBottom: SPACING.sm,
  },
  input: {
    ...TYPOGRAPHY.body,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
    color: colors.text,
  },
  tips: {
    marginBottom: SPACING.xl,
  },
  tipsTitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginBottom: SPACING.sm,
  },
  tipItem: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    lineHeight: 20,
  },
  submitButton: {
    marginBottom: 32,
  },
});
