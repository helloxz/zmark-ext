<script lang="ts" setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { marked } from 'marked';
import {
  ChatbubblesOutline,
  TrashOutline,
  ArrowDownOutline,
  SendOutline,
  PersonOutline,
  ChevronForwardOutline,
  ChevronDownOutline,
  ConstructOutline,
} from '@vicons/ionicons5';
import BottomNav from '@/components/BottomNav.vue';
import PopupLayout from '@/components/PopupLayout.vue';
import PageTitle from '@/components/title.vue';
import { t } from '@/i18n';
import { requestRaw } from '@/utils/request';

interface ToolCall {
  toolCallId: string;
  toolName: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  inputText: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  collapsed: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  toolCalls?: ToolCall[];
}

const STORAGE_KEY = 'zmark:chat:messages';
const MAX_ROUNDS = 10;

const messages = ref<ChatMessage[]>([]);
const inputMessage = ref('');
const isLoading = ref(false);
const showScrollToBottom = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const aiEnabled = ref(true);

const canSend = computed(() => inputMessage.value.trim().length >= 2 && !isLoading.value);

function loadMessages() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        for (const msg of parsed) {
          if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
            for (const tc of msg.toolCalls) {
              tc.collapsed = true;
            }
          }
        }
        messages.value = parsed;
      }
    }
  } catch {
    // ignore
  }
}

function saveMessages() {
  try {
    const maxMessages = MAX_ROUNDS * 2;
    const toSave = messages.value.slice(-maxMessages);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

function clearMessages() {
  messages.value = [];
  localStorage.removeItem(STORAGE_KEY);
  message.success(t('ai.chat.clear_success'));
}

function handleClearMessages() {
  if (messages.value.length === 0) {
    message.warning(t('ai.chat.no_messages'));
    return;
  }
  dialog.warning({
    title: t('ai.chat.clear_confirm_title'),
    content: t('ai.chat.clear_confirm_content'),
    positiveText: t('ai.chat.clear_confirm_positive'),
    negativeText: t('ai.chat.clear_confirm_negative'),
    onPositiveClick: () => {
      clearMessages();
    },
  });
}

const message = useMessage();
const dialog = useDialog();

const renderer = new marked.Renderer();
renderer.link = function ({ href, text }: { href: string; text: string }) {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

const toolNameMap: Record<string, string> = {
  searchBookmarks: '搜索书签',
};

function getToolDisplayName(name: string): string {
  return toolNameMap[name] || name;
}

function formatJson(data: unknown): string {
  if (data === undefined || data === null) return '';
  if (typeof data === 'string') {
    try {
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      return data;
    }
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function toggleToolCall(msg: ChatMessage, toolCallId: string) {
  if (!msg.toolCalls) return;
  const tc = msg.toolCalls.find(t => t.toolCallId === toolCallId);
  if (tc) tc.collapsed = !tc.collapsed;
}

function renderMarkdown(content: string): string {
  if (!content) return '';
  try {
    return (marked.parse(content, { breaks: true, renderer }) as string)
      .replace(/<table>/g, '<div class="table-scroll"><table>')
      .replace(/<\/table>/g, '</table></div>');
  } catch {
    return content;
  }
}

function autoResize() {
  const textarea = inputRef.value;
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

function handleScroll() {
  if (!messagesContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  showScrollToBottom.value = scrollHeight - scrollTop - clientHeight > 100;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (canSend.value) {
      sendMessage();
    }
  }
}

async function checkAIStatus() {
  try {
    const response = await requestRaw('/api/ai_status', { auth: false });
    if (response.ok) {
      const result = await response.json();
      if ((result as { code?: number; data?: { enabled?: boolean } })?.code === 200 && (result as { data?: { enabled?: boolean } })?.data?.enabled === false) {
        aiEnabled.value = false;
      } else {
        aiEnabled.value = true;
      }
    } else {
      aiEnabled.value = true;
    }
  } catch {
    aiEnabled.value = true;
  }
}

async function sendMessage() {
  const text = inputMessage.value.trim();
  if (!text || isLoading.value) return;

  messages.value.push({ role: 'user', content: text });
  inputMessage.value = '';
  autoResize();
  saveMessages();
  scrollToBottom();

  const aiMessageIndex = messages.value.length;
  messages.value.push({ role: 'assistant', content: '', loading: true });
  isLoading.value = true;
  scrollToBottom();

  try {
    const response = await requestRaw('/api/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await response.json();
      messages.value[aiMessageIndex].content =
        (errorData as { msg?: string }).msg || t('ai.chat.error');
      messages.value[aiMessageIndex].loading = false;
      saveMessages();
      isLoading.value = false;
      return;
    }

    if (!response.ok) {
      messages.value[aiMessageIndex].content = t('ai.chat.error');
      messages.value[aiMessageIndex].loading = false;
      saveMessages();
      isLoading.value = false;
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      messages.value[aiMessageIndex].content = t('ai.chat.error');
      messages.value[aiMessageIndex].loading = false;
      saveMessages();
      isLoading.value = false;
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const chunk = JSON.parse(jsonStr);

          if (chunk.type === 'text-delta' && chunk.delta) {
            messages.value[aiMessageIndex].content += chunk.delta;
            messages.value[aiMessageIndex].loading = false;
            scrollToBottom();
          }

          if (chunk.type === 'tool-input-start' && chunk.toolCallId) {
            if (!messages.value[aiMessageIndex].toolCalls) {
              messages.value[aiMessageIndex].toolCalls = [];
            }
            messages.value[aiMessageIndex].toolCalls.push({
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName || 'unknown',
              state: 'input-streaming',
              inputText: '',
              collapsed: true,
            });
            scrollToBottom();
          }

          if (chunk.type === 'tool-input-delta' && chunk.toolCallId) {
            const toolCalls = messages.value[aiMessageIndex].toolCalls;
            if (toolCalls) {
              const tc = toolCalls.find(t => t.toolCallId === chunk.toolCallId);
              if (tc) {
                tc.inputText += chunk.inputTextDelta || '';
              }
            }
          }

          if (chunk.type === 'tool-input-available' && chunk.toolCallId) {
            const toolCalls = messages.value[aiMessageIndex].toolCalls;
            if (toolCalls) {
              const tc = toolCalls.find(t => t.toolCallId === chunk.toolCallId);
              if (tc) {
                tc.state = 'input-available';
                tc.input = chunk.input;
              }
            }
          }

          if (chunk.type === 'tool-output-available' && chunk.toolCallId) {
            const toolCalls = messages.value[aiMessageIndex].toolCalls;
            if (toolCalls) {
              const tc = toolCalls.find(t => t.toolCallId === chunk.toolCallId);
              if (tc) {
                tc.state = 'output-available';
                tc.output = chunk.output;
              }
            }
          }

          if (chunk.type === 'tool-output-error' && chunk.toolCallId) {
            const toolCalls = messages.value[aiMessageIndex].toolCalls;
            if (toolCalls) {
              const tc = toolCalls.find(t => t.toolCallId === chunk.toolCallId);
              if (tc) {
                tc.state = 'output-error';
                tc.errorText = chunk.errorText;
              }
            }
          }

          if (chunk.type === 'error' && chunk.errorText) {
            messages.value[aiMessageIndex].content = chunk.errorText;
            messages.value[aiMessageIndex].loading = false;
          }
        } catch {
          // ignore parse error
        }
      }
    }

    if (!messages.value[aiMessageIndex].content) {
      messages.value[aiMessageIndex].content = t('ai.chat.no_reply');
    }
  } catch (error) {
    console.error('Chat request failed:', error);
    messages.value[aiMessageIndex].content = t('ai.chat.network_error');
    messages.value[aiMessageIndex].loading = false;
  } finally {
    isLoading.value = false;
    saveMessages();
    scrollToBottom();
  }
}

watch(messages, saveMessages, { deep: true });

onMounted(() => {
  checkAIStatus();
  loadMessages();
  scrollToBottom();
  nextTick(() => {
    inputRef.value?.focus();
  });
});
</script>

<template>
  <PopupLayout>
    <PageTitle title="AI 检索" />

    <div v-if="aiEnabled" class="flex min-h-0 flex-1 flex-col bg-[#f7f7f8]">
      <!-- 消息区域 -->
      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto px-3 py-4"
        @scroll="handleScroll"
      >
        <div class="space-y-4 overflow-x-hidden">
          <!-- 空状态提示 -->
          <div
            v-if="messages.length === 0"
            class="flex flex-col items-center justify-center py-16"
          >
            <div
              class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-100"
            >
              <n-icon :component="ChatbubblesOutline" size="28" color="#2D8CF0" />
            </div>
            <div class="mb-1 text-[15px] font-medium text-[#333]">
              {{ t('ai.chat.title') }}
            </div>
            <div class="text-[13px] text-[#999]">
              {{ t('ai.chat.empty_hint') }}
            </div>
          </div>

          <!-- 消息列表 -->
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="flex min-w-0 gap-2 overflow-x-hidden"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <!-- AI 头像 -->
            <div
              v-if="msg.role === 'assistant'"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500"
            >
              <n-icon :component="ChatbubblesOutline" size="14" color="#fff" />
            </div>

            <!-- 消息气泡 -->
            <div
              class="min-w-0 rounded-2xl px-3 py-2 shadow-sm"
              :class="[
                msg.role === 'user'
                  ? 'bg-sky-500 text-white ml-auto max-w-[75%]'
                  : 'bg-white text-[#333] flex-1 overflow-x-hidden',
              ]"
            >
              <!-- 用户消息 -->
              <div
                v-if="msg.role === 'user'"
                class="whitespace-pre-wrap text-[13px] leading-5"
              >
                {{ msg.content }}
              </div>

              <!-- AI 消息 -->
              <div v-else>
                <!-- 工具调用折叠区域 -->
                <div
                  v-if="msg.toolCalls && msg.toolCalls.length > 0"
                  class="tool-calls-container"
                >
                  <div
                    v-for="tc in msg.toolCalls"
                    :key="tc.toolCallId"
                    class="tool-call-item"
                  >
                    <div
                      class="tool-call-header"
                      @click="toggleToolCall(msg, tc.toolCallId)"
                    >
                      <n-icon
                        :component="tc.collapsed ? ChevronForwardOutline : ChevronDownOutline"
                        size="14"
                        color="#8b9dc3"
                      />
                      <n-icon
                        :component="ConstructOutline"
                        size="14"
                        color="#2D8CF0"
                      />
                      <span class="tool-call-name">
                        {{ getToolDisplayName(tc.toolName) }}
                      </span>
                      <span
                        v-if="tc.inputText"
                        class="tool-call-preview"
                      >
                        {{ tc.inputText.length > 40 ? tc.inputText.slice(0, 40) + '...' : tc.inputText }}
                      </span>
                      <span
                        v-if="tc.state === 'input-streaming'"
                        class="tool-call-status streaming"
                      >
                        参数生成中...
                      </span>
                      <span
                        v-else-if="tc.state === 'output-available'"
                        class="tool-call-status done"
                      >
                        已完成
                      </span>
                      <span
                        v-else-if="tc.state === 'output-error'"
                        class="tool-call-status error"
                      >
                        出错
                      </span>
                    </div>
                    <div v-if="!tc.collapsed" class="tool-call-detail">
                      <div v-if="tc.input || tc.inputText" class="tool-call-section">
                        <div class="tool-call-section-title">调用参数</div>
                        <pre class="tool-call-code">{{ tc.input ? formatJson(tc.input) : tc.inputText }}</pre>
                      </div>
                      <div v-if="tc.output !== undefined" class="tool-call-section">
                        <div class="tool-call-section-title">返回结果</div>
                        <pre class="tool-call-code">{{ formatJson(tc.output) }}</pre>
                      </div>
                      <div v-if="tc.errorText" class="tool-call-section">
                        <div class="tool-call-section-title">错误信息</div>
                        <pre class="tool-call-code error">{{ tc.errorText }}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Markdown 正文 -->
                <div
                  class="markdown-body min-w-0 overflow-x-hidden text-[13px] leading-5"
                  v-html="renderMarkdown(msg.content)"
                />
              </div>

              <!-- 加载状态 -->
              <div
                v-if="msg.role === 'assistant' && msg.loading && !msg.content && (!msg.toolCalls || msg.toolCalls.length === 0)"
                class="flex items-center gap-1 text-[13px] text-[#999]"
              >
                <span class="typing-dot"></span>
                <span class="typing-dot delay-150"></span>
                <span class="typing-dot delay-300"></span>
                <span class="ml-1">{{ t('ai.chat.thinking') }}</span>
              </div>
            </div>

            <!-- 用户头像 -->
            <div
              v-if="msg.role === 'user'"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-400"
            >
              <n-icon :component="PersonOutline" size="14" color="#fff" />
            </div>
          </div>
        </div>
      </div>

      <!-- 回到底部按钮 -->
      <Transition name="fade">
        <button
          v-if="showScrollToBottom"
          class="fixed bottom-20 left-1/2 z-10 flex h-7 -translate-x-1/2 cursor-pointer items-center gap-1 rounded-full bg-white px-2.5 text-[12px] text-[#666] shadow-md transition-colors hover:bg-gray-50"
          @click="scrollToBottom"
        >
          <n-icon :component="ArrowDownOutline" size="12" />
          <span>{{ t('ai.chat.scroll_to_bottom') }}</span>
        </button>
      </Transition>

      <!-- 底部输入框 -->
      <div
        class="shrink-0 border-t border-gray-200 bg-white px-3 py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.03)]"
      >
        <div class="flex items-end gap-2">
          <div
            class="flex min-h-[40px] flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 transition-colors focus-within:border-sky-500 focus-within:bg-white"
          >
            <textarea
              ref="inputRef"
              v-model="inputMessage"
              :placeholder="t('ai.chat.placeholder')"
              :disabled="isLoading"
              class="max-h-[100px] min-h-[22px] flex-1 resize-none bg-transparent text-[13px] leading-5 text-[#333] outline-none placeholder:text-[#bbb]"
              rows="1"
              @input="autoResize"
              @keydown="handleKeydown"
            />
          </div>
          <button
            class="flex h-[40px] w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-all"
            :class="
              canSend
                ? 'bg-sky-500 text-white shadow-md hover:bg-sky-600'
                : 'bg-gray-100 text-[#ccc]'
            "
            :disabled="!canSend"
            @click="sendMessage"
          >
            <n-icon
              :component="SendOutline"
              size="18"
              :color="canSend ? '#fff' : '#ccc'"
            />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex min-h-0 flex-1 flex-col items-center justify-center bg-[#f7f7f8]">
      <div class="flex flex-col items-center justify-center py-16">
        <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
          <n-icon :component="ChatbubblesOutline" size="28" color="#2D8CF0" />
        </div>
        <div class="mb-1 text-[15px] font-medium text-[#333]">
          {{ t('ai.chat.title') }}
        </div>
        <div class="max-w-[300px] text-center text-[13px] text-[#999]">
          {{ t('ai.chat.disabled_hint') }}
        </div>
      </div>
    </div>

    <BottomNav class="shrink-0" />
  </PopupLayout>
</template>

<style scoped>
/* Markdown 样式 */
.markdown-body {
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}

.markdown-body :deep(.table-scroll) {
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  margin: 6px 0;
}

.markdown-body :deep(table) {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 6px 10px;
  text-align: left;
  white-space: nowrap;
}

.markdown-body :deep(th) {
  background-color: #f9fafb;
  font-weight: 600;
}

.markdown-body :deep(tr:hover) {
  background-color: #f9fafb;
}

.markdown-body :deep(a) {
  color: #2D8CF0;
  text-decoration: none;
  word-break: break-all;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(code) {
  background-color: #f3f4f6;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 12px;
}

.markdown-body :deep(pre) {
  background-color: #1f2937;
  color: #e5e7eb;
  padding: 10px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 6px 0;
}

.markdown-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 18px;
  margin: 4px 0;
}

.markdown-body :deep(li) {
  margin: 2px 0;
}

.markdown-body :deep(p) {
  margin: 4px 0;
}

.markdown-body :deep(p:first-child) {
  margin-top: 0;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

/* 打字动画 */
.typing-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #999;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-dot.delay-150 {
  animation-delay: 0.15s;
}

.typing-dot.delay-300 {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.6;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 5px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}

/* 工具调用折叠样式 */
.tool-calls-container {
  margin-bottom: 8px;
}

.tool-call-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
  background-color: #f9fafb;
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s;
}

.tool-call-header:hover {
  background-color: #f0f2f5;
}

.tool-call-name {
  font-size: 12px;
  font-weight: 500;
  color: #2D8CF0;
  white-space: nowrap;
  flex-shrink: 0;
}

.tool-call-preview {
  font-size: 11px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.tool-call-status {
  margin-left: auto;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.tool-call-status.streaming {
  color: #b8860b;
  background-color: #fdf6e3;
}

.tool-call-status.done {
  color: #2e7d32;
  background-color: #e8f5e9;
}

.tool-call-status.error {
  color: #c62828;
  background-color: #ffebee;
}

.tool-call-detail {
  border-top: 1px solid #e5e7eb;
  padding: 8px 10px;
}

.tool-call-section {
  margin-bottom: 6px;
}

.tool-call-section:last-child {
  margin-bottom: 0;
}

.tool-call-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tool-call-code {
  font-size: 11px;
  line-height: 1.5;
  color: #444;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  margin: 0;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.tool-call-code.error {
  color: #c62828;
  background-color: #fff8f8;
}
</style>
