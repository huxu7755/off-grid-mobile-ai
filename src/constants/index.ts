export { MODEL_RECOMMENDATIONS, RECOMMENDED_MODELS, MODEL_ORGS, QUANTIZATION_INFO } from './models';

// Hugging Face API configuration
export const HF_API = {
  baseUrl: 'https://huggingface.co',
  apiUrl: 'https://huggingface.co/api',
  modelsEndpoint: '/models',
  searchParams: {
    filter: 'gguf',
    sort: 'downloads',
    direction: '-1',
    limit: 30,
  },
};

// Model credibility configuration
// LM Studio community - highest credibility for GGUF models
export const LMSTUDIO_AUTHORS = [
  'lmstudio-community',
  'lmstudio-ai',
];

// Official model creators - these are the original model authors
export const OFFICIAL_MODEL_AUTHORS: Record<string, string> = {
  'meta-llama': 'Meta',
  'microsoft': 'Microsoft',
  'google': 'Google',
  'Qwen': 'Alibaba',
  'mistralai': 'Mistral AI',
  'HuggingFaceTB': 'Hugging Face',
  'HuggingFaceH4': 'Hugging Face',
  'bigscience': 'BigScience',
  'EleutherAI': 'EleutherAI',
  'tiiuae': 'TII UAE',
  'stabilityai': 'Stability AI',
  'databricks': 'Databricks',
  'THUDM': 'Tsinghua University',
  'baichuan-inc': 'Baichuan',
  'internlm': 'InternLM',
  '01-ai': '01.AI',
  'deepseek-ai': 'DeepSeek',
  'CohereForAI': 'Cohere',
  'allenai': 'Allen AI',
  'nvidia': 'NVIDIA',
  'apple': 'Apple',
};

// Verified quantizers - trusted community members who quantize models
export const VERIFIED_QUANTIZERS: Record<string, string> = {
  'TheBloke': 'TheBloke',
  'bartowski': 'bartowski',
  'QuantFactory': 'QuantFactory',
  'mradermacher': 'mradermacher',
  'second-state': 'Second State',
  'MaziyarPanahi': 'Maziyar Panahi',
  'Triangle104': 'Triangle104',
  'unsloth': 'Unsloth',
  'ggml-org': 'GGML (HuggingFace)',
};

// Credibility level labels
export const CREDIBILITY_LABELS = {
  lmstudio: {
    label: 'LM Studio',
    description: 'Official LM Studio quantization - highest quality GGUF',
    color: '#22D3EE', // cyan
  },
  official: {
    label: 'Official',
    description: 'From the original model creator',
    color: '#22C55E', // green
  },
  'verified-quantizer': {
    label: 'Verified',
    description: 'From a trusted quantization provider',
    color: '#A78BFA', // purple
  },
  community: {
    label: 'Community',
    description: 'Community contributed model',
    color: '#64748B', // gray
  },
};

// App configuration
export const APP_CONFIG = {
  modelStorageDir: 'models',
  whisperStorageDir: 'whisper-models',
  maxConcurrentDownloads: 1,
  defaultSystemPrompt: `You are a helpful AI assistant running locally on the user's device. Your responses should be:
- Accurate and factual - never make up information
- Concise but complete - answer the question fully without unnecessary elaboration
- Helpful and friendly - focus on solving the user's actual need
- Honest about limitations - if you don't know something, say so

If asked about yourself, you can mention you're a local AI assistant that prioritizes user privacy.`,
  streamingEnabled: true,
  maxContextLength: 2048, // Balanced for speed and context (increase to 4096 if you need more history)
};

// Onboarding slides
export const ONBOARDING_SLIDES = [
  {
    id: 'freedom',
    keyword: '专属',
    title: '您的AI，\n无拘无束。',
    description: '无订阅，无需注册，无人读取您的聊天内容。一个运行在您设备上的AI，只听命于您。',
  },
  {
    id: 'magic',
    keyword: '智能',
    title: '只需对话，\n一切搞定。',
    description: '描述图像 — 它会创建。展示照片 — 它能理解。附加文档 — 它会阅读。一次对话，无需切换模式，无摩擦体验。',
  },
  {
    id: 'create',
    keyword: '创作',
    title: '简单描述，\n惊艳呈现。',
    description: '输入“想象一只猫在月球上”，看着您的文字在几秒钟内变成生动的图像。AI自动增强您的想法 — 无需提示工程。',
  },
  {
    id: 'hardware',
    keyword: '就绪',
    title: '由您驱动，\n随心所欲。',
    description: '在手机上使用Metal和神经引擎加速运行模型 — 或连接到家庭网络中已有的强大模型。我们会为您找到最佳设置。',
  },
];

// Fonts
export const FONTS = {
  mono: 'Menlo',
};

// Typography Scale - Centralized font sizes and styles
export const TYPOGRAPHY = {
  // Display / Hero numbers
  display: {
    fontSize: 22,
    fontFamily: FONTS.mono,
    fontWeight: '200' as const,
    letterSpacing: -0.5,
  },

  // Headings
  h1: {
    fontSize: 24,
    fontFamily: FONTS.mono,
    fontWeight: '300' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 16,
    fontFamily: FONTS.mono,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 13,
    fontFamily: FONTS.mono,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
  },

  // Body text
  body: {
    fontSize: 14,
    fontFamily: FONTS.mono,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 13,
    fontFamily: FONTS.mono,
    fontWeight: '400' as const,
  },

  // Labels (whispers)
  label: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    fontWeight: '400' as const,
    letterSpacing: 0.3,
  },
  labelSmall: {
    fontSize: 9,
    fontFamily: FONTS.mono,
    fontWeight: '400' as const,
    letterSpacing: 0.3,
  },

  // Metadata / Details
  meta: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    fontWeight: '300' as const,
  },
  metaSmall: {
    fontSize: 9,
    fontFamily: FONTS.mono,
    fontWeight: '300' as const,
  },
};

// Spacing Scale - Consistent whitespace
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

