import React, { useEffect, useRef, useState } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import "./MemberPrivateChat.css";


// ============================================================
// MOCK ADMIN
// ============================================================

const ADMIN_USER = {
  id: "u_admin",
  name: "Admin",
  status: "online",
  avatar:
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&auto=format&fit=crop&q=80",
};


// ============================================================
// MOCK MEMBER
// ============================================================

const CURRENT_MEMBER = {
  id: "u_tamil",
  name: "Tamil",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
};


// ============================================================
// MOCK MESSAGES
// ============================================================

const initialMessages = [
  {
    id: "msg_1",
    senderId: "u_admin",
    senderName: "Admin",
    text: "Hi Tamil 👋",
    time: "10:15 AM",
  },

  {
    id: "msg_2",
    senderId: "u_admin",
    senderName: "Admin",
    text: "I wanted to discuss something with you.",
    time: "10:16 AM",
  },

  {
    id: "msg_3",
    senderId: "u_tamil",
    senderName: "Tamil",
    text: "Sure Admin, please tell me.",
    time: "10:18 AM",
  },

  {
    id: "msg_4",
    senderId: "u_admin",
    senderName: "Admin",
    text: "Please check your email regarding the latest update.",
    time: "10:20 AM",
  },
];


export default function MemberPrivateChat() {
  const [messages, setMessages] = useState(initialMessages);

  const [draft, setDraft] = useState("");

  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);

  const bottomRef = useRef(null);


  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);


  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const handleSendMessage = (e) => {
    e.preventDefault();

    const text = draft.trim();

    if (!text) {
      return;
    }

    const newMessage = {
      id: `local_${Date.now()}`,
      senderId: CURRENT_MEMBER.id,
      senderName: CURRENT_MEMBER.name,
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((previousMessages) => [
      ...previousMessages,
      newMessage,
    ]);

    setDraft("");

    setShowEmojiPicker(false);
  };


  // ==========================================================
  // EMOJI
  // ==========================================================

  const addEmoji = (emoji) => {
    setDraft((previous) => `${previous}${emoji}`);

    setShowEmojiPicker(false);
  };


  return (
    <div className="member-private-page">


      {/* =====================================================
          CHAT BACKGROUND EFFECTS
      ===================================================== */}

      <div className="member-private-orb member-private-orb-one"></div>

      <div className="member-private-orb member-private-orb-two"></div>

      <div className="member-private-grid"></div>


      {/* =====================================================
          CHAT CONTAINER
      ===================================================== */}

      <main className="member-private-container">


        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="member-private-header">


          {/* Back button */}

          <button
            type="button"
            className="member-private-back-button"
            onClick={() => window.history.back()}
          >
            <i className="bi bi-arrow-left"></i>
          </button>


          {/* Admin avatar */}

          <div className="member-private-admin-avatar-wrapper">

            <img
              src={ADMIN_USER.avatar}
              alt="Admin"
              className="member-private-admin-avatar"
            />

            <span className="member-private-online-dot"></span>

          </div>


          {/* Admin information */}

          <div className="member-private-header-info">

            <h1 className="member-private-admin-name">
              {ADMIN_USER.name}
            </h1>

            <div className="member-private-admin-status">

              <span className="member-private-status-dot"></span>

              <span>
                {ADMIN_USER.status === "online"
                  ? "Online"
                  : "Offline"}
              </span>

            </div>

          </div>


          {/* Header actions */}

          <div className="member-private-header-actions">

            <button
              type="button"
              className="member-private-header-icon"
              title="More"
            >
              <i className="bi bi-three-dots-vertical"></i>
            </button>

          </div>

        </header>


        {/* ===================================================
            CHAT BODY
        =================================================== */}

        <section className="member-private-chat-body">


          {/* Date separator */}

          <div className="member-private-date-divider">

            <span>Today</span>

          </div>


          {/* Messages */}

          <div className="member-private-message-list">

            {messages.map((message) => {

              const isMine =
                message.senderId === CURRENT_MEMBER.id;


              return (
                <div
                  key={message.id}
                  className={
                    isMine
                      ? "member-private-message-row member-private-message-row-own"
                      : "member-private-message-row member-private-message-row-admin"
                  }
                >


                  {/* Admin avatar */}

                  {!isMine && (
                    <img
                      src={ADMIN_USER.avatar}
                      alt="Admin"
                      className="member-private-message-avatar"
                    />
                  )}


                  <div
                    className={
                      isMine
                        ? "member-private-message-bubble member-private-message-bubble-own"
                        : "member-private-message-bubble member-private-message-bubble-admin"
                    }
                  >

                    {!isMine && (
                      <div className="member-private-message-sender">
                        {message.senderName}
                      </div>
                    )}


                    <div className="member-private-message-text">
                      {message.text}
                    </div>


                    <div className="member-private-message-meta">

                      <span>
                        {message.time}
                      </span>

                      {isMine && (
                        <i className="bi bi-check2-all member-private-message-check"></i>
                      )}

                    </div>

                  </div>

                </div>
              );

            })}


            {/* Scroll target */}

            <div ref={bottomRef}></div>

          </div>

        </section>


        {/* ===================================================
            EMOJI PICKER
        =================================================== */}

        {showEmojiPicker && (
          <div className="member-private-emoji-picker">

            <button
              type="button"
              onClick={() => addEmoji("😀")}
            >
              😀
            </button>

            <button
              type="button"
              onClick={() => addEmoji("😂")}
            >
              😂
            </button>

            <button
              type="button"
              onClick={() => addEmoji("😍")}
            >
              😍
            </button>

            <button
              type="button"
              onClick={() => addEmoji("👍")}
            >
              👍
            </button>

            <button
              type="button"
              onClick={() => addEmoji("❤️")}
            >
              ❤️
            </button>

            <button
              type="button"
              onClick={() => addEmoji("🔥")}
            >
              🔥
            </button>

            <button
              type="button"
              onClick={() => addEmoji("🙏")}
            >
              🙏
            </button>

            <button
              type="button"
              onClick={() => addEmoji("🎉")}
            >
              🎉
            </button>

          </div>
        )}


        {/* ===================================================
            MESSAGE INPUT
        =================================================== */}

        <form
          className="member-private-message-form"
          onSubmit={handleSendMessage}
        >


          {/* Emoji */}

          <button
            type="button"
            className="member-private-input-icon"
            onClick={() =>
              setShowEmojiPicker((previous) => !previous)
            }
            title="Emoji"
          >
            <i className="bi bi-emoji-smile"></i>
          </button>


          {/* Input */}

          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a private message..."
            className="member-private-message-input"
          />


          {/* Send */}

          <button
            type="submit"
            className="member-private-send-button"
            disabled={!draft.trim()}
            title="Send message"
          >
            <i className="bi bi-send-fill"></i>
          </button>

        </form>


      </main>

    </div>
  );
}