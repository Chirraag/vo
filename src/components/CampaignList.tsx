// Import the new EditCampaignModal component
import EditCampaignModal from "./EditCampaignModal";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Phone,
  Delete,
  Add,
  PieChart,
  ContentCopy,
  Search,
  ShowChart,
  CheckCircle,
  Error,
  FilterList,
  AccessTime,
  CalendarToday,
  Visibility,
  Menu,
  Close,
  MoreVert,
  PhoneIphone,
  BugReport,
  Edit,
} from "@mui/icons-material";
import {
  getCampaigns,
  deleteCampaign,
  Campaign,
  addCampaign,
  getContacts,
  addContacts,
} from "../utils/db";

const CampaignList: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("alpha");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null,
  );
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(
    null,
  );
  // New state for edit modal
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const navigate = useNavigate();

  const fetchCampaigns = async () => {
    try {
      const fetchedCampaigns = await getCampaigns();
      setCampaigns(fetchedCampaigns);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError("Failed to load campaigns. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns
    .filter(
      (campaign) =>
        campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        campaign.status.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      } else if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteCampaign(id);
      await fetchCampaigns(); // Refresh the campaigns list
      setShowDeleteConfirm(null);
      setCampaignToDelete(null);
    } catch (err) {
      console.error("Error deleting campaign:", err);
      setError("Failed to delete campaign. Please try again.");
    }
  };

  const handleDuplicate = async (
    event: React.MouseEvent,
    campaign: Campaign,
  ) => {
    event.stopPropagation();
    if (!campaign.id) return;

    try {
      setDuplicating(campaign.id);

      // Create new campaign with copied data, including localTouchEnabled
      const newCampaign: Omit<Campaign, "id"> = {
        title: `${campaign.title} (Copy)`,
        description: campaign.description,
        agentId: campaign.agentId,
        outboundNumber: campaign.outboundNumber,
        status: "Scheduled",
        progress: 0,
        hasRun: false,
        userId: campaign.userId,
        localTouchEnabled: campaign.localTouchEnabled,
      };

      // Add new campaign and get its ID
      const newCampaignId = await addCampaign(newCampaign);

      // Get contacts from original campaign
      const originalContacts = await getContacts(campaign.id);

      // Create new contacts for the duplicated campaign, including dynamicVariables
      if (originalContacts.length > 0) {
        const newContacts = originalContacts.map((contact) => ({
          phoneNumber: contact.phoneNumber,
          firstName: contact.firstName,
          campaignId: newCampaignId,
          dynamicVariables: contact.dynamicVariables,
        }));

        await addContacts(newContacts);
      }

      // Refresh campaigns list
      await fetchCampaigns();
    } catch (err) {
      console.error("Error duplicating campaign:", err);
      setError("Failed to duplicate campaign. Please try again.");
    } finally {
      setDuplicating(null);
    }
  };

  // New function to handle edit button click
  const handleEdit = (e: React.MouseEvent, campaign: Campaign) => {
    e.stopPropagation();

    // Prevent editing if campaign is currently running
    if (campaign.status === "In Progress") {
      // Show a message to the user explaining why they can't edit
      alert(
        "Cannot edit a campaign while it's running. Please pause the campaign first.",
      );
      return;
    }

    setEditingCampaign(campaign);
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case "Completed":
        return {
          color: "text-black",
          bg: "bg-custom-yellow/10",
          border: "border-custom-yellow/20",
          icon: <CheckCircle sx={{ fontSize: 16 }} className="mr-1.5" />,
        };
      case "In Progress":
        return {
          color: "text-black",
          bg: "bg-custom-orange/10",
          border: "border-custom-orange/20",
          icon: <ShowChart sx={{ fontSize: 16 }} className="mr-1.5" />,
        };
      case "Failed":
        return {
          color: "text-black",
          bg: "bg-custom-primary/10",
          border: "border-custom-primary/20",
          icon: <Error sx={{ fontSize: 16 }} className="mr-1.5" />,
        };
      default:
        return {
          color: "text-black",
          bg: "bg-custom-purple/10",
          border: "border-custom-purple/20",
          icon: <AccessTime sx={{ fontSize: 16 }} className="mr-1.5" />,
        };
    }
  };

  // Empty state and loader components
  const EmptyState = () => (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-black/5">
      <div className="w-20 h-20 mx-auto mb-6 bg-custom-primary/10 rounded-full flex items-center justify-center border border-custom-primary/20">
        <Phone sx={{ fontSize: 32 }} className="text-custom-primary" />
      </div>
      <h3 className="text-xl font-bold text-black mb-2 font-primary">
        No Campaigns Found
      </h3>
      <p className="text-black/70 mb-6 max-w-md mx-auto font-primary">
        {searchTerm
          ? `No campaigns match your search for "${searchTerm}"`
          : "Get started by creating your first outbound calling campaign"}
      </p>
      <Link
        to="/create"
        className="inline-flex items-center px-5 py-3 bg-custom-primary hover:bg-custom-primary/90 text-white rounded-lg transition duration-200 shadow-sm hover:shadow-md text-sm font-bold font-primary transform hover:-translate-y-0.5"
      >
        <Add sx={{ fontSize: 18 }} className="mr-2" />
        Create New Campaign
      </Link>
    </div>
  );

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="w-16 h-16 border-4 border-t-black border-black/10 rounded-full animate-spin mb-4"></div>
      <p className="text-black/70 font-bold font-primary">
        Loading campaigns...
      </p>
    </div>
  );

  const ErrorState = () => (
    <div className="bg-custom-primary/5 rounded-xl p-8 text-center border border-custom-primary/10">
      <Error sx={{ fontSize: 32 }} className="text-black mx-auto mb-4" />
      <h3 className="text-xl font-bold text-black mb-2 font-primary">
        Something went wrong
      </h3>
      <p className="text-black/70 mb-6 font-primary">{error}</p>
      <button
        onClick={fetchCampaigns}
        className="inline-flex items-center px-4 py-2 bg-custom-primary hover:bg-custom-primary/90 text-white rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md font-primary font-bold transform hover:-translate-y-0.5"
      >
        Try Again
      </button>
    </div>
  );

  const handleOpenDeleteModal = (e: React.MouseEvent, campaign: Campaign) => {
    e.stopPropagation();
    setShowDeleteConfirm(campaign.id || null);
    setCampaignToDelete(campaign);
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Subtle patterned background for added visual interest */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #ca061b 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      ></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header Section - Enhanced with custom-primary */}
        <div className="mb-12 border-l-4 border-custom-primary pl-6 py-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-black mb-2 font-primary">
                Campaigns
              </h1>
              <p className="text-black/70 max-w-xl font-primary">
                Create, manage and track your AI-powered outbound calling
                campaigns
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
              <div className="relative group flex-grow md:flex-grow-0">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search campaigns..."
                  className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-black/10 bg-white text-black placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-custom-primary/20 focus:border-custom-primary/30 text-sm transition-all duration-200 font-primary"
                />
                <Search
                  sx={{ fontSize: 20 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-custom-primary"
                  >
                    <Close sx={{ fontSize: 18 }} />
                  </button>
                )}
              </div>
              <div className="relative group">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-10 pr-8 py-2.5 rounded-xl border border-black/10 bg-white text-black focus:outline-none focus:ring-2 focus:ring-custom-primary/20 focus:border-custom-primary/30 text-sm transition-all duration-200 font-primary"
                >
                  <option value="alpha">Alphabetical</option>
                  <option value="status">By Status</option>
                </select>
                <FilterList
                  sx={{ fontSize: 20 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none"
                />
              </div>
              <Link
                to="/create"
                className="bg-custom-primary hover:bg-custom-primary/90 text-white px-5 py-2.5 rounded-xl transition-all duration-200 inline-flex items-center text-sm font-bold shadow-sm hover:shadow-md transform hover:-translate-y-0.5 font-primary"
              >
                <Add sx={{ fontSize: 18 }} className="mr-1.5" />
                New Campaign
              </Link>
            </div>
          </div>
        </div>

        {/* Status Pills - Enhanced with custom-primary */}
        <div className="mb-8 flex flex-wrap gap-2">
          {["All", "Scheduled", "In Progress", "Completed", "Failed"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setSearchTerm(status === "All" ? "" : status)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 font-primary ${
                  (status === "All" && !searchTerm) || searchTerm === status
                    ? "bg-custom-primary text-white shadow-sm transform scale-105"
                    : "bg-white text-black/70 border border-black/10 hover:bg-black/5 hover:border-custom-primary/20"
                }`}
              >
                {status}
              </button>
            ),
          )}
        </div>

        {/* Campaigns Grid or Empty State */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : filteredCampaigns.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredCampaigns.map((campaign) => {
              const statusDetails = getStatusDetails(campaign.status);
              return (
                <div
                  key={campaign.id}
                  className={`group relative bg-white rounded-xl p-3 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-black/5 flex flex-col ${
                    hoveredCard === campaign.id
                      ? "ring-1 ring-custom-primary/20 transform scale-[1.01]"
                      : ""
                  }`}
                  onClick={() => navigate(`/campaign/${campaign.id}`)}
                  onMouseEnter={() => setHoveredCard(campaign.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Top accent bar - using custom color based on status */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl 
                    ${
                      campaign.status === "Completed"
                        ? "bg-custom-yellow"
                        : campaign.status === "In Progress"
                          ? "bg-custom-orange"
                          : campaign.status === "Failed"
                            ? "bg-custom-primary"
                            : "bg-custom-purple"
                    }`}
                  ></div>
                  {/* Campaign header */}
                  <div className="flex-grow space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-base font-bold text-black truncate font-primary max-w-[180px]">
                          {campaign.title}
                        </h2>
                        <div
                          className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${statusDetails.color} ${statusDetails.bg} ${statusDetails.border} font-primary`}
                        >
                          {statusDetails.icon}
                          {campaign.status}
                        </div>
                      </div>

                      <div className="flex space-x-0.5 -mt-1 -mr-1">
                        {/* Edit button */}
                        <button
                          onClick={(e) => handleEdit(e, campaign)}
                          disabled={campaign.status === "In Progress"}
                          className={`text-black/50 hover:text-custom-primary p-1 rounded-md hover:bg-custom-primary/5 transition-colors duration-200 transform hover:scale-110 ${
                            campaign.status === "In Progress"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          title={
                            campaign.status === "In Progress"
                              ? "Pause campaign to edit"
                              : "Edit Campaign"
                          }
                        >
                          <Edit sx={{ fontSize: 16 }} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/campaign/${campaign.id}/analytics`);
                          }}
                          className="text-black/50 hover:text-custom-primary p-1 rounded-md hover:bg-custom-primary/5 transition-colors duration-200 transform hover:scale-110"
                          title="View Analytics"
                        >
                          <PieChart sx={{ fontSize: 16 }} />
                        </button>

                        <button
                          onClick={(e) => handleDuplicate(e, campaign)}
                          disabled={duplicating === campaign.id}
                          className={`text-black/50 hover:text-custom-primary p-1 rounded-md hover:bg-custom-primary/5 transition-colors duration-200 transform hover:scale-110 ${duplicating === campaign.id ? "opacity-50 cursor-wait" : ""}`}
                          title="Duplicate Campaign"
                        >
                          {duplicating === campaign.id ? (
                            <span className="block w-4 h-4 border-2 border-custom-primary border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <ContentCopy sx={{ fontSize: 16 }} />
                          )}
                        </button>

                        <button
                          onClick={(e) => handleOpenDeleteModal(e, campaign)}
                          className="text-black/50 hover:text-custom-primary p-1 rounded-md hover:bg-custom-primary/5 transition-colors duration-200 transform hover:scale-110"
                          title="Delete Campaign"
                        >
                          <Delete sx={{ fontSize: 16 }} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center mt-2 space-x-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-black/60 font-primary font-bold">
                            Progress
                          </span>
                          <span className="text-xs font-bold text-black/70 font-primary">
                            {campaign.progress || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-black/10 rounded-full h-1">
                          <div
                            className="bg-custom-primary h-1 rounded-full"
                            style={{ width: `${campaign.progress || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <div
                          className={`px-2 py-1 rounded-lg ${campaign.localTouchEnabled ? "bg-custom-yellow/10" : "bg-black/[0.02]"}`}
                        >
                          <div className="flex items-center">
                            {campaign.localTouchEnabled ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-black font-primary whitespace-nowrap">
                                <CheckCircle
                                  sx={{ fontSize: 10 }}
                                  className="mr-0.5"
                                />
                                Local Touch
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold text-black/60 font-primary whitespace-nowrap">
                                <Close
                                  sx={{ fontSize: 10 }}
                                  className="mr-0.5"
                                />
                                No Local
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 border-t border-black/5 pt-1 flex justify-between items-center">
                    <div className="text-[10px] text-black/70 font-bold font-primary">
                      {campaign.outboundNumber ? (
                        <div
                          className="flex items-center"
                          title="Outbound Number"
                        >
                          <PhoneIphone
                            sx={{ fontSize: 10 }}
                            className="mr-0.5 text-black/50"
                          />
                          {campaign.outboundNumber.replace(
                            /(\d{3})(\d{3})(\d{4})/,
                            "($1) $2-$3",
                          )}
                        </div>
                      ) : (
                        <div
                          className="flex items-center text-black"
                          title="Local Touch Enabled"
                        >
                          <BugReport sx={{ fontSize: 10 }} className="mr-0.5" />
                          Smart Touch
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-black/60 font-bold">
                      {campaign.description
                        ? campaign.description.length > 20
                          ? campaign.description.substring(0, 20) + "..."
                          : campaign.description
                        : "No description"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal - Moved outside of the campaign cards loop */}
      {showDeleteConfirm !== null && campaignToDelete && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => {
            setShowDeleteConfirm(null);
            setCampaignToDelete(null);
          }}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-custom-primary/10 flex items-center justify-center mr-4">
                <Error sx={{ fontSize: 20 }} className="text-black" />
              </div>
              <h3 className="text-xl font-bold text-black font-primary">
                Delete Campaign
              </h3>
            </div>
            <p className="text-black/70 mb-6 font-primary">
              Are you sure you want to delete the campaign "
              <span className="font-bold">{campaignToDelete.title}</span>"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(null);
                  setCampaignToDelete(null);
                }}
                className="px-4 py-2 bg-black/5 hover:bg-black/10 text-black rounded-lg transition-colors duration-200 font-primary font-bold"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  campaignToDelete.id && handleDelete(campaignToDelete.id);
                }}
                className="px-4 py-2 bg-custom-primary hover:bg-custom-primary/90 text-white rounded-lg transition-colors duration-200 font-primary font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <EditCampaignModal
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSave={fetchCampaigns}
        />
      )}

      {/* Add some CSS animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default CampaignList;
