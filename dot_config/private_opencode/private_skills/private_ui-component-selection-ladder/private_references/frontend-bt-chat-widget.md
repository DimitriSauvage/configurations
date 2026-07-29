# BtChatWidget

**Package:** `@beetween/design-system-ui`
**Import:** `import { BtChatWidget } from '@beetween/design-system-ui'`
**Source:** `src/components/bt-chat-widget/`

## Overview

AI-powered chat support widget presented as a floating popover or sidebar panel. Exposes conversation state, message history, and agent interactions via composables (`useAiPanel`, `useAiChatMessages`). Handles message streaming, prepared question suggestions, and conversation persistence via `conversationHistory`. Does not fetch or call APIs — consuming app orchestrates the agent integration.

## TypeScript Interfaces

```typescript
export interface BtChatWidgetUser {
  firstName: string;
  lastName: string;
}

export interface BtChatWidgetPreparedQuestion {
  label?: string;
  desc?: string;
  icon?: string;
  prompt: string;
}

export interface BtChatWidgetConversationEntry {
  id: number;
  title: string;
  date: Date;
}

export interface BtChatWidgetMessage {
  id: number;
  sender: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  streaming?: boolean;
  type?: 'normal' | 'error' | 'fallback';
  resourceLink?: string;
  resourceLabel?: string;
}

export type BtChatWidgetProps = BaseComponentProps & {
  currentUser: BtChatWidgetUser;
  promptSuggestions?: readonly string[];
  preparedQuestionsTitleText?: string;
  conversationHistory?: BtChatWidgetConversationEntry[];
  messageMaxLength?: number;
  showMessageLength?: boolean;
};
```

## Props

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `currentUser` | `BtChatWidgetUser` | — | **Yes** | Current user (first/last name used for avatar initials). |
| `promptSuggestions` | `readonly string[]` | `[]` | No | Array of prepared question text shown as suggestion chips in the empty state. |
| `preparedQuestionsTitleText` | `string` | — | No | Label text displayed above the prepared questions list. Falls back to i18n `PreparedQuestionsTitle` if omitted. |
| `conversationHistory` | `BtChatWidgetConversationEntry[]` | `[]` | No | Saved conversations shown in the history sidebar. Each entry has `id`, `title`, and `date`. |
| `messageMaxLength` | `number` | `2000` | No | Max character count allowed in the composer input. |
| `showMessageLength` | `boolean` | `false` | No | Show a character count indicator in the composer. |

## Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `selectConversation` | `BtChatWidgetConversationEntry` | Fired when user clicks a conversation in the history panel. App must load and display that conversation's messages. |

## Slots

| Name | Scoped Props | Description |
|------|-------------|-------------|
| `header` | — | Custom content above the message list. |
| `empty-state` | — | Override default empty state (no messages). |
| `composer-actions` | — | Extra actions in the composer toolbar (rendered alongside send button). |

## Composables (Exposed via `defineExpose`)

The widget exposes internal state and actions via composables and a direct method:

| Name | Type | Description |
|------|------|-------------|
| `loadConversation` | `(entry: BtChatWidgetConversationEntry) => void` | Load a conversation from history into the active view. Call after receiving a `selectConversation` event. |

Internal composables also exposed:

- `useAiPanel()` — Controls panel open/close state via `aiChatOpen` ref
- `useAiChatMessages()` — Manages message history
- `useChatActions()` — Orchestrates user → agent message flow
- `useChatAgent()` — Integrates with streaming agent responses

Consumer is responsible for:

1. Feeding agent responses into the message composables
2. Handling `selectConversation` event to load history
3. Managing token lifecycle and API calls outside the widget

## Usage Example

```vue
<script setup lang="ts">
import { BtChatWidget } from '@beetween/design-system-ui';
import { useCurrentUser } from '#app/composables/useCurrentUser';

const currentUser = useCurrentUser();
const conversations = ref<BtChatWidgetConversationEntry[]>([
  { id: 1, title: 'Hiring process Q&A', date: new Date('2026-06-15') },
  { id: 2, title: 'Salary bands clarification', date: new Date('2026-06-10') },
]);

const handleSelectConversation = (entry: BtChatWidgetConversationEntry) => {
  // Load messages for conversation.id from API
  // Feed into message composable
};
</script>

<template>
  <BtChatWidget
    :current-user="currentUser"
    :prompt-suggestions="[
      'What is the hiring timeline for this role?',
      'How do I request time off?',
    ]"
    :conversation-history="conversations"
    @selectConversation="handleSelectConversation"
  />
</template>
```

## Notes & Constraints

- **No business logic:** Widget is UI + state management only. Agent orchestration lives in the consuming app.
- **Message streaming:** Widget accepts messages via internal composable API (not props). Consumer feeds agent stream chunks into `useChatMessages()`.
- **Avatar computation:** User initials are auto-computed from `currentUser.firstName` + `currentUser.lastName`.
- **Markdown support:** Message `content` supports inline `**bold**` and `` `code` `` markdown (no headings, no lists).
- **Resource links:** Optional `resourceLink` + `resourceLabel` on messages create embedded deeplinks (e.g., to a job posting).
- **i18n:** Text labels fall back to i18n keys when props are omitted. All text is MF2-formatted.
