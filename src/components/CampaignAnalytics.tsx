import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase, RealtimeChannel } from "../utils/supabaseClient";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  getCallLogs,
  CallLog,
  getCampaign,
  getUserRetellApiKey,
} from "../utils/db";
import {
  ArrowBack,
  Phone,
  AccessTime,
  Adjust,
  PhoneDisabled,
  Close,
  PieChartOutlined,
  KeyboardArrowDown,
  KeyboardArrowUp,
  FileDownload,
  VolumeUp,
  ContentCopy,
  PlayArrow,
  Pause,
  CheckCircle,
  RotateRight,
  ChevronLeft,
  DescriptionOutlined,
  BarChartOutlined,
  NavigateBefore,
  NavigateNext,
  FirstPage,
  LastPage,
  Error,
} from "@mui/icons-material";
import * as XLSX from "xlsx";

const useCampaignData = (id: string | undefined) => {
  const [campaignTitle, setCampaignTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCalls: 0,
    analyzedCalls: 0,
    hitCalls: 0,
    unansweredCalls: 0,
    averageCallDuration: 0,
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        try {
          if (isInitialLoad) {
            setLoading(true);
          }

          const campaign = await getCampaign(parseInt(id, 10));
          setCampaignTitle(campaign?.title || "Campaign");

          // Fetch aggregated data for stats only
          const { data: aggregatedData, error: aggregateError } =
            await supabase.rpc("get_call_log_stats", { campaign_id: id });

          if (aggregateError) throw aggregateError;

          if (aggregatedData) {
            setStats({
              totalCalls: aggregatedData.total_calls || 0,
              analyzedCalls: aggregatedData.analyzed_calls || 0,
              hitCalls: aggregatedData.hit_calls || 0,
              unansweredCalls: aggregatedData.unanswered_calls || 0,
              averageCallDuration: aggregatedData.average_duration || 0,
            });
          }

          // Setup real-time subscription for call logs stats
          const callLogsChannel = supabase
            .channel(`call-logs-stats-${id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "call_logs",
                filter: `campaignId=eq.${id}`,
              },
              async () => {
                // Fetch updated stats on any change
                const { data: updatedStats } = await supabase.rpc(
                  "get_call_log_stats",
                  { campaign_id: id },
                );

                if (updatedStats) {
                  setStats({
                    totalCalls: updatedStats.total_calls || 0,
                    analyzedCalls: updatedStats.analyzed_calls || 0,
                    hitCalls: updatedStats.hit_calls || 0,
                    unansweredCalls: updatedStats.unanswered_calls || 0,
                    averageCallDuration: updatedStats.average_duration || 0,
                  });
                }
              },
            )
            .subscribe();

          channelRef.current = callLogsChannel;
          setIsInitialLoad(false);
        } catch (err) {
          console.error("Error fetching data:", err);
          setError("Failed to load campaign data. Please try again.");
        } finally {
          if (isInitialLoad) {
            setLoading(false);
          }
        }
      }
    };

    fetchData();

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [id]);

  return {
    campaignTitle,
    loading,
    error,
    stats,
  };
};

// Custom hook for paginated call logs
const usePaginatedCallLogs = (campaignId: string | undefined) => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const channelRef = useRef<RealtimeChannel | null>(null);

  // For chart data
  const [disconnectionReasonData, setDisconnectionReasonData] = useState<
    { name: string; value: number }[]
  >([]);
  const [sentimentData, setSentimentData] = useState<
    { name: string; value: number }[]
  >([]);

  const fetchChartData = async () => {
    if (!campaignId) return;

    try {
      console.log("Fetching chart data...");

      // Fetch data for disconnection reasons chart
      const { data: reasonData } = await supabase.rpc(
        "get_disconnection_reason_counts",
        { campaign_id: campaignId },
      );

      console.log("Disconnection reason data:", reasonData);

      if (reasonData) {
        setDisconnectionReasonData(
          reasonData.map((item: any) => ({
            name:
              item.reason === "Unknown"
                ? item.reason
                : item.reason.replace(/_/g, " "),
            value: item.count,
          })),
        );
      }

      // Fetch data for sentiment chart
      const { data: sentimentData } = await supabase.rpc(
        "get_sentiment_counts",
        { campaign_id: campaignId },
      );

      console.log("Sentiment data:", sentimentData);

      if (sentimentData) {
        setSentimentData(
          sentimentData.map((item: any) => ({
            name: item.sentiment || "Unknown",
            value: item.count,
          })),
        );
      }
    } catch (err) {
      console.error("Error fetching chart data:", err);
    }
  };

  const fetchLogs = async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      setError(null);

      console.log(
        `Fetching page ${currentPage}, size ${pageSize}, sort ${sortField} ${sortDirection}`,
      );

      // Use the paginated API endpoint
      const response = await axios.get(
        `https://recall-backend.replit.app/api/call-logs/${campaignId}/paginated`,
        {
          params: {
            page: currentPage,
            page_size: pageSize,
            sort_field: sortField,
            sort_direction: sortDirection,
          },
        },
      );

      console.log("API response:", response.data);

      if (response.data) {
        setCallLogs(response.data.data);
        setTotalPages(response.data.pagination.total_pages);
        setTotalRecords(response.data.pagination.total);

        // Additional debugging
        console.log(
          `Received ${response.data.data.length} records, total: ${response.data.pagination.total}`,
        );

        // Log the first record's disconnection reason to help debug
        if (response.data.data.length > 0) {
          console.log(
            "First record disconnection_reason:",
            response.data.data[0].disconnection_reason,
          );
        }
      }
    } catch (err) {
      console.error("Error fetching paginated call logs:", err);
      setError("Failed to load call logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      // Fetch paginated data
      fetchLogs();

      // Fetch chart data once
      fetchChartData();

      // Setup real-time subscription for any changes to call logs
      const callLogsChannel = supabase
        .channel(`call-logs-changes-${campaignId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "call_logs",
            filter: `campaignId=eq.${campaignId}`,
          },
          (payload) => {
            console.log("Real-time update received:", payload);

            // Refetch both paginated data and chart data on any change
            fetchLogs();
            fetchChartData();
          },
        )
        .subscribe();

      console.log("Real-time subscription activated");
      channelRef.current = callLogsChannel;

      return () => {
        if (channelRef.current) {
          console.log("Cleaning up real-time subscription");
          channelRef.current.unsubscribe();
        }
      };
    }
  }, [campaignId, currentPage, pageSize, sortField, sortDirection]);

  // Toggle sort direction for call duration
  const toggleSortDirection = () => {
    console.log("Toggling sort direction");
    if (sortField === "call_duration") {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField("call_duration");
      setSortDirection("asc");
    }
  };

  return {
    callLogs,
    loading,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalRecords,
    toggleSortDirection,
    sortField,
    sortDirection,
    disconnectionReasonData,
    sentimentData,
  };
};

// Updated brand-aligned colors
const COLORS = [
  "#ca061b", // custom-primary
  "#ff5900", // custom-orange
  "#5f007d", // custom-purple
  "#f9a901", // custom-yellow
];

// Animated progress ring component
const ProgressRing: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  children?: React.ReactNode;
}> = ({ progress, size, strokeWidth, color, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute">{children}</div>
    </div>
  );
};

// Styled Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  secondaryValue?: string;
}> = ({ icon, value, label, color, secondaryValue }) => (
  <div className="relative overflow-hidden group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-black/5 transform hover:translate-y-[-2px]">
    <div className={`absolute top-0 left-0 bottom-0 w-1 ${color}`}></div>

    <div className="p-5 flex flex-col h-full relative z-10">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-bold text-black/60 font-primary">
          {label}
        </h3>
        <div
          className={`flex items-center justify-center h-8 w-8 ${color} rounded-full text-white transition-all duration-300 ease-out transform group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline">
          <span className="text-3xl font-bold text-black tracking-tight mr-2 font-primary">
            {value}
          </span>
          {secondaryValue && (
            <span className="text-sm font-bold text-black/50 font-primary">
              {secondaryValue}
            </span>
          )}
        </div>

        {/* Subtle animated line on hover */}
        <div className="h-0.5 w-0 group-hover:w-full transition-all duration-500 mt-2 bg-black/5 rounded-full"></div>
      </div>
    </div>
  </div>
);

// Enhanced pie chart component
const EnhancedPieChart: React.FC<{
  data: { name: string; value: number }[];
  colors?: string[];
  title: string;
  icon: React.ReactNode;
}> = ({ data, colors = COLORS, title, icon }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // Calculate total for percentage
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div
      className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 h-full overflow-hidden flex flex-col border border-black/5 transform ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
    >
      <div className="p-5 pb-0 border-b border-black/5">
        <div className="flex items-center">
          <div className="text-black mr-3 transition-transform duration-300">
            {icon}
          </div>
          <h2 className="text-lg font-bold text-black font-primary">{title}</h2>
        </div>
      </div>

      <div className="flex-grow p-4">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                animationBegin={300}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                    stroke="none"
                    className="transition-all duration-300"
                    style={{
                      filter:
                        activeIndex === index
                          ? "drop-shadow(0px 6px 8px rgba(0,0,0,0.15))"
                          : "drop-shadow(0px 2px 3px rgba(0,0,0,0.05))",
                      transform:
                        activeIndex === index ? "scale(1.05)" : "scale(1)",
                      transformOrigin: "center",
                      transformBox: "fill-box",
                      transition:
                        "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease",
                    }}
                  />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                layout="horizontal"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value, entry: any, index) => (
                  <span className="text-xs text-black/70 font-bold font-primary group transition-all duration-300 inline-flex items-center">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 ${activeIndex === index ? "scale-150" : ""} transition-transform duration-300`}
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    {value} ({((entry.payload.value / total) * 100).toFixed(1)}
                    %)
                  </span>
                )}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-black/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-xl border border-white/10 animate-fade-in">
                        <p className="text-white font-bold mb-1 font-primary text-sm">
                          {payload[0].name}
                        </p>
                        <p className="text-white/80 text-xs font-primary">
                          <span className="font-bold">{payload[0].value}</span>{" "}
                          calls
                          <span className="ml-2">
                            ({((payload[0].value / total) * 100).toFixed(1)}%)
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Call logs table with enhanced styling and pagination
const CallLogTable: React.FC<{
  callLogs: CallLog[];
  loading: boolean;
  onRowClick: (log: CallLog) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  totalRecords: number;
  toggleSortDirection: () => void;
  sortDirection: "asc" | "desc" | null;
}> = ({
  callLogs,
  loading,
  onRowClick,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  totalPages,
  totalRecords,
  toggleSortDirection,
  sortDirection,
}) => {
  const handleExport = async () => {
    try {
      // Fetch all logs for export - we need a different API for this
      const { data: allLogs } = await supabase
        .from("call_logs")
        .select("*")
        .eq("campaignId", callLogs[0]?.campaignId);

      const exportData = (allLogs || []).map((log) => ({
        "Phone Number": log.phoneNumber,
        "First Name": log.firstName,
        "Call ID": log.callId,
        "Disconnection Reason": log.disconnection_reason || "N/A",
        "Duration (sec)": log.call_duration?.toFixed(2),
        Sentiment: log.user_sentiment,
        "Start Time": log.start_time,
        "Call Summary": log.call_summary,
        "Call Transcript": log.call_transcript,
        "Call Recording URL": log.call_recording,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Call Logs");
      const fileName = `call_logs_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  // Function to get row classes based on sentiment
  const getRowClasses = (log: CallLog) => {
    let baseClasses = "transition-colors duration-150 cursor-pointer";

    if (!log.user_sentiment || !log.disconnection_reason) {
      return `${baseClasses} hover:bg-black/5`;
    }

    if (log.user_sentiment === "Positive") {
      return `${baseClasses} hover:bg-custom-yellow/10 border-l-2 border-custom-yellow`;
    } else if (log.user_sentiment === "Negative") {
      return `${baseClasses} hover:bg-custom-primary/10 border-l-2 border-custom-primary`;
    } else if (log.user_sentiment === "Neutral") {
      return `${baseClasses} hover:bg-custom-purple/10 border-l-2 border-custom-purple`;
    }

    return `${baseClasses} hover:bg-black/5`;
  };

  // Function to determine badge styles based on type
  const getBadgeStyle = (
    type: string,
    field: "sentiment" | "status" | "disconnection",
  ) => {
    const baseClasses =
      "px-2 py-0.5 text-xs rounded-full inline-flex items-center justify-center font-bold font-primary";

    if (field === "sentiment") {
      switch (type) {
        case "Positive":
          return `${baseClasses} bg-custom-yellow/10 text-black border border-custom-yellow/20`;
        case "Negative":
          return `${baseClasses} bg-custom-primary/10 text-black border border-custom-primary/20`;
        case "Neutral":
          return `${baseClasses} bg-custom-purple/10 text-black border border-custom-purple/20`;
        default:
          return `${baseClasses} bg-black/5 text-black/70 border border-black/10`;
      }
    }

    if (field === "status") {
      if (type === "true" || type === "Successful") {
        return `${baseClasses} bg-custom-yellow/10 text-black border border-custom-yellow/20`;
      }
      return `${baseClasses} bg-custom-primary/10 text-black border border-custom-primary/20`;
    }

    // Disconnection reason styling
    switch (type) {
      case "agent_hangup":
        return `${baseClasses} bg-custom-purple/10 text-black border border-custom-purple/20`;
      case "user_hangup":
        return `${baseClasses} bg-custom-orange/10 text-black border border-custom-orange/20`;
      case "call_transfer":
        return `${baseClasses} bg-custom-yellow/10 text-black border border-custom-yellow/20`;
      default:
        return `${baseClasses} bg-black/5 text-black/70 border border-black/10`;
    }
  };

  // Calculate pagination indexes for "Showing X to Y of Z entries"
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + pageSize - 1, totalRecords);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
      <div className="p-5 flex justify-between items-center border-b border-black/5">
        <div className="flex items-center">
          <DescriptionOutlined className="text-black/60 w-5 h-5 mr-3" />
          <h2 className="text-lg font-bold text-black font-primary">
            Call Logs
          </h2>
          <div className="ml-3 px-2 py-1 bg-black/5 rounded-md text-xs font-bold text-black/70 font-primary">
            {totalRecords} {totalRecords === 1 ? "record" : "records"}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center px-3 py-1.5 bg-black/5 rounded-lg text-xs font-bold text-black/70 font-primary">
            <span className="mr-2">Show:</span>
            <select
              className="bg-transparent focus:outline-none cursor-pointer"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1); // Reset to first page when changing page size
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-custom-yellow/10 text-black rounded-lg hover:bg-custom-yellow/20 transition-colors duration-200 font-bold text-sm border border-custom-yellow/20 font-primary"
          >
            <FileDownload sx={{ fontSize: 16 }} className="mr-2" />
            Export to Excel
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-black/5">
          <thead>
            <tr className="bg-black/[0.02]">
              <th className="px-5 py-3 text-left text-xs font-bold text-black/70 uppercase tracking-wider font-primary">
                Phone Number
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold text-black/70 uppercase tracking-wider font-primary">
                First Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold text-black/70 uppercase tracking-wider font-primary">
                Call ID
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold text-black/70 uppercase tracking-wider font-primary">
                Disconnection Reason
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold text-black/70 uppercase tracking-wider font-primary">
                <button
                  className="flex items-center space-x-1 hover:text-custom-primary transition-colors duration-200"
                  onClick={toggleSortDirection}
                >
                  <span>Duration</span>
                  <span className="flex flex-col">
                    <KeyboardArrowUp
                      sx={{ fontSize: 14 }}
                      className={`${
                        sortDirection === "asc"
                          ? "text-custom-primary"
                          : "text-black/40"
                      }`}
                    />
                    <KeyboardArrowDown
                      sx={{ fontSize: 14 }}
                      className={`${
                        sortDirection === "desc"
                          ? "text-custom-primary"
                          : "text-black/40"
                      }`}
                    />
                  </span>
                </button>
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold text-black/70 uppercase tracking-wider font-primary">
                Sentiment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-custom-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-black/60 font-primary">
                      Loading call logs...
                    </p>
                  </div>
                </td>
              </tr>
            ) : callLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-black/60 font-primary"
                >
                  No call logs available
                </td>
              </tr>
            ) : (
              callLogs.map((log, index) => (
                <tr
                  key={log.id || index}
                  onClick={() => onRowClick(log)}
                  className={getRowClasses(log)}
                >
                  <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-black font-primary">
                    {log.phoneNumber}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
                    {log.firstName || "—"}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-sm text-black/60 font-mono font-primary">
                    {log.callId}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span
                      className={getBadgeStyle(
                        log.disconnection_reason || "unknown",
                        "disconnection",
                      )}
                    >
                      {log.disconnection_reason
                        ? log.disconnection_reason.replace(/_/g, " ")
                        : "Unknown"}
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-sm">
                    <div
                      className={`font-bold ${log.call_duration ? "text-black" : "text-black/40"} font-primary`}
                    >
                      {log.call_duration
                        ? `${log.call_duration.toFixed(2)} sec`
                        : "—"}
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span
                      className={getBadgeStyle(
                        log.user_sentiment || "unknown",
                        "sentiment",
                      )}
                    >
                      {log.user_sentiment || "Unknown"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalRecords > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-black/5 bg-black/[0.01]">
          <div className="text-xs text-black/60 font-primary">
            Showing <span className="font-bold">{startIndex}</span> to{" "}
            <span className="font-bold">{endIndex}</span> of{" "}
            <span className="font-bold">{totalRecords}</span> entries
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md hover:bg-black/5 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none"
              aria-label="First page"
            >
              <FirstPage sx={{ fontSize: 20 }} className="text-black/60" />
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md hover:bg-black/5 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <NavigateBefore sx={{ fontSize: 20 }} className="text-black/60" />
            </button>

            <div className="flex items-center space-x-1 mx-2">
              {/* Dynamic page buttons with current page indicator */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Calculate which pages to show based on current page
                let pageNum;
                if (totalPages <= 5) {
                  // Show all pages if 5 or fewer
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  // Near start
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  // Near end
                  pageNum = totalPages - 4 + i;
                } else {
                  // In the middle
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-md text-sm font-bold transition-all duration-200 ${
                      currentPage === pageNum
                        ? "bg-custom-primary text-white"
                        : "hover:bg-black/5 text-black/70"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md hover:bg-black/5 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Next page"
            >
              <NavigateNext sx={{ fontSize: 20 }} className="text-black/60" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md hover:bg-black/5 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Last page"
            >
              <LastPage sx={{ fontSize: 20 }} className="text-black/60" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Detailed call view sidebar with enhanced styling
const CallDetailsModal: React.FC<{
  callLog: CallLog | null;
  onClose: () => void;
}> = ({ callLog, onClose }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch (error) {
      return "Invalid date";
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress =
        (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!callLog) return null;

  // Function to determine sentiment color
  const getSentimentColor = (sentiment: string | undefined) => {
    switch (sentiment) {
      case "Positive":
        return "text-custom-yellow";
      case "Negative":
        return "text-custom-primary";
      case "Neutral":
        return "text-custom-purple";
      default:
        return "text-black/60";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-xl h-full bg-white shadow-xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 z-10 bg-white border-b border-black/10">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={onClose}
              className="group p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
            >
              <ChevronLeft
                sx={{ fontSize: 20 }}
                className="text-black/60 group-hover:text-black"
              />
            </button>
            <h2 className="text-lg font-bold text-black font-primary">
              Call Details
            </h2>
            <div className="w-8"></div> {/* Spacer for alignment */}
          </div>
        </div>

        <div className="p-5">
          {/* Call Recording Player */}
          {callLog.call_recording && (
            <div className="bg-black/[0.02] rounded-xl p-4 mb-5">
              <audio
                ref={audioRef}
                src={callLog.call_recording}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePlayPause}
                  className={`p-2 rounded-full ${isPlaying ? "bg-black/10" : "bg-custom-primary text-white"}`}
                >
                  {isPlaying ? (
                    <Pause sx={{ fontSize: 18 }} />
                  ) : (
                    <PlayArrow sx={{ fontSize: 18 }} />
                  )}
                </button>
                <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-custom-primary rounded-full transition-all duration-100"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
                <div className="relative">
                  <button
                    className="p-2 rounded-full hover:bg-black/10 text-black/60"
                    onMouseEnter={() => setIsVolumeHovered(true)}
                    onMouseLeave={() => setIsVolumeHovered(false)}
                  >
                    <VolumeUp sx={{ fontSize: 18 }} />
                  </button>
                  {isVolumeHovered && (
                    <div className="absolute bottom-full right-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-black/10">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-24"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Call Summary Card */}
          <div className="bg-custom-purple/5 rounded-xl p-4 mb-5 border border-custom-purple/10">
            <h3 className="text-xs font-bold text-black uppercase tracking-wide mb-2 font-primary">
              Call Summary
            </h3>
            <p className="text-sm text-black/70 font-primary">
              {callLog.call_summary || "No summary available"}
            </p>
          </div>

          {/* Call Metadata */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {[
              { label: "Call ID", value: callLog.callId },
              { label: "Phone Number", value: callLog.phoneNumber },
              { label: "First Name", value: callLog.firstName || "—" },
              {
                label: "Duration",
                value: callLog.call_duration
                  ? `${callLog.call_duration.toFixed(2)} sec`
                  : "—",
              },
              {
                label: "Start Time",
                value: formatTimestamp(callLog.start_time),
              },
              {
                label: "Call Direction",
                value: callLog.call_direction || "—",
              },
            ].map((item, index) => (
              <div key={index} className="bg-black/[0.02] rounded-lg p-3">
                <div className="text-xs text-black/50 mb-1 font-bold font-primary">
                  {item.label}
                </div>
                <div className="text-sm font-bold text-black truncate font-primary">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Call Analysis */}
          <div className="mb-5">
            <h3 className="text-xs font-bold text-black uppercase tracking-wide mb-3 font-primary">
              Call Analysis
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/[0.02] rounded-lg p-3 border-l-3 border-custom-orange">
                <div className="text-xs text-black/50 mb-1 font-bold font-primary">
                  Disconnection
                </div>
                <div className="text-sm font-bold text-black font-primary">
                  {callLog.disconnection_reason
                    ? callLog.disconnection_reason.replace(/_/g, " ")
                    : "Unknown"}
                </div>
              </div>
              <div
                className={`bg-black/[0.02] rounded-lg p-3 border-l-3 ${
                  callLog.user_sentiment === "Positive"
                    ? "border-custom-yellow"
                    : callLog.user_sentiment === "Negative"
                      ? "border-custom-primary"
                      : "border-custom-purple"
                }`}
              >
                <div className="text-xs text-black/50 mb-1 font-bold font-primary">
                  User Sentiment
                </div>
                <div
                  className={`text-sm font-bold ${getSentimentColor(callLog.user_sentiment)} font-primary`}
                >
                  {callLog.user_sentiment || "Unknown"}
                </div>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-black uppercase tracking-wide font-primary">
                Transcript
              </h3>
              <button
                onClick={() => {
                  if (callLog.call_transcript) {
                    navigator.clipboard.writeText(callLog.call_transcript);
                  }
                }}
                className="flex items-center text-xs text-black/50 hover:text-black transition-colors duration-200 font-primary"
              >
                <ContentCopy sx={{ fontSize: 14 }} className="mr-1" />
                Copy
              </button>
            </div>
            <div className="bg-black/[0.02] rounded-xl p-4 max-h-96 overflow-y-auto">
              {callLog.call_transcript ? (
                <div className="space-y-3">
                  {callLog.call_transcript
                    .split("\n")
                    .filter((line) => line.trim())
                    .map((line, index) => {
                      // Try to detect if line is from Agent or User based on common patterns
                      const isAgentLine = line.match(/^agent|^assistant|^ai:/i);
                      const isUserLine = line.match(
                        /^user|^customer|^caller:/i,
                      );

                      // Extract speaker if detected
                      let speaker = "";
                      let content = line;

                      if (isAgentLine || isUserLine) {
                        const parts = line.split(":", 2);
                        if (parts.length > 1) {
                          speaker = parts[0];
                          content = parts[1].trim();
                        }
                      } else if (line.includes(":")) {
                        // Try to extract speaker from other formats
                        const parts = line.split(":", 2);
                        if (parts[0].length < 20 && !parts[0].includes(" ")) {
                          speaker = parts[0];
                          content = parts[1].trim();
                        }
                      }

                      if (speaker) {
                        return (
                          <div
                            key={index}
                            className={`flex ${isUserLine ? "justify-end" : ""} animate-fade-in`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div
                              className={`max-w-[85%] rounded-xl px-4 py-2 ${
                                isAgentLine
                                  ? "bg-custom-purple/10 text-black border border-custom-purple/10"
                                  : isUserLine
                                    ? "bg-black/5 text-black"
                                    : "bg-white border border-black/10"
                              }`}
                            >
                              <div className="text-xs font-bold mb-1 opacity-70 font-primary">
                                {speaker}
                              </div>
                              <div className="text-sm font-primary">
                                {content}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Default display for lines without a clear speaker
                      return (
                        <div
                          key={index}
                          className="text-sm text-black/70 px-2 animate-fade-in font-primary"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {line}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-black/50 font-primary">
                  No transcript available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add keyframe animations to CSS
const CampaignAnalytics: React.FC = () => {
  // Apply global styles for animations
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fade-in {
        0% { opacity: 0; transform: translateY(8px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes slide-in-right {
        0% { transform: translateX(100%); }
        100% { transform: translateX(0); }
      }
      @keyframes pulse-subtle {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }
      .animate-fade-in {
        animation: fade-in 0.4s ease-out forwards;
      }
      .animate-slide-in-right {
        animation: slide-in-right 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
      }
      .animate-pulse-subtle {
        animation: pulse-subtle 2s ease-in-out infinite;
      }
      .animate-float {
        animation: float 3s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const {
    campaignTitle,
    loading: campaignLoading,
    error,
    stats,
  } = useCampaignData(id);
  const {
    callLogs,
    loading: logsLoading,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalRecords,
    toggleSortDirection,
    sortDirection,
    disconnectionReasonData,
    sentimentData,
  } = usePaginatedCallLogs(id);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);
  const analysisAbortController = useRef<AbortController | null>(null);
  const [shouldStopAnalysis, setShouldStopAnalysis] = useState(false);

  // Fixed version of the handleAnalyze function

  const handleAnalyze = async () => {
    if (!id) return;
    setIsAnalyzing(true);
    setAnalyzingProgress(0);
    setShouldStopAnalysis(false);
    analysisAbortController.current = new AbortController();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      // Directly query for unanalyzed calls with proper condition
      // A call needs analysis if disconnection_reason is NULL OR empty string
      const { data: logsToAnalyze, error } = await supabase
        .from("call_logs")
        .select("*")
        .eq("campaignId", id)
        .or('disconnection_reason.is.null,disconnection_reason.eq.""'); // Either NULL or empty string

      if (error) {
        throw error;
      }

      console.log(
        `Found ${logsToAnalyze?.length || 0} calls that need analysis`,
      );

      if (!logsToAnalyze || logsToAnalyze.length === 0) {
        alert("No calls to analyze!");
        setIsAnalyzing(false);
        return;
      }

      const retellApiKey = await getUserRetellApiKey(user.id);
      if (!retellApiKey) throw new Error("Retell API key not found");

      let processedCount = 0;
      const batchSize = 10;

      for (let i = 0; i < logsToAnalyze.length; i += batchSize) {
        if (shouldStopAnalysis) {
          console.log("Analysis stopped by user");
          break;
        }

        const batch = logsToAnalyze.slice(i, i + batchSize);
        console.log(
          `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(logsToAnalyze.length / batchSize)}, ${batch.length} calls`,
        );

        const batchPromises = batch.map(async (log) => {
          try {
            console.log(`Analyzing call ID: ${log.callId}`);

            const response = await axios.get(
              `https://api.retellai.com/v2/get-call/${log.callId}`,
              {
                headers: {
                  Authorization: `Bearer ${retellApiKey}`,
                },
                signal: analysisAbortController.current?.signal,
              },
            );

            console.log(
              `Got response for call ${log.callId}, disconnection_reason: ${response.data.disconnection_reason || "None"}`,
            );

            // Validate timestamps before calculating duration and creating Date objects
            const startTimestamp = Number(response.data.start_timestamp);
            const endTimestamp = Number(response.data.end_timestamp);

            const isValidTimestamp = (timestamp: number) => {
              return !isNaN(timestamp) && isFinite(timestamp) && timestamp > 0;
            };

            const callDuration =
              isValidTimestamp(startTimestamp) && isValidTimestamp(endTimestamp)
                ? (endTimestamp - startTimestamp) / 1000.0
                : null;

            // Prepare update with explicit non-null disconnection_reason
            const updateData = {
              disconnection_reason:
                response.data.disconnection_reason || "unknown", // Ensure this is never empty
              call_transcript: response.data.transcript || "",
              call_summary: response.data.call_analysis?.call_summary || "",
              call_recording: response.data.recording_url || "",
              start_time: isValidTimestamp(startTimestamp)
                ? new Date(startTimestamp).toISOString()
                : null,
              end_time: isValidTimestamp(endTimestamp)
                ? new Date(endTimestamp).toISOString()
                : null,
              call_duration: callDuration,
              user_sentiment: response.data.call_analysis?.user_sentiment || "",
              call_direction: response.data.direction || "",
            };

            console.log(`Updating call log ${log.id} with data:`, updateData);

            const { error: updateError } = await supabase
              .from("call_logs")
              .update(updateData)
              .eq("id", log.id);

            if (updateError) {
              console.error(`Error updating call log ${log.id}:`, updateError);
              throw updateError;
            }

            console.log(`Successfully updated call log ${log.id}`);
          } catch (error) {
            if (error.name === "AbortError") {
              console.log(`Analysis of call ${log.callId} aborted`);
              throw error;
            }
            console.error(`Error analyzing call ${log.callId}:`, error);
          }
        });

        try {
          await Promise.all(batchPromises);
          processedCount += batch.length;
          const progress = Math.round(
            (processedCount / logsToAnalyze.length) * 100,
          );
          setAnalyzingProgress(progress);
          console.log(
            `Completed ${processedCount}/${logsToAnalyze.length} calls (${progress}%)`,
          );
        } catch (batchError) {
          if (batchError.name === "AbortError") {
            throw batchError;
          }
          console.error("Error processing batch:", batchError);
        }

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log("Analysis completed successfully");
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Analysis aborted by user");
      } else {
        console.error("Error during analysis:", err);
        alert("An error occurred during analysis. Please try again.");
      }
    } finally {
      setIsAnalyzing(false);
      setAnalyzingProgress(0);
      setShouldStopAnalysis(false);
      analysisAbortController.current = null;
    }
  };

  const handleStopAnalysis = () => {
    setShouldStopAnalysis(true);
    if (analysisAbortController.current) {
      analysisAbortController.current.abort();
    }
  };

  if (campaignLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-secondary">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-custom-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-black/70 font-bold font-primary">
            Loading campaign data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-secondary">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md border border-black/5">
          <div className="text-custom-primary mb-4">
            <Error sx={{ fontSize: 48 }} className="mx-auto" />
          </div>
          <p className="text-black font-bold text-xl mb-2 font-primary">
            Error Loading Data
          </p>
          <p className="text-black/70 mb-6 font-primary">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-black hover:bg-black/90 text-white rounded-lg transition-colors duration-200 font-primary font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const {
    totalCalls,
    analyzedCalls,
    hitCalls,
    unansweredCalls,
    averageCallDuration,
  } = stats;

  return (
    <div className="min-h-screen bg-secondary text-black font-primary">
      {/* Fixed Header/Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-black/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-3 p-2 rounded-full hover:bg-black/5 transition-colors duration-200 group"
              >
                <ArrowBack
                  sx={{ fontSize: 20 }}
                  className="text-black/60 group-hover:text-black group-hover:-translate-x-1 transition-all duration-200"
                />
              </button>
              <div>
                <h1 className="text-xl font-bold text-black flex items-center font-primary">
                  {campaignTitle}
                  {isAnalyzing && (
                    <span className="ml-3 text-xs bg-custom-primary/10 text-black px-2 py-1 rounded-full animate-pulse flex items-center">
                      <RotateRight
                        sx={{ fontSize: 14 }}
                        className="mr-1 animate-spin"
                      />
                      Analyzing...
                    </span>
                  )}
                </h1>
                <p className="text-sm text-black/60 font-primary">
                  Campaign Analytics Dashboard
                </p>
              </div>
            </div>

            {analyzedCalls < totalCalls && (
              <div className="flex items-center space-x-3">
                {isAnalyzing ? (
                  <>
                    <div className="flex items-center">
                      <ProgressRing
                        progress={analyzingProgress}
                        size={40}
                        strokeWidth={4}
                        color="#ca061b"
                      >
                        <span className="text-xs font-bold font-primary">
                          {analyzingProgress}%
                        </span>
                      </ProgressRing>
                      <div className="ml-3">
                        <p className="text-xs text-black/50 font-primary font-bold">
                          Processing batch
                        </p>
                        <p className="text-sm font-bold font-primary">
                          {analyzedCalls} / {totalCalls} calls
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleStopAnalysis}
                      className="px-4 py-2 bg-custom-primary/10 text-black rounded-lg hover:bg-custom-primary/20 transition-all duration-200 font-bold text-sm border border-custom-primary/20 font-primary"
                    >
                      <Close sx={{ fontSize: 16 }} className="inline mr-1" />
                      Stop
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleAnalyze}
                    className="px-4 py-2 bg-custom-primary text-white rounded-lg hover:bg-custom-primary/90 transition-all duration-200 font-bold shadow-sm hover:shadow flex items-center font-primary"
                  >
                    <span>Analyze Remaining Calls</span>
                    <span className="ml-2 bg-white/20 px-2 py-0.5 rounded text-xs">
                      {totalCalls - analyzedCalls} left
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-8">
        {/* Analytics Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-black font-primary">
              Analytics Overview
            </h2>
            <div className="text-sm bg-black/5 text-black px-3 py-1 rounded-full border border-black/10 font-bold font-primary">
              {analyzedCalls} of {totalCalls} calls analyzed (
              {totalCalls > 0
                ? Math.round((analyzedCalls / totalCalls) * 100)
                : 0}
              %)
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Phone sx={{ fontSize: 20 }} />,
                value: totalCalls,
                label: "Total Calls",
                color: "bg-custom-primary",
                delay: 0,
              },
              {
                icon: <Adjust sx={{ fontSize: 20 }} />,
                value: hitCalls,
                secondaryValue:
                  totalCalls > 0
                    ? `${((hitCalls / totalCalls) * 100).toFixed(1)}%`
                    : "0%",
                label: "Connected Calls",
                color: "bg-custom-purple",
                delay: 100,
              },
              {
                icon: <PhoneDisabled sx={{ fontSize: 20 }} />,
                value: unansweredCalls,
                secondaryValue:
                  totalCalls > 0
                    ? `${((unansweredCalls / totalCalls) * 100).toFixed(1)}%`
                    : "0%",
                label: "Unanswered Calls",
                color: "bg-custom-orange",
                delay: 200,
              },
              {
                icon: <AccessTime sx={{ fontSize: 20 }} />,
                value: `${averageCallDuration.toFixed(1)}`,
                secondaryValue: "seconds",
                label: "Avg. Call Duration",
                color: "bg-custom-yellow",
                delay: 300,
              },
            ].map((card, index) => (
              <div
                key={index}
                className="animate-fade-in"
                style={{ animationDelay: `${card.delay}ms` }}
              >
                <StatCard
                  icon={card.icon}
                  value={card.value}
                  secondaryValue={card.secondaryValue}
                  label={card.label}
                  color={card.color}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
            <EnhancedPieChart
              data={disconnectionReasonData}
              title="Call Disconnection Reasons"
              icon={
                <PieChartOutlined
                  sx={{ fontSize: 20 }}
                  className="text-custom-purple"
                />
              }
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
            <EnhancedPieChart
              data={sentimentData}
              title="User Sentiment Analysis"
              icon={
                <BarChartOutlined
                  sx={{ fontSize: 20 }}
                  className="text-custom-orange"
                />
              }
              colors={["#f9a901", "#ca061b", "#5f007d", "#000000"]} // Yellow, Primary, Purple, Black
            />
          </div>
        </div>

        {/* Call Logs Table with Server-Side Pagination */}
        <div className="mb-8">
          <CallLogTable
            callLogs={callLogs}
            loading={logsLoading}
            onRowClick={setSelectedCallLog}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalPages={totalPages}
            totalRecords={totalRecords}
            toggleSortDirection={toggleSortDirection}
            sortDirection={sortDirection}
          />
        </div>
      </div>

      {/* Call Details Modal */}
      {selectedCallLog && (
        <CallDetailsModal
          callLog={selectedCallLog}
          onClose={() => setSelectedCallLog(null)}
        />
      )}
    </div>
  );
};

export default CampaignAnalytics;
