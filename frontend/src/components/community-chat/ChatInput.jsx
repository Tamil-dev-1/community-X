import React from "react";
import {
  Paperclip,
  Smile,
  Send,
} from "lucide-react";

const ChatInput = ({
  inputText,
  setInputText,
  showEmojiPicker,
  setShowEmojiPicker,
  addEmoji,
  handleSendMessage,
  sending,
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

  return (
    <footer className="cxchat-chat-footer">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="cxchat-emoji-picker">
          {emojis.map((emoji) => (
            <button
              type="button"
              key={emoji}
              className="cxchat-emoji-button"
              onClick={() => addEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <form
        className="cxchat-chat-input-form"
        onSubmit={handleSendMessage}
      >
        {/* Attachment */}
        <button
          type="button"
          className="cxchat-input-icon-button"
          title="Attachment"
          onClick={() => {
            // Attachment functionality can be added later.
          }}
        >
          <Paperclip size={19} />
        </button>

        {/* Input */}
        <div className="cxchat-input-wrapper">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Write a message..."
            className="cxchat-message-input"
            disabled={sending}
          />

          {/* Emoji */}
          <button
            type="button"
            className="cxchat-input-emoji-button"
            onClick={() =>
              setShowEmojiPicker((prev) => !prev)
            }
            title="Emoji"
          >
            <Smile size={19} />
          </button>
        </div>

        {/* Send */}
        <button
          type="submit"
          className="cxchat-send-button"
          disabled={sending || !inputText.trim()}
          title="Send message"
        >
          {sending ? (
            <span className="cxchat-send-spinner" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>
    </footer>
  );
};

export default ChatInput;