import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  getCampaign,
  getUserDialingCredits,
  addCampaign,
  addContacts,
  Campaign,
  Contact,
  CallLog,
} from "../utils/db";
import { supabase } from "../utils/supabaseClient";
import EditCampaignModal from "./EditCampaignModal";

// Material UI Icons
import {
  Close,
  BarChart,
  PieChart,
  ContentCopy,
  RecordVoiceOver,
  PhoneIphone,
  BugReport,
  CloudOutlined,
  Pets,
  Error,
  CheckCircle,
  ArrowBack,
  Phone,
  Paid,
  CallMade,
  Edit,
} from "@mui/icons-material";

import { CircularProgress } from "@mui/material";

// Interface definitions
interface ConcurrencyStatus {
  current_concurrency: number;
  concurrency_limit: number;
}

interface CallDetails {
  disconnection_reason: string;
  call_transcript: string;
  call_summary: string;
  call_recording: string;
  start_time: string;
}

// ContactsPopup component
interface ContactsPopupProps {
  setShowContactsPopup: (value: boolean) => void;
  campaignId: number;
}

const ContactsPopup: React.FC<ContactsPopupProps> = ({
  setShowContactsPopup,
  campaignId,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const CONTACTS_PER_PAGE = 100;

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const { data, count } = await supabase
          .from("contacts")
          .select("*", { count: "exact" })
          .eq("campaignId", campaignId)
          .range((page - 1) * CONTACTS_PER_PAGE, page * CONTACTS_PER_PAGE - 1);

        setContacts(data || []);
        setTotalPages(Math.ceil((count || 0) / CONTACTS_PER_PAGE));
      } catch (err) {
        console.error("Error fetching contacts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [campaignId, page]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowContactsPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowContactsPopup]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={() => setShowContactsPopup(false)}
    >
      <div
        ref={popupRef}
        className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <CircularProgress size={40} className="text-custom-primary" />
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowContactsPopup(false)}
              className="absolute top-2 right-2 text-black/50 hover:text-black/70 rounded-full p-1 hover:bg-black/5"
            >
              <Close sx={{ fontSize: 24 }} />
            </button>
            <h2 className="text-2xl font-bold mb-4 text-black font-primary">
              Campaign Contacts
            </h2>
            <div ref={scrollContainerRef} className="overflow-y-auto flex-grow">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-black/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-bold text-black/60 uppercase tracking-wider font-primary">
                      First Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-black/60 uppercase tracking-wider font-primary">
                      Phone Number
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact, index) => (
                    <tr
                      key={contact.id || index}
                      className="border-b border-black/5 hover:bg-black/[0.01]"
                    >
                      <td className="px-4 py-3 text-black/80 font-primary">
                        {contact.firstName}
                      </td>
                      <td className="px-4 py-3 text-black/80 font-primary">
                        {contact.phoneNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-black/5 rounded-lg text-black disabled:opacity-50 font-primary font-bold hover:bg-black/10 transition-all duration-200"
              >
                Previous
              </button>
              <span className="text-black/70 font-primary">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-black/5 rounded-lg text-black disabled:opacity-50 font-primary font-bold hover:bg-black/10 transition-all duration-200"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const BulkDialing: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [dialingStatus, setDialingStatus] = useState<
    "idle" | "dialing" | "paused" | "completed"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showContactsPopup, setShowContactsPopup] = useState(false);
  const [concurrencyStatus, setConcurrencyStatus] =
    useState<ConcurrencyStatus | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [purchaseLink, setPurchaseLink] = useState<string | null>(null);
  const [isRedialLoading, setIsRedialLoading] = useState(false);
  const concurrencyPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [contactsDialed, setContactsDialed] = useState(0);
  const [isLoadingDialedCount, setIsLoadingDialedCount] = useState(true);
  const campaignChannelRef = useRef<RealtimeChannel | null>(null);
  const creditsChannelRef = useRef<RealtimeChannel | null>(null);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);

  // Function to fetch concurrency status
  const fetchConcurrencyStatus = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("user_dialing_credits")
        .select("retell_api_key")
        .eq("userId", user.id)
        .single();

      if (!userData?.retell_api_key) return;

      const response = await axios.get(
        "https://api.retellai.com/get-concurrency",
        {
          headers: {
            Authorization: `Bearer ${userData.retell_api_key}`,
          },
        },
      );

      setConcurrencyStatus(response.data);
    } catch (error) {
      console.error("Error fetching concurrency status:", error);
    }
  }, []);

  // Start concurrency polling when dialing is active
  useEffect(() => {
    if (dialingStatus === "dialing") {
      const startPolling = () => {
        // Initial fetch
        fetchConcurrencyStatus();

        // Set up polling every 10 seconds
        concurrencyPollingIntervalRef.current = setInterval(
          fetchConcurrencyStatus,
          10000,
        );
      };

      startPolling();
    } else {
      // Clear polling when not dialing
      if (concurrencyPollingIntervalRef.current) {
        clearInterval(concurrencyPollingIntervalRef.current);
        concurrencyPollingIntervalRef.current = null;
        setConcurrencyStatus(null); // Clear concurrency status when not dialing
      }
    }

    return () => {
      if (concurrencyPollingIntervalRef.current) {
        clearInterval(concurrencyPollingIntervalRef.current);
      }
    };
  }, [dialingStatus, fetchConcurrencyStatus]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!campaign?.id) return;

    // Initial fetch of dialed count
    const fetchInitialData = async () => {
      try {
        // Fetch call logs and count in a single query
        const { data: logs, count } = await supabase
          .from("call_logs")
          .select("*", { count: "exact" })
          .eq("campaignId", campaign.id);

        setCallLogs(logs || []);
        setContactsDialed(count || 0);
        setHasAnalyzed(logs?.some((log) => log.disconnection_reason) || false);
      } catch (err) {
        console.error("Error fetching dialed count:", err);
      } finally {
        setIsLoadingDialedCount(false);
      }
    };

    fetchInitialData();

    // Subscribe to campaign updates
    const campaignChannel = supabase
      .channel(`campaign-${campaign.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${campaign.id}`,
        },
        (payload) => {
          const updatedCampaign = payload.new;
          setCampaign(updatedCampaign);
          setProgress(updatedCampaign.progress);

          if (updatedCampaign.status === "Completed") {
            setDialingStatus("completed");
          } else if (updatedCampaign.status === "Paused") {
            setDialingStatus("paused");
          } else if (updatedCampaign.status === "In Progress") {
            setDialingStatus("dialing");
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_logs",
          filter: `campaignId=eq.${campaign.id}`,
        },
        async () => {
          // Fetch updated call logs
          const { data: updatedLogs, count } = await supabase
            .from("call_logs")
            .select("*", { count: "exact" })
            .eq("campaignId", campaign.id);

          if (updatedLogs) {
            setCallLogs(updatedLogs);
            setContactsDialed(count || 0);
            setContactsDialed(count || 0);
          }
        },
      )
      .subscribe();

    campaignChannelRef.current = campaignChannel;

    return () => {
      campaignChannel.unsubscribe();
    };
  }, [campaign?.id]);

  // Setup credits subscription
  useEffect(() => {
    const setupCreditsSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const creditsChannel = supabase
        .channel(`credits-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_dialing_credits",
            filter: `userId=eq.${user.id}`,
          },
          (payload) => {
            setUserCredits(payload.new.dialing_credits);
          },
        )
        .subscribe();

      creditsChannelRef.current = creditsChannel;
    };

    setupCreditsSubscription();

    return () => {
      if (creditsChannelRef.current) {
        creditsChannelRef.current.unsubscribe();
        creditsChannelRef.current = null;
      }
    };
  }, []);

  // Cleanup subscriptions
  useEffect(() => {
    return () => {
      if (campaignChannelRef.current) {
        campaignChannelRef.current.unsubscribe();
        campaignChannelRef.current = null;
      }
      if (creditsChannelRef.current) {
        creditsChannelRef.current.unsubscribe();
        creditsChannelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const credits = await getUserDialingCredits(user.id);
          setUserCredits(credits);
        }
      } catch (error) {
        console.error("Error fetching user credits:", error);
      }
    };

    fetchUserCredits();
  }, []);

  const handleRedial = async () => {
    if (!campaign || !callLogs.length) return;

    setIsRedialLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const successfulCallLogs = callLogs.filter((log) =>
        ["agent_hangup", "user_hangup", "call_transfer"].includes(
          log.disconnection_reason,
        ),
      );

      // Fetch all contacts for the campaign
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("*")
        .eq("campaignId", campaign.id);

      if (contactsError) throw contactsError;
      if (!contacts?.length) {
        alert("No contacts found for this campaign.");
        setIsRedialLoading(false);
        return;
      }

      const successfulContactIds = new Set(
        successfulCallLogs.map((log) => log.contactId),
      );

      const contactsToRedial = contacts.filter(
        (contact) => !successfulContactIds.has(contact.id!),
      );

      if (contactsToRedial.length === 0) {
        alert("No failed contacts to redial.");
        setIsRedialLoading(false);
        return;
      }

      const newCampaign: Omit<Campaign, "id"> = {
        title: `${campaign.title} (Redial)`,
        description: campaign.description,
        agentId: campaign.agentId,
        outboundNumber: campaign.outboundNumber,
        status: "Scheduled",
        progress: 0,
        hasRun: false,
        userId: user.id,
        localTouchEnabled: campaign.localTouchEnabled,
      };

      const newCampaignId = await addCampaign(newCampaign);

      await addContacts(
        contactsToRedial.map((contact) => ({
          phoneNumber: contact.phoneNumber,
          firstName: contact.firstName,
          campaignId: newCampaignId,
          dynamicVariables: contact.dynamicVariables,
        })),
      );

      navigate(`/campaign/${newCampaignId}`);
    } catch (error) {
      console.error("Error creating redial campaign:", error);
      setError("Failed to create redial campaign");
    } finally {
      setIsRedialLoading(false);
    }
  };

  const startBulkDialing = useCallback(async () => {
    if (!campaign) return;
    if (campaign.hasRun && campaign.status === "Completed") {
      alert("This campaign has already been run and cannot be run again.");
      return;
    }
    setDialingStatus("dialing");
    console.log("Starting bulk dialing...");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Before starting the campaign, fetch the latest campaign data to ensure we have the most up-to-date settings
      const latestCampaign = await getCampaign(campaign.id);
      if (!latestCampaign) {
        throw new Error("Failed to fetch latest campaign data");
      }

      // Use the latest campaign data in the API request
      const response = await axios.post(
        "https://recall-backend.replit.app/api/start-bulk-dialing",
        {
          campaignId: latestCampaign.id,
          userId: user.id,
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.error || "Bulk dialing failed");
      }
    } catch (error) {
      console.error("Error during bulk dialing:", error);
      setDialingStatus("idle");
      if (error.response && error.response.status === 402) {
        setPurchaseLink(error.response.data.purchaseLink);
      } else {
        alert("An error occurred during bulk dialing. Please try again.");
      }
    }
  }, [campaign]);

  const pauseOrResumeCampaign = useCallback(async () => {
    if (!campaign) return;

    // Optimistically update UI state
    const newStatus = campaign.status === "Paused" ? "In Progress" : "Paused";
    setDialingStatus(newStatus === "Paused" ? "paused" : "dialing");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // If resuming, fetch the latest campaign data first
      let campaignId = campaign.id;
      if (newStatus === "In Progress") {
        const latestCampaign = await getCampaign(campaign.id);
        if (latestCampaign) {
          campaignId = latestCampaign.id;
          // Update local campaign state with latest settings
          setCampaign(latestCampaign);
        }
      }

      const response = await axios.post(
        "https://recall-backend.replit.app/api/update-campaign-status",
        {
          campaignId: campaignId,
          status: newStatus,
          userId: user.id, // Add userId when resuming
          isResuming: newStatus === "In Progress", // Flag to indicate this is a resume operation
        },
      );

      if (!response.data.success) {
        throw new Error(
          response.data.error || "Failed to update campaign status",
        );
      }

      // Update local campaign state
      setCampaign((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (error) {
      console.error("Error updating campaign status:", error.message);
      // Revert UI state on error
      setDialingStatus(campaign.status === "Paused" ? "paused" : "dialing");
      alert("An error occurred while updating the campaign status.");
    }
  }, [campaign]);

  useEffect(() => {
    const loadCampaignData = async () => {
      if (id) {
        try {
          // Get campaign data
          const campaignData = await getCampaign(parseInt(id, 10));
          if (campaignData) {
            setCampaign(campaignData);
            setProgress(campaignData.progress);

            // Get total contacts count only
            const { count } = await supabase
              .from("contacts")
              .select("id", { count: "exact" })
              .eq("campaignId", campaignData.id);

            setTotalContacts(count || 0);

            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (campaignData.hasRun) {
              if (campaignData.status === "In Progress") {
                setDialingStatus("dialing");
              } else if (campaignData.status === "Paused") {
                setDialingStatus("paused");
              } else if (campaignData.status === "Completed") {
                setDialingStatus("completed");
              }
            } else {
              setDialingStatus("idle");
            }

            if (user) {
              const credits = await getUserDialingCredits(user.id);
              setUserCredits(credits);
            }
          } else {
            setError("Campaign not found");
          }
        } catch (err) {
          setError("Error loading campaign data");
          console.error("Error loading campaign data:", err);
        }
      }
    };

    loadCampaignData();
  }, [id]);

  const analyzeCallLogs = useCallback(async () => {
    if (!campaign) return;
    setIsAnalyzing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const response = await axios.post(
        "https://recall-backend.replit.app/api/analyze-call-logs",
        {
          campaignId: campaign.id,
          userId: user.id,
        },
      );

      if (response.data.success) {
        setCallLogs(response.data.callLogs);
        setHasAnalyzed(true);
      } else {
        throw new Error(response.data.error || "Call log analysis failed");
      }
    } catch (error) {
      console.error("Error during call log analysis:", error);
      alert("An error occurred during call log analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [campaign]);

  const handleCallLogClick = (log: CallLog) => {
    setSelectedCallLog(log);
  };

  // Status badge based on campaign status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Progress":
        return "bg-custom-purple/10 text-black border border-custom-purple/20";
      case "Paused":
        return "bg-custom-orange/10 text-black border border-custom-orange/20";
      case "Completed":
        return "bg-custom-yellow/10 text-black border border-custom-yellow/20";
      default:
        return "bg-black/5 text-black border border-black/10";
    }
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white shadow-sm border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate("/campaigns")}
                className="mr-4 p-2 hover:bg-black/5 rounded-lg transition-colors duration-200 group"
              >
                <ArrowBack
                  sx={{ fontSize: 20 }}
                  className="text-black/60 group-hover:text-black group-hover:-translate-x-1 transition-all duration-200"
                />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-black flex items-center font-primary">
                  {campaign?.title || "Bulk Dialing"}
                  {campaign?.status === "In Progress" && (
                    <span className="ml-3 text-xs bg-custom-purple/10 text-black px-3 py-1 rounded-full animate-pulse flex items-center border border-custom-purple/20 font-primary">
                      <CircularProgress size={12} className="mr-1 text-black" />
                      Campaign Running
                    </span>
                  )}
                </h1>
                <p className="text-sm text-black/60 font-primary">
                  Campaign Control Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(`/campaign/${campaign?.id}/analytics`)}
                className="flex items-center px-4 py-2.5 bg-black/5 text-black rounded-lg hover:bg-black/10 transition-all duration-200 text-sm font-bold shadow-sm hover:shadow font-primary"
              >
                <PieChart sx={{ fontSize: 18 }} className="mr-2" />
                Analytics
              </button>
              <button
                onClick={() => setShowContactsPopup(true)}
                className="flex items-center px-4 py-2.5 bg-black text-white rounded-lg hover:bg-black/90 transition-all duration-200 text-sm font-bold shadow-sm hover:shadow transform hover:-translate-y-0.5 font-primary"
              >
                <Phone sx={{ fontSize: 18 }} className="mr-2" />
                View Contacts
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-custom-primary/5 border border-custom-primary/10 text-black px-4 py-3 rounded-lg flex items-center">
            <Error sx={{ fontSize: 20 }} className="mr-2 text-black" />
            <span className="font-primary">{error}</span>
          </div>
        )}

        {campaign ? (
          <div className="space-y-6">
            {/* Campaign Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border border-black/5 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-black/60 font-primary font-bold">
                    Total Contacts
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-custom-yellow/10 flex items-center justify-center group-hover:bg-custom-yellow/20 transition-colors duration-200">
                    <Pets sx={{ fontSize: 18 }} className="text-black" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-black font-primary">
                  {totalContacts}
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-black/5 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-black/60 font-primary font-bold">
                    Contacts Dialed
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-custom-primary/10 flex items-center justify-center group-hover:bg-custom-primary/20 transition-colors duration-200">
                    <CallMade sx={{ fontSize: 18 }} className="text-black" />
                  </div>
                </div>
                {isLoadingDialedCount ? (
                  <div className="h-8 flex items-center">
                    <CircularProgress size={20} className="text-black/40" />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-black font-primary">
                    {contactsDialed}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl p-5 border border-black/5 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-black/60 font-primary font-bold">
                    Available Credits
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-custom-purple/10 flex items-center justify-center group-hover:bg-custom-purple/20 transition-colors duration-200">
                    <Paid sx={{ fontSize: 18 }} className="text-black" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-black font-primary">
                  {userCredits !== null
                    ? userCredits.toLocaleString()
                    : "Loading..."}
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-black/5 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-black/60 font-primary font-bold">
                    Campaign Status
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-custom-orange/10 flex items-center justify-center group-hover:bg-custom-orange/20 transition-colors duration-200">
                    <RecordVoiceOver
                      sx={{ fontSize: 18 }}
                      className="text-black"
                    />
                  </div>
                </div>
                <div
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${getStatusBadge(campaign.status)} font-primary`}
                >
                  {campaign.status}
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="bg-white rounded-xl p-6 border border-black/5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-black font-primary">
                  Campaign Progress
                </h2>
                <span className="text-sm font-bold text-black font-primary">
                  {progress}%
                </span>
              </div>
              <div className="w-full bg-black/5 rounded-full h-2">
                <div
                  className="bg-custom-primary h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Concurrency Status */}
            {dialingStatus === "dialing" && concurrencyStatus && (
              <div className="bg-black rounded-xl p-6 text-white shadow-sm relative overflow-hidden">
                <div className="relative">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                      <BugReport sx={{ fontSize: 20 }} className="text-white" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-bold font-primary">
                        Concurrency Status
                      </h3>
                      <p className="text-sm text-white/70 font-primary">
                        Real-time calling metrics
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-white/70 mb-1 font-primary">
                        Current Concurrency
                      </p>
                      <p className="text-3xl font-bold text-white font-primary">
                        {concurrencyStatus.current_concurrency}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-white/70 mb-1 font-primary">
                        Concurrency Limit
                      </p>
                      <p className="text-3xl font-bold text-white font-primary">
                        {concurrencyStatus.concurrency_limit}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-white/50 mt-4 flex items-center font-primary">
                    <CircularProgress
                      size={16}
                      className="mr-2 text-white/70"
                    />
                    Updates every 10 seconds
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-8">
              {dialingStatus === "idle" && !campaign.hasRun && (
                <button
                  onClick={startBulkDialing}
                  className="flex items-center px-6 py-3 bg-custom-primary text-white rounded-xl hover:bg-custom-primary/90 transition-all duration-200 font-bold shadow-sm hover:shadow transform hover:-translate-y-0.5 font-primary"
                >
                  <RecordVoiceOver sx={{ fontSize: 20 }} className="mr-2" />
                  Start Bulk Dialing
                </button>
              )}
              {(dialingStatus === "dialing" || dialingStatus === "paused") && (
                <button
                  onClick={pauseOrResumeCampaign}
                  className={`flex items-center px-6 py-3 rounded-xl transition-all duration-200 font-bold shadow-sm hover:shadow transform hover:-translate-y-0.5 font-primary ${
                    dialingStatus === "paused"
                      ? "bg-custom-purple text-white hover:bg-custom-purple/90"
                      : "bg-custom-orange text-white hover:bg-custom-orange/90"
                  }`}
                >
                  {dialingStatus === "paused" ? (
                    <>
                      <CheckCircle sx={{ fontSize: 20 }} className="mr-2" />
                      Resume Campaign
                    </>
                  ) : (
                    <>
                      <Error sx={{ fontSize: 20 }} className="mr-2" />
                      Pause Campaign
                    </>
                  )}
                </button>
              )}
              {/* Edit Campaign button */}
              <button
                onClick={() => {
                  // Only allow editing if campaign is not currently running
                  if (dialingStatus === "dialing") {
                    alert(
                      "Cannot edit a campaign while it's running. Please pause the campaign first.",
                    );
                    return;
                  }
                  setShowEditModal(true);
                }}
                disabled={dialingStatus === "dialing"}
                className={`flex items-center px-6 py-3 bg-black/5 text-black rounded-xl hover:bg-black/10 transition-all duration-200 font-bold shadow-sm hover:shadow transform hover:-translate-y-0.5 font-primary ${
                  dialingStatus === "dialing"
                    ? "opacity-70 cursor-not-allowed"
                    : ""
                }`}
              >
                <Edit sx={{ fontSize: 20 }} className="mr-2" />
                {dialingStatus === "dialing"
                  ? "Pause to Edit"
                  : "Edit Campaign"}
              </button>
              <button
                onClick={handleRedial}
                disabled={isRedialLoading}
                className="flex items-center px-6 py-3 bg-custom-yellow text-black rounded-xl hover:bg-custom-yellow/90 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transform hover:-translate-y-0.5 font-primary"
              >
                <ContentCopy sx={{ fontSize: 20 }} className="mr-2" />
                {isRedialLoading
                  ? "Creating Redial..."
                  : "Redial Failed Contacts"}
              </button>
            </div>

            {/* Purchase Credits CTA */}
            {purchaseLink && (
              <div className="bg-custom-yellow/5 rounded-xl p-6 border border-custom-yellow/10 shadow-sm">
                <div className="flex items-start">
                  <Error sx={{ fontSize: 24 }} className="text-black mt-1" />
                  <div className="ml-4">
                    <h3 className="text-lg font-bold text-black mb-2 font-primary">
                      Insufficient Credits
                    </h3>
                    <p className="text-black/70 mb-4 font-primary">
                      Please purchase more credits to continue with your
                      campaign.
                    </p>
                    <a
                      href={purchaseLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-5 py-2.5 bg-custom-primary text-white rounded-lg hover:bg-custom-primary/90 transition-all duration-200 shadow-sm hover:shadow transform hover:-translate-y-0.5 font-primary font-bold"
                    >
                      Purchase Credits
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Completed Campaign Notice */}
            {campaign.hasRun && campaign.status === "Completed" && (
              <div className="bg-custom-purple/5 rounded-xl p-6 border border-custom-purple/10 shadow-sm">
                <div className="flex items-start">
                  <CheckCircle
                    sx={{ fontSize: 24 }}
                    className="text-black mt-1"
                  />
                  <div className="ml-4">
                    <h3 className="text-lg font-bold text-black font-primary">
                      Campaign Completed
                    </h3>
                    <p className="text-black/70 font-primary">
                      This campaign has finished running and cannot be run
                      again.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <CircularProgress size={40} className="text-custom-primary" />
          </div>
        )}

        {showContactsPopup && (
          <ContactsPopup
            setShowContactsPopup={setShowContactsPopup}
            campaignId={campaign?.id!}
          />
        )}

        {/* Edit Campaign Modal */}
        {showEditModal && campaign && (
          <EditCampaignModal
            campaign={campaign}
            onClose={() => setShowEditModal(false)}
            onSave={() => {
              // Refresh campaign data after edit
              if (id) {
                getCampaign(parseInt(id, 10)).then((updatedCampaign) => {
                  if (updatedCampaign) {
                    setCampaign(updatedCampaign);
                  }
                });
              }
              setShowEditModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BulkDialing;
