# BtChatWidget

## Overview

Floating AI chat support widget. Renders as a FAB (floating action button) that opens an animated card panel teleported to `document.body`. Manages open/close state via the `useAiPanel` composable. Supports conversation history browsing, prepared question shortcuts, and slot-based customization of header, empty state, and composer area.

## TypeScript Interfaces

```typescript
// From bt-chat-widget.types.ts
export type AgentState = "idle" | "thinking" | "responding";
export type MessageType = "text" | "markdown";
export type ChatMessageSender = "user" | "agent";

export interface ChatMessage {
  id: string;
  sender: ChatMessageSender;
  content: string;
  type: MessageType;
  timestamp: Date;
}

export interface ConversationEntry {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  messages: ChatMessage[];
}

export interface PreparedQuestion {
  id: string;
  label: string;
  question: string;
}
```

## Props

| Prop                         | Type                  | Default     | Description                                             |
| ---------------------------- | --------------------- | ----------- | ------------------------------------------------------- |
| `currentUserName`            | `string`              | —           | Display name of the logged-in user shown in chat header |
| `promptSuggestions`          | `readonly string[]`   | `[]`        | Quick-prompt chips shown when conversation is empty     |
| `preparedQuestionsTitleText` | `string`              | `undefined` | Section heading above the prepared questions list       |
| `conversationHistory`        | `ConversationEntry[]` | `[]`        | Previous conversations shown in the history panel       |

## Emits

| Event                | Payload                    | Description                                      |
| -------------------- | -------------------------- | ------------------------------------------------ |
| `selectConversation` | `entry: ConversationEntry` | Fires when user clicks a past conversation entry |

## Slots

| Slot               | Scoped Props | Description                                            |
| ------------------ | ------------ | ------------------------------------------------------ |
| `header`           | —            | Custom content above the chat messages area            |
| `empty-state`      | —            | Replaces default empty state when no messages exist    |
| `composer-actions` | —            | Extra actions appended to the right of the send button |

## Exposed

| Name               | Type                                 | Description                                        |
| ------------------ | ------------------------------------ | -------------------------------------------------- |
| `loadConversation` | `(entry: ConversationEntry) => void` | Programmatically load a conversation into the chat |

## Usage Example

```vue
<script setup lang="ts">
import { BtChatWidget } from "@beetween/design-system-ui";
import type { ConversationEntry } from "@beetween/design-system-ui";

const history = ref<ConversationEntry[]>([
  /* ... */
]);

const chatRef = ref();

function onSelect(entry: ConversationEntry) {
  chatRef.value?.loadConversation(entry);
}
</script>

<template>
  <BtChatWidget
    ref="chatRef"
    current-user-name="Alice"
    :prompt-suggestions="['Summarize this week', 'What are my tasks?']"
    :conversation-history="history"
    @select-conversation="onSelect"
  >
    <template #header>
      <span class="font-semibold">Beetween AI</span>
    </template>
  </BtChatWidget>
</template>
```

## Notes & Constraints

- Widget teleports to `document.body` — z-index isolation is automatic; no wrapper positioning needed.
- Open/close state is **global** via `useAiPanel` composable. Only one instance per app.
- Escape key closes the panel.
- On mobile the panel fills the viewport; on desktop it renders as a fixed-width card (360px).
- Do not manage visibility externally with `v-if` — use `useAiPanel().open()` / `.close()`.
