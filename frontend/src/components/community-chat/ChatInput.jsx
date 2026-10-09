
import React, { useRef, useState } from "react";
import "./ChatInput.css";

import {
  Paperclip,
  Smile,
  Send,
  Pencil,
  X,
  Check,
  FileText,
} from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "rtf",
  "odt",
  "ods",
];

const ChatInput = ({
  inputText,
  setInputText,
  showEmojiPicker,
  setShowEmojiPicker,
  addEmoji,
  handleSendMessage,
  sending,
  editingMessageId,
  onCancelEdit,
}) => {
  const emojis = [
    "👍",
    "🎉",
    "👏",
    "❤️",
    "🔥",
    "🚀",
    "😊",
    "🙌",
  ];

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const isEditing = Boolean(editingMessageId);

  // Open file picker
  const handleAttachmentClick = () => {
    if (!sending && !isEditing) {
      fileInputRef.current?.click();
    }
  };

  // Select and validate document
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    // Reset input so the same file can be selected again
    event.target.value = "";

    if (!file) return;

    setFileError("");

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      setFileError(
        "Unsupported file type. Please select a supported document."
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File size must not exceed 10 MB.");
      return;
    }

    setSelectedFile(file);
    setShowEmojiPicker(false);
  };

  // Remove selected document
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Format file size
  const formatFileSize = (size) => {
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Submit text or attachment
  const handleFormSubmit = async (event) => {
    event.preventDefault();

    if (sending) return;

    if (isEditing) {
      if (!inputText.trim()) return;

      await handleSendMessage(event);
      return;
    }

    if (!inputText.trim() && !selectedFile) return;

    try {
      // CommunityChat must return true when sending succeeds.
      const success = await handleSendMessage(
        event,
        selectedFile
      );

      if (success === true && selectedFile) {
        setSelectedFile(null);
        setFileError("");

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      console.error("Unable to send message or attachment:", error);
    }
  };

  return (
    <footer className="cxchat-chat-footer">
      {/* Edit mode bar */}
      {isEditing && (
        <div className="cxchat-editing-bar">
          <div className="cxchat-editing-info">
            <div className="cxchat-editing-icon">
              <Pencil size={15} />
            </div>

            <div className="cxchat-editing-text">
              <span className="cxchat-editing-label">
                Editing message
              </span>

              <span className="cxchat-editing-preview">
                Make your changes and update
              </span>
            </div>
          </div>

          <button
            type="button"
            className="cxchat-edit-cancel-button"
            onClick={onCancelEdit}
            title="Cancel editing"
            disabled={sending}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="cxchat-emoji-picker">
          {emojis.map((emoji) => (
            <button
              type="button"
              key={emoji}
              className="cxchat-emoji-button"
              onClick={() => addEmoji(emoji)}
              disabled={sending}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Hidden document input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods"
        style={{ display: "none" }}
        onChange={handleFileChange}
        disabled={sending || isEditing}
      />

      {/* Selected document preview */}
      {selectedFile && !isEditing && (
        <div className="cxchat-attachment-preview">
          <div className="cxchat-attachment-file-icon">
            <FileText size={20} />
          </div>

          <div className="cxchat-attachment-file-info">
            <span
              className="cxchat-attachment-file-name"
              title={selectedFile.name}
            >
              {selectedFile.name}
            </span>

            <span className="cxchat-attachment-file-size">
              {formatFileSize(selectedFile.size)}
            </span>
          </div>

          <button
            type="button"
            className="cxchat-attachment-remove"
            onClick={handleRemoveFile}
            title="Remove attachment"
            aria-label="Remove attachment"
            disabled={sending}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* File validation error */}
      {fileError && (
        <div className="cxchat-attachment-error" role="alert">
          {fileError}
        </div>
      )}

      {/* Message form */}
      <form
        className="cxchat-chat-input-form"
        onSubmit={handleFormSubmit}
      >
        {/* Attach document */}
        <button
          type="button"
          className="cxchat-input-icon-button"
          title="Attach document"
          aria-label="Attach document"
          onClick={handleAttachmentClick}
          disabled={sending || isEditing}
        >
          <Paperclip size={19} />
        </button>

        {/* Text input */}
        <div className="cxchat-input-wrapper">
          <input
            type="text"
            value={inputText}
            onChange={(event) =>
              setInputText(event.target.value)
            }
            placeholder={
              isEditing
                ? "Edit message..."
                : selectedFile
                ? "Add a message (optional)..."
                : "Write a message..."
            }
            className="cxchat-message-input"
            disabled={sending}
            autoFocus={isEditing}
          />

          {/* Emoji button */}
          <button
            type="button"
            className="cxchat-input-emoji-button"
            onClick={() =>
              setShowEmojiPicker((previous) => !previous)
            }
            title="Emoji"
            aria-label="Open emoji picker"
            disabled={sending}
          >
            <Smile size={19} />
          </button>
        </div>

        {/* Send / update button */}
        <button
          type="submit"
          className={`cxchat-send-button ${
            isEditing ? "cxchat-update-button" : ""
          }`}
          disabled={
            sending ||
            (isEditing
              ? !inputText.trim()
              : !inputText.trim() && !selectedFile)
          }
          title={
            isEditing
              ? "Update message"
              : selectedFile
              ? "Send document"
              : "Send message"
          }
        >
          {sending ? (
            <span className="cxchat-send-spinner" />
          ) : isEditing ? (
            <Check size={19} />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>
    </footer>
  );
};

export default ChatInput;