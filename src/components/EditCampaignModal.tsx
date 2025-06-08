import React, { useState, useEffect, useRef } from "react";
import {
  Person,
  PhoneIphone,
  BugReport,
  Close,
  Save,
  Phone,
  Info,
  Warning,
} from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { fetchAgents, fetchPhoneNumbers } from "../utils/retellApi";
import { getUserRetellApiKey } from "../utils/db";
import { supabase } from "../utils/supabaseClient";
import axios from "axios";

interface Agent {
  agent_id: string;
  agent_name: string;
}

interface PhoneNumber {
  phone_number: string;
  phone_number_pretty: string;
  nickname?: string;
}

interface EditCampaignModalProps {
  campaign: {
    id: number;
    title: string;
    agentId: string;
    outboundNumber: string | null;
    localTouchEnabled: boolean;
    status: string;
  };
  onClose: () => void;
  onSave: () => void;
}

const EditCampaignModal: React.FC<EditCampaignModalProps> = ({
  campaign,
  onClose,
  onSave,
}) => {
  const [agentId, setAgentId] = useState(campaign.agentId);
  const [outboundNumber, setOutboundNumber] = useState(
    campaign.outboundNumber || "",
  );
  const [localTouchEnabled, setLocalTouchEnabled] = useState(
    campaign.localTouchEnabled,
  );
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Check if campaign is still in a state where it can be edited
  useEffect(() => {
    const checkCampaignStatus = async () => {
      try {
        // Verify the campaign is not currently running
        const { data, error } = await supabase
          .from("campaigns")
          .select("status")
          .eq("id", campaign.id)
          .single();

        if (error) throw error;

        if (data.status === "In Progress") {
          alert(
            "This campaign is currently running. Editing is not allowed while a campaign is running.",
          );
          onClose();
        }
      } catch (err) {
        console.error("Error checking campaign status:", err);
      }
    };

    checkCampaignStatus();
  }, [campaign.id, onClose]);

  useEffect(() => {
    const fetchRetellData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user found");

        const apiKey = await getUserRetellApiKey(user.id);
        if (!apiKey) {
          setError("Please set your Retell API key in settings first");
          setLoading(false);
          return;
        }

        const [fetchedAgents, fetchedNumbers] = await Promise.all([
          fetchAgents(apiKey),
          fetchPhoneNumbers(apiKey),
        ]);

        setAgents(fetchedAgents);
        setPhoneNumbers(fetchedNumbers);
      } catch (err) {
        console.error("Error fetching Retell data:", err);
        setError(
          "Failed to load Retell data. Please check your API key in settings.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRetellData();
  }, []);

  useEffect(() => {
    // Handle clicking outside the modal to close it
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Verify the campaign is still editable
      const { data: currentData, error: statusError } = await supabase
        .from("campaigns")
        .select("status")
        .eq("id", campaign.id)
        .single();

      if (statusError) throw statusError;

      if (currentData.status === "In Progress") {
        throw new Error(
          "Campaign is currently running. Please pause it before making changes.",
        );
      }

      if (!localTouchEnabled && !outboundNumber) {
        setError("Please select an outbound number or enable Local Touch");
        setSaving(false);
        return;
      }

      const updates = {
        agentId,
        outboundNumber: localTouchEnabled ? null : outboundNumber,
        localTouchEnabled,
      };

      // Update campaign using the API
      await axios.put(
        `https://recall-backend.replit.app/api/campaigns/${campaign.id}`,
        updates,
      );

      // Call the callback to refresh the parent component
      onSave();
      onClose();
    } catch (error) {
      console.error("Error updating campaign:", error);
      setError(
        typeof error === "string"
          ? error
          : "Failed to update campaign. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // If the campaign is in progress, show a warning message
  const isRunning = campaign.status === "In Progress";
  const isPaused = campaign.status === "Paused";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full relative animate-fade-in"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black/50 hover:text-black transition-colors p-1 rounded-full hover:bg-black/5"
        >
          <Close sx={{ fontSize: 20 }} />
        </button>

        <h2 className="text-2xl font-bold text-black mb-1 font-primary">
          Edit Campaign
        </h2>
        <p className="text-black/60 mb-6 font-primary">
          Edit the agent and calling settings for "{campaign.title}"
        </p>

        {isPaused && (
          <div className="mb-6 p-4 bg-custom-yellow/10 border border-custom-yellow/20 rounded-lg">
            <div className="flex">
              <Info sx={{ fontSize: 20 }} className="text-black mr-3" />
              <div>
                <h3 className="font-bold text-black mb-1 font-primary">
                  Campaign is paused
                </h3>
                <p className="text-sm text-black/70 font-primary">
                  This campaign is currently paused. Changes will apply to all
                  remaining contacts that haven't been called yet when the
                  campaign is resumed.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <CircularProgress size={40} className="text-custom-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Agent Selection */}
              <div>
                <label
                  htmlFor="agentId"
                  className="block text-sm font-bold text-black mb-2 font-primary"
                >
                  Select Agent <span className="text-custom-primary">*</span>
                </label>
                <div className="relative">
                  <select
                    id="agentId"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="font-primary w-full px-4 py-3 bg-white border border-black/10 rounded-lg focus:ring-2 focus:ring-black/20 focus:border-black transition-all duration-200 appearance-none"
                    required
                  >
                    <option value="">Choose an AI agent</option>
                    {agents.map((agent) => (
                      <option key={agent.agent_id} value={agent.agent_id}>
                        {agent.agent_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Person sx={{ fontSize: 20 }} className="text-black/40" />
                  </div>
                </div>
                {agents.length === 0 && (
                  <p className="mt-2 text-sm text-black flex items-center font-primary">
                    No agents found. Please create an agent first.
                  </p>
                )}
              </div>

              {/* Local Touch Toggle */}
              <div className="flex items-start space-x-4 p-4 bg-custom-yellow/5 rounded-xl border border-custom-yellow/10">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-custom-yellow/10 rounded-lg flex items-center justify-center">
                    <BugReport sx={{ fontSize: 20 }} className="text-black" />
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-black font-primary">
                      Smart Local Touch
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="localTouch"
                        type="checkbox"
                        checked={localTouchEnabled}
                        onChange={(e) => setLocalTouchEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-black/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-custom-yellow/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-black/10 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-custom-yellow"></div>
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-black/70 font-primary">
                    Automatically match outbound numbers with contact area codes
                    to increase answer rates
                  </p>
                </div>
              </div>

              {/* Phone Number Selection (if local touch is disabled) */}
              {!localTouchEnabled && (
                <div>
                  <label
                    htmlFor="outboundNumber"
                    className="block text-sm font-bold text-black mb-2 font-primary"
                  >
                    Select Outbound Number{" "}
                    <span className="text-custom-primary">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="outboundNumber"
                      value={outboundNumber}
                      onChange={(e) => setOutboundNumber(e.target.value)}
                      className="font-primary w-full px-4 py-3 bg-white border border-black/10 rounded-lg focus:ring-2 focus:ring-black/20 focus:border-black transition-all duration-200 appearance-none"
                      required={!localTouchEnabled}
                    >
                      <option value="">Choose a phone number</option>
                      {phoneNumbers.map((number) => (
                        <option
                          key={number.phone_number}
                          value={number.phone_number}
                        >
                          {number.nickname
                            ? `${number.phone_number_pretty} (${number.nickname})`
                            : number.phone_number_pretty}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <Phone sx={{ fontSize: 20 }} className="text-black/40" />
                    </div>
                  </div>
                  {phoneNumbers.length === 0 && (
                    <p className="mt-2 text-sm text-black flex items-center font-primary">
                      No phone numbers available. Please add a phone number
                      first.
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 p-3 bg-custom-primary/5 border border-custom-primary/20 rounded-lg text-black font-primary">
                {error}
              </div>
            )}

            <div className="flex justify-end mt-8 space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-black/5 hover:bg-black/10 text-black rounded-lg transition-all duration-200 font-primary font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || isRunning}
                className="flex items-center px-5 py-2.5 bg-custom-primary text-white rounded-lg hover:bg-custom-primary/90 transition-all duration-200 font-primary font-bold disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <CircularProgress size={16} className="text-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save sx={{ fontSize: 18 }} className="mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditCampaignModal;
