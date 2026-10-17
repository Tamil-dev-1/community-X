import { createContext, useContext } from "react";

const CommunityChatContext = createContext(null);

export const useCommunityChat = () => {
  const context = useContext(CommunityChatContext);

  if (!context) {
    throw new Error(
      "useCommunityChat must be used inside CommunityLayout"
    );
  }

  return context;
};

export default CommunityChatContext;