import React from "react";

import { useCommunityChat } from "../../context/CommunityChatContext";

import ChatMessages from "../../components/community-chat/ChatMessages";
import ChatInput from "../../components/community-chat/ChatInput";

// Premium color theme (colors only) - must be imported AFTER the components
import "../../pages/community/GroupChatPage.css";

const GroupChat = () => {
  const {
    groupMessages,
    groupLoading,
    currentUser,

    inputText,
    setInputText,

    showEmojiPicker,
    setShowEmojiPicker,

    sending,
    editingMessageId,
    deletingMessageId,

    messagesEndRef,

    handleSendMessage,
    handleStartEdit,
    handleCancelEdit,
    handleDeleteMessage,
    addEmoji,
  } = useCommunityChat();

  return (
    <>
      <ChatMessages
        messages={groupMessages}
        loading={groupLoading}
        activeTab="group"
        currentUser={currentUser}
        editingMessageId={editingMessageId}
        handleStartEdit={handleStartEdit}
        handleCancelEdit={handleCancelEdit}
        handleDeleteMessage={handleDeleteMessage}
        deletingMessageId={deletingMessageId}
        messagesEndRef={messagesEndRef}
      />

      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        addEmoji={addEmoji}
        handleSendMessage={handleSendMessage}
        sending={sending}
        editingMessageId={editingMessageId}
        onCancelEdit={handleCancelEdit}
      />
    </>
  );
};

export default GroupChat;
