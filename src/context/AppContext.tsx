import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
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
type RegistrationResult = { requiresEmailConfirmation: boolean; documentPath?: string };
type RegistrationDocuments = {
  ngo?: File | null;
  hospital?: File | null;
};

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /rate limit|too many requests|email rate/i.test(error.message);
}

export class ProfileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileNotFoundError";
  }
}

export class RoleMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleMismatchError";
  }
}

interface AppState {
  role: Role;
  currentUser: { id: string; name: string } | null;
  roleDetails: Record<string, unknown> | null;
  authLoading: boolean;
  donorAvailability: boolean | null;
  donors: Donor[];
  requests: BloodRequest[];
  notifications: Notification[];
  messages: Message[];
  signIn: (email: string, password: string, expectedRole: Role) => Promise<Exclude<Role, null>>;
  register: (role: Exclude<Role, null>, values: Record<string, string>, bloodGroup: string, consent: boolean, documents?: RegistrationDocuments) => Promise<RegistrationResult>;
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

const VALID_ROLES = new Set(["hospital", "ngo", "donor"]);

const getRoleTable = (role: Exclude<Role, null>) =>
  role === "donor" ? "donors" : role === "ngo" ? "ngos" : "hospitals";

const getUserDisplayName = (profileRole: Exclude<Role, null>, values: Record<string, string>) => {
  if (profileRole === "hospital" || profileRole === "ngo") {
    return values.contactPerson || values.fullName || values.organisationName || values.hospitalName || "User";
  }

  return values.fullName || "User";
};

export async function syncCurrentUserProfile(userId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const authUser = userData.user;
  if (!authUser) throw new Error("Authentication is required.");

  const metadata = authUser.user_metadata ?? {};
  const profileRole = metadata.role ?? "";
  const requestedRole = profileRole && VALID_ROLES.has(profileRole as string)
    ? (profileRole as Exclude<Role, null>)
    : null;

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    throw profileError;
  }

  const resolvedRole = existingProfile?.role || requestedRole;
  if (!resolvedRole || !VALID_ROLES.has(resolvedRole)) {
    throw new Error("Your account has an invalid role.");
  }

  const fullName = existingProfile?.full_name || metadata.full_name || metadata.contact_person || "User";
  const email = existingProfile?.email || authUser.email || "";
  const phone = existingProfile?.phone || metadata.phone || null;

  const { error: profileUpsertError } = await supabase
    .from("profiles")
    .upsert({ id: userId, role: resolvedRole, full_name: fullName, email, phone }, { onConflict: "id" });

  if (profileUpsertError) {
    console.error("PROFILE UPSERT ERROR", profileUpsertError);
    throw new Error("Registration failed while saving your profile. Please try again.");
  }

  const roleTable = getRoleTable(resolvedRole);
  const { data: roleRow, error: roleLookupError } = await supabase
    .from(roleTable)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleLookupError && roleLookupError.code !== "PGRST116") {
    throw roleLookupError;
  }

  if (roleRow) {
    return { role: resolvedRole, name: fullName };
  }

  const rolePayload: Record<string, unknown> = {
    id: userId,
    user_id: userId,
    email,
    phone,
  };

  if (resolvedRole === "donor") {
    const bloodGroup = metadata.blood_group ?? "";
    const donorName = metadata.full_name || fullName || "User";
    if (!bloodGroup) {
      throw new Error("Additional donor registration details are required before you can continue.");
    }
    Object.assign(rolePayload, {
      full_name: donorName,
      age: metadata.age ? Number(metadata.age) : null,
      category: metadata.category || null,
      gender: metadata.gender || null,
      aadhaar: metadata.aadhaar || null,
      blood_group: bloodGroup,
      city: metadata.city || null,
      map_location: metadata.map_location || null,
      radius: metadata.radius ? Number.parseInt(String(metadata.radius), 10) : null,
      consent: Boolean(metadata.consent),
      registration_certificate: metadata.registration_certificate || metadata.registration_certificate_url || null,
    });
  }

  if (resolvedRole === "ngo") {
    const organisationName = metadata.organisation_name || metadata.full_name || "";
    if (!organisationName) {
      throw new Error("Additional NGO registration details are required before you can continue.");
    }
    Object.assign(rolePayload, {
      organisation_name: organisationName,
      registration_number: metadata.registration_number || null,
      organisation_type: metadata.organisation_type || null,
      contact_person: metadata.contact_person || null,
      street_address: metadata.street_address || null,
      city: metadata.city || null,
      map_location: metadata.map_location || null,
      areas_served: metadata.areas_served || null,
      registration_certificate: metadata.registration_certificate || metadata.registration_certificate_url || null,
      registration_certificate_url: metadata.registration_certificate || metadata.registration_certificate_url || null,
    });
  }

  if (resolvedRole === "hospital") {
    const hospitalName = metadata.hospital_name || metadata.full_name || "";
    if (!hospitalName) {
      throw new Error("Additional hospital registration details are required before you can continue.");
    }
    Object.assign(rolePayload, {
      hospital_name: hospitalName,
      hospital_type: metadata.hospital_type || null,
      registration_id: metadata.registration_id || null,
      contact_person: metadata.contact_person || null,
      street_address: metadata.street_address || null,
      city: metadata.city || null,
      map_location: metadata.map_location || null,
      blood_bank: metadata.blood_bank || null,
      operating_hours: metadata.operating_hours || null,
      registration_certificate: metadata.registration_certificate || metadata.registration_certificate_url || null,
      registration_certificate_url: metadata.registration_certificate || metadata.registration_certificate_url || null,
    });
  }

  const { error: roleInsertError } = await supabase
    .from(roleTable)
    .upsert(rolePayload, { onConflict: "user_id" });

  if (roleInsertError) {
    console.error(`${resolvedRole.toUpperCase()} ROLE INSERT ERROR`, roleInsertError);
    throw new Error("Registration failed while saving your profile. Please try again.");
  }

  return { role: resolvedRole, name: fullName };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [roleDetails, setRoleDetails] = useState<Record<string, unknown> | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [donorAvailability, setDonorAvailability] = useState<boolean | null>(null);
  const [donorList, setDonorList] = useState(initialDonors);
  const [requestList, setRequestList] = useState(initialRequests);
  const [notifList, setNotifList] = useState(initialNotifications);
  const [msgList] = useState(initialMessages);

  const loadProfile = async (userId: string): Promise<{ role: Exclude<Role, null>; name: string }> => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        const repairedProfile = await syncCurrentUserProfile(userId).catch((error) => {
          throw new ProfileNotFoundError(
            error instanceof Error && error.message.includes("Additional")
              ? error.message
              : "Your profile was not found.",
          );
        });
        setRoleState(repairedProfile.role);
        setCurrentUser({ id: userId, name: repairedProfile.name });
        return repairedProfile;
      }
      console.error("PROFILE ERROR", profileError);
      throw profileError;
    }

    if (!profile) {
      const repairedProfile = await syncCurrentUserProfile(userId).catch((error) => {
        throw new ProfileNotFoundError(
          error instanceof Error && error.message.includes("Additional") ? error.message : "Your profile was not found.",
        );
      });
      setRoleState(repairedProfile.role);
      setCurrentUser({ id: userId, name: repairedProfile.name });
      return repairedProfile;
    }

    if (!profile.role || !VALID_ROLES.has(profile.role)) {
      throw new Error("Your account has an invalid role.");
    }
    setRoleState(profile.role);
    setCurrentUser({ id: profile.id, name: profile.full_name });
    const table = getRoleTable(profile.role);
    const { data: details, error: detailsError } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (detailsError) {
      console.warn("ROLE DETAILS ERROR", detailsError);
      setRoleDetails(null);
    } else {
      setRoleDetails(details as Record<string, unknown> | null);
    }
    return { role: profile.role, name: profile.full_name };
  };

  const loadDonorDetails = async (userId: string, profileName: string) => {
    const { data: donor, error: donorError } = await supabase
      .from("donors")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (donorError) {
      console.warn("DONOR ERROR", donorError);
      return;
    }
    if (!donor) {
      console.info("DONOR INFO: donor profile details are not available yet.");
      return;
    }
    setDonorAvailability(donor.available ?? false);
    void loadDonorRequests(userId, donor.blood_group);
    setDonorList((current) => [
      ...current.filter((item) => item.id !== userId),
      {
        id: donor.id,
        name: profileName,
        bloodGroup: donor.blood_group as Donor["bloodGroup"],
        area: "",
        city: "",
        status: donor.available ? "Active" : "Temporarily Unavailable",
        available: donor.available,
        lastDonation: donor.last_donation_date ?? "Not recorded",
        donationsCount: donor.donations_count,
        phone: "",
        contactedBy: [],
      },
    ]);
  };

  const loadDonorRequests = async (userId: string, bloodGroup: string) => {
    const { data, error } = await supabase
      .from("blood_requests")
      .select("*")
      .eq("blood_group", bloodGroup);
    if (error) {
      console.warn("DONOR REQUESTS ERROR", error);
      setRequestList([]);
      return;
    }
    setRequestList((data ?? []).map((request) => ({
      id: request.id,
      hospitalId: request.hospital_id,
      hospitalName: request.hospital_id,
      bloodGroup: request.blood_group as BloodRequest["bloodGroup"],
      units: request.units,
      urgency: request.urgency as BloodRequest["urgency"],
      status: request.status as BloodRequest["status"],
      createdAt: request.created_at,
      area: request.area ?? "Not available",
      patientAge: request.patient_age ?? undefined,
      notes: request.notes ?? undefined,
      matchedDonors: [userId],
    })));
  };

  const loadNotifications = async (userId: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("NOTIFICATIONS ERROR", error);
      setNotifList([]);
      return;
    }
    setNotifList((data ?? []).map((notification) => ({
      id: notification.id,
      type: notification.type as Notification["type"],
      title: notification.title,
      body: notification.body,
      timestamp: notification.created_at,
      read: notification.read,
    })));
  };

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) console.error("Unable to restore Supabase session:", error.message);
      if (mounted && data.session) {
        try {
          const restoredProfile = await loadProfile(data.session.user.id);
          if (restoredProfile.role === "donor") {
            void loadDonorDetails(data.session.user.id, restoredProfile.name);
            void loadNotifications(data.session.user.id);
          }
        } catch (profileError) {
          console.error("Unable to load account profile:", profileError);
          await supabase.auth.signOut();
        }
      }
      if (mounted) setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setRoleState(null);
        setCurrentUser(null);
        setRoleDetails(null);
        setAuthLoading(false);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, expectedRole: Role) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) throw new Error("Supabase did not return an authenticated user.");
    console.log("AUTH SUCCESS", { userId: user.id, email: user.email });
    const actualProfile = await loadProfile(user.id);
    const actualRole = actualProfile.role;
    if (expectedRole && actualRole !== expectedRole) {
      await supabase.auth.signOut();
      setRoleState(null);
      setCurrentUser(null);
      throw new RoleMismatchError("The selected role does not match your account.");
    }
    if (actualRole === "donor") {
      void loadDonorDetails(user.id, actualProfile.name);
      void loadNotifications(user.id);
    }
    return actualRole;
  };

  const register = async (selectedRole: Exclude<Role, null>, values: Record<string, string>, selectedBloodGroup: string, consent: boolean, documents: RegistrationDocuments = {}) => {
    const email = values.email?.trim();
    const password = values.password;
    if (!email || !password) throw new Error("Email and password are required.");
    if (password !== values.confirmPassword) throw new Error("Passwords do not match.");

    const appropriateName = getUserDisplayName(selectedRole, values);
    if (!appropriateName || appropriateName === "User") {
      throw new Error("A name is required.");
    }

    let response;
    try {
      response = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole,
            full_name: appropriateName,
            phone: values.phone || null,
            hospital_name: values.hospitalName || null,
            hospital_type: values.hospitalType || null,
            registration_id: values.registrationId || null,
            contact_person: values.contactPerson || null,
            blood_bank: values.bloodBank || null,
            operating_hours: values.operatingHours || null,
            organisation_name: values.organisationName || null,
            registration_number: values.registrationNumber || null,
            organisation_type: values.organisationType || null,
            areas_served: values.areasServed || null,
            street_address: values.streetAddress || null,
            city: values.city || null,
            map_location: values.mapLocation || null,
            blood_group: selectedBloodGroup || null,
            age: values.age || null,
            category: values.category || null,
            gender: values.gender || null,
            aadhaar: values.aadhaar || null,
            radius: values.radius || null,
            consent,
          },
        },
      });
    } catch (error) {
      if (isRateLimitError(error)) {
        throw new Error("Supabase email rate limit reached. Please wait before trying again.");
      }
      throw error;
    }

    if (response.error) {
      if (isRateLimitError(response.error)) {
        throw new Error("Supabase email rate limit reached. Please wait before trying again.");
      }
      throw response.error;
    }

    const user = response.data.user;
    if (!user) throw new Error("Supabase did not return a user.");

    console.log("AUTH USER:", user.id);
    console.log("SELECTED ROLE:", selectedRole);

    let documentPath: string | undefined;
    const document = selectedRole === "ngo" ? documents.ngo : selectedRole === "hospital" ? documents.hospital : null;
    if (document && response.data.session) {
      const bucket = "registration-certificates";
      const safeName = document.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      documentPath = `${user.id}/registration-certificate/${safeName}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(documentPath, document, {
        upsert: true,
        contentType: document.type,
      });
      if (uploadError) {
        console.error("CERTIFICATE UPLOAD ERROR", uploadError);
        throw new Error("Registration failed while saving your profile. Please try again.");
      }
    }

    try {
      const profilePayload = {
        id: user.id,
        role: selectedRole,
        full_name: appropriateName,
        email,
        phone: values.phone || null,
      };
      const { data: profileResult, error: profileError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" })
        .select();

      console.log("PROFILE INSERT:", profileResult);
      if (profileError) {
        console.error("PROFILE INSERT ERROR:", profileError);
        throw profileError;
      }

      if (selectedRole === "donor") {
        const donorPayload = {
          id: user.id,
          user_id: user.id,
          full_name: values.fullName || appropriateName,
          email,
          phone: values.phone || null,
          age: values.age ? Number(values.age) : null,
          category: values.category || null,
          gender: values.gender || null,
          aadhaar: values.aadhaar || null,
          blood_group: selectedBloodGroup || null,
          city: values.city || null,
          map_location: values.mapLocation || null,
          radius: values.radius ? Number.parseInt(values.radius, 10) : null,
          consent,
          available: true,
          registration_certificate: documentPath || null,
        };
        const { data: donorResult, error: donorError } = await supabase
          .from("donors")
          .upsert(donorPayload, { onConflict: "user_id" })
          .select();

        console.log("DONOR INSERT:", donorResult);
        if (donorError) {
          console.error("DONOR INSERT ERROR:", donorError);
          throw donorError;
        }
      }

      if (selectedRole === "ngo") {
        const organisationName = values.organisationName?.trim() ?? "";
        const registrationNumber = values.registrationNumber?.trim() ?? "";
        const contactPerson = values.contactPerson?.trim() ?? "";

        if (registrationNumber) {
          const { data: existingNgo, error: existingNgoError } = await supabase
            .from("ngos")
            .select("id, user_id")
            .eq("registration_number", registrationNumber)
            .maybeSingle();

          if (existingNgoError && existingNgoError.code !== "PGRST116") {
            throw existingNgoError;
          }

          if (existingNgo && existingNgo.user_id !== user.id) {
            throw new Error("This registration number is already registered.");
          }
        }

        const ngoPayload = {
          id: user.id,
          user_id: user.id,
          organisation_name: organisationName,
          registration_number: registrationNumber,
          organisation_type: values.organisationType || null,
          contact_person: contactPerson,
          email,
          phone: values.phone || null,
          street_address: values.streetAddress || null,
          city: values.city || null,
          map_location: values.mapLocation || null,
          areas_served: values.areasServed || null,
          registration_certificate: documentPath || null,
          registration_certificate_url: documentPath || null,
        };
        const { data: ngoResult, error: ngoError } = await supabase
          .from("ngos")
          .upsert(ngoPayload, { onConflict: "user_id" })
          .select();

        console.log("NGO INSERT:", ngoResult);
        if (ngoError) {
          console.error("NGO INSERT ERROR:", ngoError);
          throw ngoError;
        }
      }

      if (selectedRole === "hospital") {
        const hospitalPayload = {
          id: user.id,
          user_id: user.id,
          hospital_name: values.hospitalName || appropriateName,
          hospital_type: values.hospitalType || null,
          registration_id: values.registrationId || null,
          contact_person: values.contactPerson || null,
          phone: values.phone || null,
          email,
          street_address: values.streetAddress || null,
          city: values.city || null,
          map_location: values.mapLocation || null,
          blood_bank: values.bloodBank || null,
          operating_hours: values.operatingHours || null,
          registration_certificate: documentPath || null,
        };
        const { data: hospitalResult, error: hospitalError } = await supabase
          .from("hospitals")
          .upsert(hospitalPayload, { onConflict: "user_id" })
          .select();

        console.log("HOSPITAL INSERT:", hospitalResult);
        if (hospitalError) {
          console.error("HOSPITAL INSERT ERROR:", hospitalError);
          if (hospitalError.code === "23505" && hospitalError.message.includes("registration_id")) {
            throw new Error("This hospital registration ID is already registered.");
          }
          throw hospitalError;
        }
      }
    } catch (error) {
      console.error("REGISTRATION DATABASE ERROR:", error);
      throw error;
    }

    if (!response.data.session) {
      return { requiresEmailConfirmation: true, documentPath };
    }

    setRoleState(selectedRole);
    setCurrentUser({ id: user.id, name: appropriateName });
    return { requiresEmailConfirmation: false, documentPath };
  };

  const logout = () => {
    void supabase.auth.signOut();
    setRoleState(null);
    setCurrentUser(null);
    setRoleDetails(null);
    setDonorAvailability(null);
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
    const current = donorAvailability ?? donorList.find((donor) => donor.id === donorId)?.available ?? false;
    const next = !current;
    setDonorAvailability(next);
    void supabase
      .from("donors")
      .update({ available: next })
      .eq("user_id", donorId)
      .select("id")
      .maybeSingle()
      .then(({ error }) => {
        if (error) console.warn("DONOR AVAILABILITY ERROR", error);
      });
    setDonorList((prev) => prev.map((donor) => donor.id === donorId
      ? { ...donor, available: next, status: next ? "Active" : "Temporarily Unavailable" }
      : donor));
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
        roleDetails,
        authLoading,
        donorAvailability,
        donors: donorList,
        requests: requestList,
        notifications: notifList,
        messages: msgList,
        signIn,
        register,
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
