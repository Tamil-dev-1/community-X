

import React, {

  useEffect,

  useRef,

  useState,

} from "react";



import { useLocation } from "react-router-dom";

import { io } from "socket.io-client";



import ChatSidebar from "../../components/community-chat/ChatSidebar";

import ChatHeader from "../../components/community-chat/ChatHeader";

import ChatMessages from "../../components/community-chat/ChatMessages";

import ChatInput from "../../components/community-chat/ChatInput";



import "./CommunityChat.css";



// ============================================================

// API CONFIG

// ============================================================



const API_URL = "http://localhost:5000/api/messages";

const SOCKET_URL = "http://localhost:5000";



const ADMIN_IDENTIFIER = "admin:adm-001";



const DEFAULT_AVATAR =

  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";



// ============================================================

// COMPONENT

// ============================================================





const ANNOUNCEMENTS_URL = "http://localhost:5000/api/announcements";



const getAnnouncementCategory = (priority) => {

  switch (String(priority || "").toUpperCase()) {

    case "URGENT":

      return {

        label: "CRITICAL UPDATE",

        icon: "🚨",

      };



    case "IMPORTANT":

      return {

        label: "PRODUCT FEATURE",

        icon: "✨",

      };



    default:

      return {

        label: "OFFICIAL UPDATE",

        icon: "📢",

      };

  }

};



const formatAnnouncementDate = (value) => {

  if (!value) return "";



  const date = new Date(value);



  if (Number.isNaN(date.getTime())) return "";



  return date.toLocaleDateString("en-US", {

    month: "short",

    day: "numeric",

    year: "numeric",

  });

};



const AnnouncementPanel = ({

  announcements,

  loading,

  error,

  onRetry,

}) => {

  return (

    <section className="cxchat-announcements">

      <div className="cxchat-announcements-banner">

        <div className="cxchat-announcements-banner-icon">

          <span role="img" aria-label="Announcement">

            📣

          </span>

        </div>



        <div>

          <div className="cxchat-announcements-eyebrow">

            COMMUNITY X · OFFICIAL

          </div>



          <h2>Announcements</h2>



          <p>

            Important updates and news from your community admin.

          </p>

        </div>

      </div>



      <div className="cxchat-announcements-section-heading">

        <div>

          <h3>Community Updates</h3>

          <p>Stay informed about what's happening.</p>

        </div>

      </div>



      <div className="cxchat-announcements-list">

        {loading ? (

          <div className="cxchat-announcements-state">

            <p>Loading community announcements...</p>

          </div>

        ) : error ? (

          <div className="cxchat-announcements-state">

            <p>{error}</p>



            <button

              type="button"

              onClick={onRetry}

            >

              Try again

            </button>

          </div>

        ) : announcements.length === 0 ? (

          <div className="cxchat-announcements-state">

            <p>No published announcements yet.</p>

          </div>

        ) : (

          announcements.map((announcement) => {

            const category = getAnnouncementCategory(

              announcement.priority

            );



            return (

              <article

                className="cxchat-announcement-card"

                key={announcement._id || announcement.id}

              >

                <div className="cxchat-announcement-card-icon">

                  <span

                    role="img"

                    aria-label={category.label}

                  >

                    {category.icon}

                  </span>

                </div>



                <div className="cxchat-announcement-card-content">

                  <span className="cxchat-announcement-category">

                    {category.label}

                  </span>



                  <h4>{announcement.title}</h4>



                  <p>{announcement.content}</p>



                  {announcement.info && (

                    <p className="cxchat-announcement-info">

                      {announcement.info}

                    </p>

                  )}



                  <span className="cxchat-announcement-date">

                    {formatAnnouncementDate(

                      announcement.createdAt

                    )}

                  </span>

                </div>

              </article>

            );

          })

        )}

      </div>



      {!loading && !error && announcements.length > 0 && (

        <div className="cxchat-announcements-footer">

          <span>✦</span>

          You're all caught up on these updates.

        </div>

      )}

    </section>

  );

};













const CommunityChat = () => {

  const location = useLocation();





  //Announcement states



  const [announcements, setAnnouncements] = useState([]);

  const [announcementsLoading, setAnnouncementsLoading] =

    useState(true);

  const [announcementsError, setAnnouncementsError] =

    useState("");

  const [announcementRetry, setAnnouncementRetry] = useState(0);



  // ----------------------------------------------------------

  // AUTHENTICATION AND USER

  // ----------------------------------------------------------



  const communityUser = location.state?.communityUser;

  const walletAddressFromState = location.state?.walletAddress;



  const storedWallet = localStorage.getItem("communityXWallet");

  const token = localStorage.getItem("communityXToken");



  const currentUser = {

    walletAddress:

      communityUser?.walletAddress ||

      walletAddressFromState ||

      storedWallet ||

      "",



    name:

      communityUser?.fullName ||

      communityUser?.username ||

      "Community Member",



    username: communityUser?.username || "",



    avatar:

      communityUser?.profileImage ||

      DEFAULT_AVATAR,



    isAdmin: false,

  };



  // ----------------------------------------------------------

  // STATE

  // ----------------------------------------------------------



  const [activeTab, setActiveTab] = useState("group");



  const [messages, setMessages] = useState([]);

  const [adminMessages, setAdminMessages] = useState([]);



  const [inputText, setInputText] = useState("");



  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);



  const [loading, setLoading] = useState(true);

  const [adminLoading, setAdminLoading] = useState(false);

  const [sending, setSending] = useState(false);



  const [editingMessageId, setEditingMessageId] = useState(null);

  const [deletingMessageId, setDeletingMessageId] = useState(null);



  // ----------------------------------------------------------

  // REFS

  // ----------------------------------------------------------



  const socketRef = useRef(null);

  const messagesEndRef = useRef(null);



  // ----------------------------------------------------------

  // FORMAT MESSAGE

  // ----------------------------------------------------------



  const formatMessage = (message) => {

    const createdAt = message?.createdAt || null;



    return {

      id: message?._id || message?.id,



      senderId: message?.senderWallet || "",

      senderWallet: message?.senderWallet || "",



      receiverWallet: message?.receiverWallet || null,



      senderName:

        message?.senderName || "Community Member",



      avatar:

        message?.senderAvatar || DEFAULT_AVATAR,



      isAdmin:

        message?.senderWallet?.toLowerCase() ===

        ADMIN_IDENTIFIER.toLowerCase(),



      text: message?.message || "",



      isEdited: message?.isEdited === true,



      // Attachment returned by the backend

      attachment: message?.attachment || null,



      createdAt,



      time: new Date(

        createdAt || Date.now()

      ).toLocaleTimeString([], {

        hour: "2-digit",

        minute: "2-digit",

      }),

    };

  };



  // ----------------------------------------------------------

  // GET MESSAGE ID FROM DIFFERENT RESPONSE SHAPES

  // ----------------------------------------------------------



  const getMessageId = (message) =>

    message?._id ||

    message?.id ||

    message?.messageId ||

    null;



  // ----------------------------------------------------------

  // SOCKET.IO

  // ----------------------------------------------------------



  useEffect(() => {

    if (!token) {

      console.warn("Community X token not found.");

      setLoading(false);

      setAdminLoading(false);

      return;

    }



    const socket = io(SOCKET_URL, {

      transports: ["websocket"],

    });



    socketRef.current = socket;



    // Authenticate socket

    socket.on("connect", () => {

      console.log("Community X socket connected:", socket.id);



      socket.emit("authenticate-socket", { token });

    });



    socket.on("socket-authenticated", (data) => {

      console.log("Member socket authenticated:", data);

    });

    // --------------------------------------------------------
    // REAL-TIME ANNOUNCEMENTS
    // The backend emits this event after saving a published announcement.
    // --------------------------------------------------------
    socket.on("announcement:new", (incomingAnnouncement) => {
      if (!incomingAnnouncement || incomingAnnouncement.isPublished !== true) {
        return;
      }

      const incomingId =
        incomingAnnouncement._id || incomingAnnouncement.id;

      setAnnouncements((previous) => {
        const alreadyExists = previous.some((item) => {
          const existingId = item._id || item.id;
          return (
            incomingId &&
            existingId &&
            String(existingId) === String(incomingId)
          );
        });

        if (alreadyExists) {
          return previous;
        }

        return [incomingAnnouncement, ...previous].sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
      });

      setAnnouncementsError("");
    });




    socket.on("socket-auth-error", (error) => {

      console.error("Member socket authentication error:", error);

    });



    // --------------------------------------------------------

    // GROUP: NEW MESSAGE

    // --------------------------------------------------------



    socket.on("new-group-message", (newMessage) => {

      const formattedMessage = formatMessage(newMessage);



      if (!formattedMessage.id) return;



      setMessages((previous) => {

        const exists = previous.some(

          (message) =>

            String(message.id) === String(formattedMessage.id)

        );



        if (exists) return previous;



        return [...previous, formattedMessage];

      });

    });



    // --------------------------------------------------------

    // GROUP: MESSAGE UPDATED

    // --------------------------------------------------------



    socket.on("message-updated", (updatedMessage) => {

      const updatedId = getMessageId(updatedMessage);



      if (!updatedId) return;



      setMessages((previous) =>

        previous.map((message) => {

          if (String(message.id) !== String(updatedId)) {

            return message;

          }



          const updatedCreatedAt =

            updatedMessage.createdAt ||

            message.createdAt ||

            new Date().toISOString();



          return {

            ...message,

            text:

              updatedMessage.message ?? message.text,

            isEdited: updatedMessage.isEdited === true,

            attachment:

              updatedMessage.attachment ?? message.attachment,

            createdAt: updatedCreatedAt,

            time: new Date(updatedCreatedAt).toLocaleTimeString(

              [],

              {

                hour: "2-digit",

                minute: "2-digit",

              }

            ),

          };

        })

      );

    });



    // --------------------------------------------------------

    // GROUP: MESSAGE DELETED

    // --------------------------------------------------------



    socket.on("message-deleted", (deletedMessage) => {

      const deletedId = getMessageId(deletedMessage);



      if (!deletedId) return;



      setMessages((previous) =>

        previous.filter(

          (message) => String(message.id) !== String(deletedId)

        )

      );

    });



    // --------------------------------------------------------

    // PRIVATE: NEW MESSAGE

    // --------------------------------------------------------



    socket.on("new-private-message", (newMessage) => {

      const senderWallet = newMessage?.senderWallet

        ?.toLowerCase()

        .trim();



      const receiverWallet = newMessage?.receiverWallet

        ?.toLowerCase()

        .trim();



      const currentWallet = currentUser.walletAddress

        ?.toLowerCase()

        .trim();



      const adminIdentifier = ADMIN_IDENTIFIER.toLowerCase();



      const belongsToAdminChat =

        (senderWallet === currentWallet &&

          receiverWallet === adminIdentifier) ||

        (senderWallet === adminIdentifier &&

          receiverWallet === currentWallet);



      if (!belongsToAdminChat) return;



      const formattedMessage = formatMessage(newMessage);



      if (!formattedMessage.id) return;



      setAdminMessages((previous) => {

        const exists = previous.some(

          (message) =>

            String(message.id) === String(formattedMessage.id)

        );



        if (exists) return previous;



        return [...previous, formattedMessage];

      });

    });



    // --------------------------------------------------------

    // PRIVATE: MESSAGE UPDATED

    // --------------------------------------------------------



    socket.on("private-message-updated", (updatedMessage) => {

      const updatedId = getMessageId(updatedMessage);



      if (!updatedId) return;



      const senderWallet = updatedMessage?.senderWallet

        ?.toLowerCase()

        .trim();



      const receiverWallet = updatedMessage?.receiverWallet

        ?.toLowerCase()

        .trim();



      const currentWallet = currentUser.walletAddress

        ?.toLowerCase()

        .trim();



      const adminIdentifier = ADMIN_IDENTIFIER.toLowerCase();



      const belongsToAdminChat =

        (senderWallet === currentWallet &&

          receiverWallet === adminIdentifier) ||

        (senderWallet === adminIdentifier &&

          receiverWallet === currentWallet);



      if (!belongsToAdminChat) return;



      setAdminMessages((previous) => {

        const exists = previous.some(

          (message) =>

            String(message.id) === String(updatedId)

        );



        if (!exists) {

          return [

            ...previous,

            formatMessage({

              ...updatedMessage,

              isEdited: true,

            }),

          ];

        }



        return previous.map((message) => {

          if (String(message.id) !== String(updatedId)) {

            return message;

          }



          const updatedCreatedAt =

            updatedMessage.createdAt ||

            message.createdAt ||

            new Date().toISOString();



          return {

            ...message,

            text:

              updatedMessage.message ?? message.text,

            isEdited: true,

            attachment:

              updatedMessage.attachment ?? message.attachment,

            createdAt: updatedCreatedAt,

            time: new Date(updatedCreatedAt).toLocaleTimeString(

              [],

              {

                hour: "2-digit",

                minute: "2-digit",

              }

            ),

          };

        });

      });

    });



    // --------------------------------------------------------

    // PRIVATE: MESSAGE DELETED

    // --------------------------------------------------------



    socket.on("private-message-deleted", (deletedMessage) => {

      const deletedId = getMessageId(deletedMessage);



      if (!deletedId) return;



      setAdminMessages((previous) =>

        previous.filter(

          (message) => String(message.id) !== String(deletedId)

        )

      );

    });



    socket.on("disconnect", () => {

      console.log("Community X socket disconnected");

    });



    // --------------------------------------------------------

    // CLEANUP

    // --------------------------------------------------------



    return () => {

      socket.removeAllListeners();

      socket.disconnect();



      if (socketRef.current === socket) {

        socketRef.current = null;

      }

    };

  }, [token, currentUser.walletAddress]);



  // ----------------------------------------------------------

  // AUTO SCROLL

  // ----------------------------------------------------------



  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({

      behavior: "smooth",

    });

  }, [messages, adminMessages, activeTab]);



  // ----------------------------------------------------------

  // FETCH GROUP MESSAGES

  // ----------------------------------------------------------



  useEffect(() => {

    let cancelled = false;



    const fetchGroupMessages = async () => {

      setLoading(true);



      if (!token) {

        setMessages([]);

        setLoading(false);

        return;

      }



      try {

        const response = await fetch(`${API_URL}/group`, {

          method: "GET",

          headers: {

            Authorization: `Bearer ${token}`,

          },

        });



        const data = await response.json();



        if (!response.ok) {

          throw new Error(

            data.message || "Failed to fetch group messages"

          );

        }



        const serverMessages = Array.isArray(data)

          ? data

          : Array.isArray(data.messages)

            ? data.messages

            : Array.isArray(data.data)

              ? data.data

              : [];



        if (!cancelled) {

          setMessages(serverMessages.map(formatMessage));

        }

      } catch (error) {

        console.error("Fetch group messages error:", error);



        if (!cancelled) {

          setMessages([]);

        }

      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    };



    fetchGroupMessages();



    return () => {

      cancelled = true;

    };

  }, [token]);









  // ----------------------------------------------------------

  // FETCH PUBLISHED ANNOUNCEMENTS FOR COMMUNITY MEMBERS

  // ----------------------------------------------------------



  useEffect(() => {

    let cancelled = false;



    const fetchAnnouncements = async () => {

      setAnnouncementsLoading(true);

      setAnnouncementsError("");



      try {

        const response = await fetch(ANNOUNCEMENTS_URL, {

          method: "GET",

        });



        const data = await response.json();



        if (!response.ok) {

          throw new Error(

            data?.message || "Failed to load announcements."

          );

        }



        const items = Array.isArray(data)

          ? data

          : Array.isArray(data?.announcements)

            ? data.announcements

            : Array.isArray(data?.data)

              ? data.data

              : [];



        // The backend already filters isPublished: true.

        // This additional check prevents drafts from appearing.

        const publishedItems = items.filter(

          (item) => item.isPublished === true

        );



        if (!cancelled) {

          setAnnouncements(publishedItems);

        }

      } catch (error) {

        console.error(

          "Fetch community announcements error:",

          error

        );



        if (!cancelled) {

          setAnnouncements([]);

          setAnnouncementsError(

            error.message ||

            "Unable to load announcements. Please try again."

          );

        }

      } finally {

        if (!cancelled) {

          setAnnouncementsLoading(false);

        }

      }

    };



    fetchAnnouncements();



    return () => {

      cancelled = true;

    };

  }, [announcementRetry]);



  // ----------------------------------------------------------

  // FETCH PRIVATE ADMIN MESSAGES

  // ----------------------------------------------------------



  useEffect(() => {

    let cancelled = false;



    const fetchAdminMessages = async () => {

      if (!token || !currentUser.walletAddress) {

        setAdminMessages([]);

        setAdminLoading(false);

        return;

      }



      setAdminLoading(true);



      try {

        const response = await fetch(

          `${API_URL}/private/${ADMIN_IDENTIFIER}`,

          {

            method: "GET",

            headers: {

              Authorization: `Bearer ${token}`,

            },

          }

        );



        const data = await response.json();



        if (!response.ok) {

          throw new Error(

            data.message || "Failed to fetch private messages"

          );

        }



        const serverMessages = Array.isArray(data)

          ? data

          : Array.isArray(data.messages)

            ? data.messages

            : Array.isArray(data.data)

              ? data.data

              : [];



        const memberWallet = currentUser.walletAddress

          .toLowerCase()

          .trim();



        const adminIdentifier = ADMIN_IDENTIFIER.toLowerCase();



        const formattedMessages = serverMessages

          .filter((message) => {

            const sender = message?.senderWallet

              ?.toLowerCase()

              .trim();



            const receiver = message?.receiverWallet

              ?.toLowerCase()

              .trim();



            return (

              (sender === memberWallet &&

                receiver === adminIdentifier) ||

              (sender === adminIdentifier &&

                receiver === memberWallet)

            );

          })

          .map(formatMessage);



        if (!cancelled) {

          setAdminMessages(formattedMessages);

        }

      } catch (error) {

        console.error("Fetch private messages error:", error);



        if (!cancelled) {

          setAdminMessages([]);

        }

      } finally {

        if (!cancelled) {

          setAdminLoading(false);

        }

      }

    };



    fetchAdminMessages();



    return () => {

      cancelled = true;

    };

  }, [token, currentUser.walletAddress]);



  // ----------------------------------------------------------

  // SEND / EDIT MESSAGE

  // ----------------------------------------------------------



  const handleSendMessage = async (

    event,

    selectedFile = null

  ) => {

    event?.preventDefault();



    const trimmedText = inputText.trim();



    if (sending) return false;



    // Allow text-only, file-only, or text-plus-file messages.

    if (!trimmedText && !selectedFile && !editingMessageId) {

      return false;

    }



    if (!currentUser.walletAddress) {

      alert(

        "Wallet information is missing. Please connect your wallet again."

      );

      return false;

    }



    if (!token) {

      alert(

        "Your Community X session has expired. Please login again."

      );

      return false;

    }



    setSending(true);



    try {

      // ------------------------------------------------------

      // EDIT EXISTING MESSAGE

      // ------------------------------------------------------



      if (editingMessageId) {

        if (selectedFile) {

          alert(

            "Please finish editing before attaching a document."

          );

          return false;

        }



        if (!trimmedText) {

          alert("Message text cannot be empty while editing.");

          return false;

        }



        const isPrivateChat = activeTab === "admin";



        const endpoint = isPrivateChat

          ? `${API_URL}/private/${editingMessageId}`

          : `${API_URL}/group/${editingMessageId}`;



        const response = await fetch(endpoint, {

          method: "PUT",

          headers: {

            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,

          },

          body: JSON.stringify({

            message: trimmedText,

          }),

        });



        const data = await response.json();



        if (!response.ok) {

          throw new Error(

            data.message || "Failed to update message"

          );

        }



        const updatedMessage =

          data?.data || data?.messageData || null;



        const updateList = isPrivateChat

          ? setAdminMessages

          : setMessages;



        if (updatedMessage) {

          const formatted = formatMessage({

            ...updatedMessage,

            isEdited: true,

          });



          updateList((previous) =>

            previous.map((message) =>

              String(message.id) === String(editingMessageId)

                ? {

                  ...message,

                  ...formatted,

                  isEdited: true,

                }

                : message

            )

          );

        } else {

          // Fallback for APIs that don't return the updated object.

          updateList((previous) =>

            previous.map((message) =>

              String(message.id) === String(editingMessageId)

                ? {

                  ...message,

                  text: trimmedText,

                  isEdited: true,

                }

                : message

            )

          );

        }



        setEditingMessageId(null);

        setInputText("");

        setShowEmojiPicker(false);



        return true;

      }



      // ------------------------------------------------------

      // CREATE MULTIPART FORM DATA

      // ------------------------------------------------------



      const formData = new FormData();



      formData.append("senderName", currentUser.name);

      formData.append("senderAvatar", currentUser.avatar);

      formData.append("message", trimmedText);



      if (selectedFile) {

        formData.append("file", selectedFile);

      }



      // ------------------------------------------------------

      // PRIVATE ADMIN CHAT

      // ------------------------------------------------------



      if (activeTab === "admin") {

        const response = await fetch(

          `${API_URL}/private/${ADMIN_IDENTIFIER}`,

          {

            method: "POST",

            headers: {

              Authorization: `Bearer ${token}`,

            },

            // Do not manually set Content-Type for FormData.

            body: formData,

          }

        );



        const data = await response.json();



        if (!response.ok) {

          throw new Error(

            data.message || "Failed to send private message"

          );

        }



        // Socket.IO normally adds the message to local state.

        // Add the response only if the socket hasn't done so.

        const createdMessage =

          data?.data ||

          data?.messageData ||

          (data?._id ? data : null);



        if (createdMessage) {

          const formatted = formatMessage(createdMessage);



          if (formatted.id) {

            setAdminMessages((previous) => {

              const exists = previous.some(

                (message) =>

                  String(message.id) === String(formatted.id)

              );



              return exists

                ? previous

                : [...previous, formatted];

            });

          }

        }



        setInputText("");

        setShowEmojiPicker(false);



        return true;

      }



      // ------------------------------------------------------

      // GROUP CHAT

      // ------------------------------------------------------



      const response = await fetch(`${API_URL}/group`, {

        method: "POST",

        headers: {

          Authorization: `Bearer ${token}`,

        },

        // Do not manually set Content-Type for FormData.

        body: formData,

      });



      const data = await response.json();



      if (!response.ok) {

        throw new Error(

          data.message || "Failed to send group message"

        );

      }



      // Add response if the socket event hasn't arrived yet.

      const createdMessage =

        data?.data ||

        data?.messageData ||

        (data?._id ? data : null);



      if (createdMessage) {

        const formatted = formatMessage(createdMessage);



        if (formatted.id) {

          setMessages((previous) => {

            const exists = previous.some(

              (message) =>

                String(message.id) === String(formatted.id)

            );



            return exists

              ? previous

              : [...previous, formatted];

          });

        }

      }



      setInputText("");

      setShowEmojiPicker(false);



      return true;

    } catch (error) {

      console.error("Send/update message error:", error);



      alert(error.message || "Failed to send message.");



      return false;

    } finally {

      setSending(false);

    }

  };



  // ----------------------------------------------------------

  // START EDIT

  // ----------------------------------------------------------



  const handleStartEdit = (message) => {

    if (!message?.id) return;



    setEditingMessageId(message.id);

    setInputText(message.text || "");

    setShowEmojiPicker(false);

  };



  // ----------------------------------------------------------

  // CANCEL EDIT

  // ----------------------------------------------------------



  const handleCancelEdit = () => {

    setEditingMessageId(null);

    setInputText("");

    setShowEmojiPicker(false);

  };



  // ----------------------------------------------------------

  // DELETE MESSAGE

  // ----------------------------------------------------------



  const handleDeleteMessage = async (messageId) => {

    const confirmed = window.confirm(

      "Are you sure you want to delete this message?"

    );



    if (!confirmed) return;



    if (!token) {

      alert("Your session has expired. Please login again.");

      return;

    }



    try {

      setDeletingMessageId(messageId);



      const isPrivateChat = activeTab === "admin";



      const endpoint = isPrivateChat

        ? `${API_URL}/private/${messageId}`

        : `${API_URL}/group/${messageId}`;



      const response = await fetch(endpoint, {

        method: "DELETE",

        headers: {

          Authorization: `Bearer ${token}`,

        },

      });



      const data = await response.json();



      if (!response.ok) {

        throw new Error(

          data.message || "Failed to delete message"

        );

      }



      if (isPrivateChat) {

        setAdminMessages((previous) =>

          previous.filter(

            (message) => String(message.id) !== String(messageId)

          )

        );

      } else {

        setMessages((previous) =>

          previous.filter(

            (message) => String(message.id) !== String(messageId)

          )

        );

      }



      if (String(editingMessageId) === String(messageId)) {

        handleCancelEdit();

      }

    } catch (error) {

      console.error("Delete message error:", error);



      alert(error.message || "Failed to delete message.");

    } finally {

      setDeletingMessageId(null);

    }

  };



  // ----------------------------------------------------------

  // EMOJI

  // ----------------------------------------------------------



  const addEmoji = (emoji) => {

    setInputText((previous) => `${previous}${emoji}`);

    setShowEmojiPicker(false);

  };



  // ----------------------------------------------------------

  // CURRENT CHAT DATA

  // ----------------------------------------------------------



  const isAnnouncementsTab = activeTab === "announcements";



  const currentMessages =

    activeTab === "group" ? messages : adminMessages;



  const currentLoading =

    activeTab === "group" ? loading : adminLoading;



  // ----------------------------------------------------------

  // JSX

  // ----------------------------------------------------------



  return (

    <div className="cxchat-chat-app">

      {/* Ambient background */}

      <div className="cxchat-ambient-background">

        <div className="cxchat-ambient-light cxchat-ambient-light-one" />

        <div className="cxchat-ambient-light cxchat-ambient-light-two" />

        <div className="cxchat-ambient-light cxchat-ambient-light-three" />

      </div>



      {/* Mobile backdrop */}

      {mobileMenuOpen && (

        <div

          className="cxchat-mobile-backdrop"

          onClick={() => setMobileMenuOpen(false)}

        />

      )}



      {/* Sidebar */}

      <ChatSidebar

        activeTab={activeTab}

        setActiveTab={(tab) => {

          handleCancelEdit();

          setActiveTab(tab);

        }}

        mobileMenuOpen={mobileMenuOpen}

        setMobileMenuOpen={setMobileMenuOpen}

        currentUser={currentUser}

      />



      {/* Main chat */}

      <main className="cxchat-chat-main">

        <div className="cxchat-chat-card">

          {/* Header */}



          <ChatHeader

            activeTab={activeTab}

            setActiveTab={setActiveTab}

            setMobileMenuOpen={setMobileMenuOpen}

            hasNewAnnouncements={false}

          />





          {/* Show the announcement page only on the announcements tab */}

          {isAnnouncementsTab ? (

            <AnnouncementPanel

              announcements={announcements}

              loading={announcementsLoading}

              error={announcementsError}

              onRetry={() =>

                setAnnouncementRetry((previous) => previous + 1)

              }

            />

          ) : (

            <>

              {/* Existing Group Chat / Admin Messages */}

              <ChatMessages

                messages={currentMessages}

                loading={currentLoading}

                activeTab={activeTab}

                currentUser={currentUser}

                editingMessageId={editingMessageId}

                handleStartEdit={handleStartEdit}

                handleCancelEdit={handleCancelEdit}

                handleDeleteMessage={handleDeleteMessage}

                deletingMessageId={deletingMessageId}

                messagesEndRef={messagesEndRef}

              />



              {/* Existing Message Input */}

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

          )}

        </div>

      </main>

    </div>

  );

};



export default CommunityChat;