import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getUnreadMessagesCount } from "../services/messages";

export type TabKey = "Market" | "Feed" | "Garden" | "Messages" | "Rankings" | "Profile";

type NavigationContextType = {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  unreadCount: number;
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabKey>("Market");
  const { session, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session || !user) return;

    const fetchUnread = async () => {
      try {
        const count = await getUnreadMessagesCount(user.id);
        setUnreadCount(count);
      } catch (err) {
        console.error("Failed to fetch unread count", err);
      }
    };

    fetchUnread();

    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [session, user?.id]);

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab, unreadCount }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigationContext must be used within a NavigationProvider");
  }
  return context;
}
