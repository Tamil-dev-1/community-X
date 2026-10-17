
import React from "react";

import { useCommunityChat } from "../../context/CommunityChatContext";

import ChatMessages from "../../components/community-chat/ChatMessages";
import ChatInput from "../../components/community-chat/ChatInput";

const PrivateChat = () => {
  const {
    privateMessages,
    privateLoading,
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
        messages={privateMessages}
        loading={privateLoading}
        activeTab="admin"
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

export default PrivateChat;
