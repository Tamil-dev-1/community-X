import React from "react";
import {
  Crown,
  CheckCheck,
  Pencil,
  Trash2,
  Check,
  XCircle,
} from "lucide-react";

const ChatMessages = ({
  messages,
  loading,
  activeTab,
  currentUser,

  editingMessageId,
  editingText,
  setEditingText,

  handleStartEdit,
  handleCancelEdit,
  handleUpdateMessage,

  updatingMessage,

  handleDeleteMessage,
  deletingMessageId,

  messagesEndRef,
}) => {
  if (loading) {
    return (
      <div className="cxchat-messages-container">
        <div className="cxchat-loading-state">
          <div className="cxchat-loading-spinner" />
          <span>Loading messages...</span>
        </div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="cxchat-messages-container">
        <div className="cxchat-empty-state">
          <div className="cxchat-empty-icon">
            <Crown size={26} />
          </div>

          <h3>
            {activeTab === "group"
              ? "No messages yet"
              : "No admin messages yet"}
          </h3>

          <p>
            {activeTab === "group"
              ? "Be the first person to start the conversation."
              : "Admin announcements will appear here."}
          </p>
        </div>

        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div className="cxchat-messages-container">
      <div className="cxchat-messages-list">
        {messages.map((message) => {
          const isSelf =
            message.senderWallet &&
            currentUser.walletAddress &&
            message.senderWallet.toLowerCase() ===
              currentUser.walletAddress.toLowerCase();

          const isEditing =
            editingMessageId === message.id;

          return (
            <div
              key={message.id}
              className={`cxchat-message-row ${
                isSelf
                  ? "cxchat-message-row-self"
                  : "cxchat-message-row-other"
              }`}
            >
              {/* Avatar */}
              <div className="cxchat-message-avatar-wrapper">
                <img
                  src={
                    message.avatar ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"
                  }
                  alt={message.senderName}
                  className="cxchat-message-avatar"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";
                  }}
                />

                {message.isAdmin && (
                  <span className="cxchat-message-admin-crown">
                    <Crown size={9} />
                  </span>
                )}
              </div>

              {/* Message Wrapper */}
              <div
                className={`cxchat-msg-wrapper ${
                  isSelf
                    ? "cxchat-msg-wrapper-self"
                    : "cxchat-msg-wrapper-other"
                }`}
              >
                {/* Sender Name */}
                <div
                  className={`cxchat-sender-name ${
                    isSelf
                      ? "cxchat-sender-name-self"
                      : "cxchat-sender-name-other"
                  }`}
                >
                  <span>{message.senderName}</span>

                  {message.isAdmin && (
                    <span className="cxchat-admin-label">
                      ADMIN
                    </span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`cxchat-message-bubble ${
                    isSelf
                      ? "cxchat-message-bubble-self"
                      : "cxchat-message-bubble-other"
                  }`}
                >
                  {isEditing ? (
                    <div className="cxchat-edit-form">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) =>
                          setEditingText(e.target.value)
                        }
                        className="cxchat-edit-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateMessage(message.id);
                          }

                          if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                      />

                      <div className="cxchat-edit-actions">
                        <button
                          type="button"
                          className="cxchat-edit-action cxchat-edit-cancel"
                          onClick={handleCancelEdit}
                          disabled={updatingMessage}
                        >
                          <XCircle size={14} />
                          Cancel
                        </button>

                        <button
                          type="button"
                          className="cxchat-edit-action cxchat-edit-save"
                          onClick={() =>
                            handleUpdateMessage(message.id)
                          }
                          disabled={updatingMessage}
                        >
                          <Check size={14} />
                          {updatingMessage
                            ? "Saving..."
                            : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="cxchat-message-text">
                        {message.text}
                      </div>

                      <div className="cxchat-message-meta">
                        <span className="cxchat-message-time">
                          {message.time}
                        </span>

                        {isSelf && (
                          <CheckCheck
                            size={15}
                            className="cxchat-message-check"
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Message Actions */}
                {isSelf &&
                  activeTab === "group" &&
                  !isEditing && (
                    <div className="cxchat-message-actions">
                      <button
                        type="button"
                        className="cxchat-message-action-btn cxchat-message-action-edit"
                        onClick={() =>
                          handleStartEdit(message)
                        }
                        disabled={
                          deletingMessageId === message.id
                        }
                        title="Edit message"
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        type="button"
                        className="cxchat-message-action-btn cxchat-message-action-delete"
                        onClick={() =>
                          handleDeleteMessage(message.id)
                        }
                        disabled={
                          deletingMessageId === message.id
                        }
                        title="Delete message"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;