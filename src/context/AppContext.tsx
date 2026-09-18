import React, { createContext, useContext, useState, type ReactNode } from "react";
import {
  donors as initialDonors,
  hospitals,
  ngos,
  initialRequests,
  notifications as initialNotifications,
  messages as initialMessages,
  type Donor,
  type BloodRequest,
  type Notification,
  type Message,
  type RequestStatus,
} from "../data/mockData";

type Role = "hospital" | "ngo" | "donor" | null;

interface AppState {
  role: Role;
  currentUser: { id: string; name: string } | null;
  donors: Donor[];
  requests: BloodRequest[];
  notifications: Notification[];
  messages: Message[];
  setRole: (role: Role, userId: string, userName: string) => void;
  logout: () => void;
  verifyRequest: (requestId: string) => void;
  createRequest: (req: Omit<BloodRequest, "id" | "createdAt" | "status">) => void;
  updateRequestStatus: (requestId: string, status: RequestStatus) => void;
  toggleDonorAvailability: (donorId: string) => void;
  contactDonor: (donorId: string, requestId: string, ngoName: string) => void;
  markNotificationRead: (id: string) => void;
  unreadCount: number;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [donorList, setDonorList] = useState(initialDonors);
  const [requestList, setRequestList] = useState(initialRequests);
  const [notifList, setNotifList] = useState(initialNotifications);
  const [msgList] = useState(initialMessages);

  const setRole = (r: Role, userId: string, userName: string) => {
    setRoleState(r);
    setCurrentUser({ id: userId, name: userName });
  };

  const logout = () => {
    setRoleState(null);
    setCurrentUser(null);
  };

  const verifyRequest = (requestId: string) => {
    setRequestList((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: "Verified" as RequestStatus, verifiedBy: currentUser?.name || "NGO" }
          : r
      )
    );
    setNotifList((prev) => [
      {
        id: `notif-${Date.now()}`,
        type: "verified" as const,
        title: "Request Verified",
        body: `${requestId} has been verified by ${currentUser?.name}`,
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  };

  const createRequest = (req: Omit<BloodRequest, "id" | "createdAt" | "status">) => {
    const newReq: BloodRequest = {
      ...req,
      id: `REQ-${1030 + requestList.length}`,
      createdAt: new Date().toISOString(),
      status: "Verification Pending",
    };
    setRequestList((prev) => [newReq, ...prev]);
  };

  const updateRequestStatus = (requestId: string, status: RequestStatus) => {
    setRequestList((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status } : r))
    );
    if (status === "Fulfilled") {
      setNotifList((prev) => [
        {
          id: `notif-${Date.now()}`,
          type: "system" as const,
          title: "Request Fulfilled",
          body: `${requestId} has been successfully fulfilled.`,
          timestamp: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ]);
    }
  };

  const toggleDonorAvailability = (donorId: string) => {
    setDonorList((prev) =>
      prev.map((d) =>
        d.id === donorId
          ? {
              ...d,
              available: !d.available,
              status: !d.available ? "Active" : "Temporarily Unavailable",
            }
          : d
      )
    );
  };

  const contactDonor = (donorId: string, requestId: string, ngoName: string) => {
    setDonorList((prev) =>
      prev.map((d) =>
        d.id === donorId
          ? { ...d, contactedBy: [...(d.contactedBy || []), `${ngoName}:${requestId}`] }
          : d
      )
    );
    setNotifList((prev) => [
      {
        id: `notif-${Date.now()}`,
        type: "request" as const,
        title: "Donor Contacted",
        body: `A donor has been contacted for ${requestId}`,
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  };

  const markNotificationRead = (id: string) => {
    setNotifList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifList.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        role,
        currentUser,
        donors: donorList,
        requests: requestList,
        notifications: notifList,
        messages: msgList,
        setRole,
        logout,
        verifyRequest,
        createRequest,
        updateRequestStatus,
        toggleDonorAvailability,
        contactDonor,
        markNotificationRead,
        unreadCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be within AppProvider");
  return ctx;
}

export { hospitals, ngos };
