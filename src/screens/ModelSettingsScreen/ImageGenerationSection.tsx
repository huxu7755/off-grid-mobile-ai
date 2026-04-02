import React, { useState } from 'react';
import { View, Text, Switch, Platform, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { AdvancedToggle, Card } from '../../components';
import { Button } from '../../components/Button';
import { useTheme, useThemedStyles } from '../../theme';
import { useAppStore } from '../../stores';
import { useClearGpuCache } from '../../hooks/useImageGenerationSettings';
import { createStyles } from './styles';

// ─── Advanced Sub-Components ─────────────────────────────────────────────────

const EnhanceImageToggle: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();
  const trackColor = { false: colors.surfaceLight, true: `${colors.primary}80` };

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>增强图像提示词</Text>
        <Text style={styles.toggleDesc}>
          {settings?.enhanceImagePrompts
            ? '文本模型在图像生成前优化您的提示词（较慢但效果更好）'
            : '直接使用您的提示词进行图像生成（更快）'}
        </Text>
      </View>
      <Switch
        value={settings?.enhanceImagePrompts ?? false}
        onValueChange={(value) => updateSettings({ enhanceImagePrompts: value })}
        trackColor={trackColor}
        thumbColor={settings?.enhanceImagePrompts ? colors.primary : colors.textMuted}
      />
    </View>
  );
};

const ImageGpuSection: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();
  const { clearing, handleClearCache } = useClearGpuCache();
  const trackColor = { false: colors.surfaceLight, true: `${colors.primary}80` };
  const isOpenCL = settings?.imageUseOpenCL ?? true;

  return (
    <>
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>OpenCL GPU 加速</Text>
          <Text style={styles.toggleDesc}>
            使用 GPU 加速图像生成。首次运行可能较慢，因为需要为您的设备进行优化。
          </Text>
        </View>
        <Switch
          value={isOpenCL}
          onValueChange={(value) => updateSettings({ imageUseOpenCL: value })}
          trackColor={trackColor}
          thumbColor={isOpenCL ? colors.primary : colors.textMuted}
        />
      </View>
      {isOpenCL && (
        <TouchableOpacity
          style={[styles.toggleRow, styles.clearCacheRow]}
          onPress={handleClearCache}
          disabled={clearing}
        >
          <Text style={styles.clearCacheText}>
            {clearing ? '清除中...' : '清除 GPU 缓存'}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const DetectionMethodRow: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();

  if (settings?.imageGenerationMode !== 'auto') return null;

  return (
    <View style={styles.settingSection}>
      <Text style={styles.settingLabel}>检测方法</Text>
      <Text style={styles.settingDesc}>
        {settings?.autoDetectMethod === 'pattern'
          ? '快速关键词匹配'
          : '使用文本模型进行分类'}
      </Text>
      <View style={styles.buttonRow}>
        <Button
          title="模式"
          variant="secondary"
          size="medium"
          active={settings?.autoDetectMethod === 'pattern'}
          onPress={() => updateSettings({ autoDetectMethod: 'pattern' })}
          style={styles.flex1}
        />
        <Button
          title="LLM"
          variant="secondary"
          size="medium"
          active={settings?.autoDetectMethod === 'llm'}
          onPress={() => updateSettings({ autoDetectMethod: 'llm' })}
          style={styles.flex1}
        />
      </View>
    </View>
  );
};

// ─── Advanced Section ────────────────────────────────────────────────────────

const ImageAdvancedSection: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();

  return (
    <>
      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>引导比例</Text>
          <Text style={styles.sliderValue}>{(settings?.imageGuidanceScale || 7.5).toFixed(1)}</Text>
        </View>
        <Text style={styles.sliderDesc}>越高 = 越严格遵循提示词</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={20}
          step={0.5}
          value={settings?.imageGuidanceScale || 7.5}
          onSlidingComplete={(value) => updateSettings({ imageGuidanceScale: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>图像线程</Text>
          <Text style={styles.sliderValue}>{settings?.imageThreads ?? 4}</Text>
        </View>
        <Text style={styles.sliderDesc}>
          用于图像生成的 CPU 线程（在下次加载图像模型时生效）
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={8}
          step={1}
          value={settings?.imageThreads ?? 4}
          onSlidingComplete={(value) => updateSettings({ imageThreads: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <DetectionMethodRow />
      <EnhanceImageToggle />

      {Platform.OS === 'android' && <ImageGpuSection />}
    </>
  );
};

// ─── Main Section ────────────────────────────────────────────────────────────

export const ImageGenerationSection: React.FC = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateSettings } = useAppStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isAutoMode = settings?.imageGenerationMode === 'auto';
  const trackColor = { false: colors.surfaceLight, true: `${colors.primary}80` };

  return (
    <Card style={styles.section}>
      <Text style={styles.settingHelp}>
        控制聊天中图像生成请求的处理方式。
      </Text>

      {/* ── Basic Settings ── */}

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>自动检测</Text>
          <Text style={styles.toggleDesc}>
            {isAutoMode
              ? 'LLM 将判断您的消息是否在请求图像'
              : '仅在您点击图像按钮时生成图像'}
          </Text>
        </View>
        <Switch
          value={isAutoMode}
          onValueChange={(value) =>
            updateSettings({ imageGenerationMode: value ? 'auto' : 'manual' })
          }
          trackColor={trackColor}
          thumbColor={isAutoMode ? colors.primary : colors.textMuted}
        />
      </View>
      <Text style={styles.toggleNote}>
        {isAutoMode
          ? '在自动模式下，当加载了图像模型时，像"给我画一个日落"这样的消息将自动生成图像。'
          : '在手动模式下，您必须点击聊天中的 IMG 按钮来生成图像。'}
      </Text>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>图像步数</Text>
          <Text style={styles.sliderValue}>{settings?.imageSteps || 8}</Text>
        </View>
        <Text style={styles.sliderDesc}>更多步数 = 更好的质量但更慢（4-8 快速，20-50 高质量）</Text>
        <Slider
          style={styles.slider}
          minimumValue={4}
          maximumValue={50}
          step={1}
          value={settings?.imageSteps || 8}
          onSlidingComplete={(value) => updateSettings({ imageSteps: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>图像大小</Text>
          <Text style={styles.sliderValue}>{settings?.imageWidth ?? 256}x{settings?.imageHeight ?? 256}</Text>
        </View>
        <Text style={styles.sliderDesc}>输出分辨率（越小 = 越快，越大 = 更多细节）</Text>
        <Slider
          style={styles.slider}
          minimumValue={128}
          maximumValue={512}
          step={64}
          value={settings?.imageWidth ?? 256}
          onSlidingComplete={(value) => updateSettings({ imageWidth: value, imageHeight: value })}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
      </View>

      <AdvancedToggle isExpanded={showAdvanced} onPress={() => setShowAdvanced(!showAdvanced)} testID="image-advanced-toggle" />

      {showAdvanced && <ImageAdvancedSection />}
    </Card>
  );
};
