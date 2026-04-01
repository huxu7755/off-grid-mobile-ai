import { Dispatch, SetStateAction } from 'react';
import { showAlert, AlertState } from '../../components';
import { Message } from '../../types';
import {
  regenerateResponseFn, executeDeleteConversationFn, handleImageGenerationFn,
} from './useChatGenerationActions';
import type { GenerationDeps } from './useChatGenerationActions';

type SetState<T> = Dispatch<SetStateAction<T>>;

type RetryParams = {
  activeConversationId: string | null | undefined;
  hasActiveModel: boolean;
  activeConversation: any;
  deleteMessagesAfter: (c: string, m: string) => void;
  setDebugInfo: SetState<any>;
};

export async function handleRetryMessageFn(
  message: Message, genDeps: GenerationDeps, p: RetryParams,
): Promise<void> {
  if (!p.activeConversationId || !p.hasActiveModel) return;
  const msgs = p.activeConversation?.messages || [];
  if (message.role === 'user') {
    const idx = msgs.findIndex((m: Message) => m.id === message.id);
    if (idx !== -1 && idx < msgs.length - 1) p.deleteMessagesAfter(p.activeConversationId, message.id);
    await regenerateResponseFn(genDeps, { setDebugInfo: p.setDebugInfo, userMessage: message });
  } else {
    const idx = msgs.findIndex((m: Message) => m.id === message.id);
    const prev = idx > 0 ? msgs.slice(0, idx).reverse().find((m: Message) => m.role === 'user') : null;
    if (prev) {
      p.deleteMessagesAfter(p.activeConversationId, prev.id);
      await regenerateResponseFn(genDeps, { setDebugInfo: p.setDebugInfo, userMessage: prev });
    }
  }
}

type EditParams = {
  message: Message;
  newContent: string;
  activeConversationId: string | null | undefined;
  hasActiveModel: boolean;
  updateMessageContent: (c: string, m: string, v: string) => void;
  deleteMessagesAfter: (c: string, m: string) => void;
  setDebugInfo: SetState<any>;
};

export async function handleEditMessageFn(genDeps: GenerationDeps, p: EditParams): Promise<void> {
  if (!p.activeConversationId || !p.hasActiveModel) return;
  p.updateMessageContent(p.activeConversationId, p.message.id, p.newContent);
  p.deleteMessagesAfter(p.activeConversationId, p.message.id);
  await regenerateResponseFn(genDeps, { setDebugInfo: p.setDebugInfo, userMessage: { ...p.message, content: p.newContent } });
}

export function handleDeleteConversationFn(
  genDeps: GenerationDeps,
  p: { activeConversationId: string | null | undefined; activeConversation: any; setAlertState: SetState<AlertState> },
): void {
  if (!p.activeConversationId || !p.activeConversation) return;
  p.setAlertState(showAlert(
    '删除对话',
    '确定要删除此对话吗？这也会删除在此聊天中生成的所有图像。',
    [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => { executeDeleteConversationFn(genDeps).catch(() => {}); } },
    ],
  ));
}

export async function handleGenerateImageFromMsgFn(
  prompt: string, genDeps: GenerationDeps,
  p: { activeConversationId: string | null | undefined; activeImageModel: any; setAlertState: SetState<AlertState> },
): Promise<void> {
  if (!p.activeConversationId || !p.activeImageModel) {
    p.setAlertState(showAlert('无图像模型', '请先从模型屏幕加载图像模型。'));
    return;
  }
  await handleImageGenerationFn(genDeps, { prompt, conversationId: p.activeConversationId, skipUserMessage: true });
}
