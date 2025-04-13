import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase, RealtimeChannel } from '../utils/supabaseClient';
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
} from 'recharts';
import { getCallLogs, CallLog, getCampaign, getUserRetellApiKey } from '../utils/db';
import {
  ArrowLeft,
  PhoneCall,
  Clock,
  Target,
  PhoneOff,
  X,
  PieChart as PieChartIcon,
  ArrowDown,
  ArrowUp,
  Download,
  Volume2,
  Copy,
  Play,
  Pause,
  CheckCircle,
  Loader2,
  ChevronLeft,
  FileText,
  BarChart2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const useCampaignData = (id: string | undefined) => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCalls: 0,
    analyzedCalls: 0,
    hitCalls: 0,
    unansweredCalls: 0,
    averageCallDuration: 0
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
          setCampaignTitle(campaign?.title || 'Campaign');
          
          const { data: logs } = await supabase
            .from('call_logs')
            .select('*')
            .eq('campaignId', id);
            
          setCallLogs(logs || []);
          updateStats(logs || []);

          // Setup real-time subscription for call logs
          const callLogsChannel = supabase
            .channel(`call-logs-${id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'call_logs',
                filter: `campaignId=eq.${id}`,
              },
              async (payload) => {
                // Fetch updated logs
                const { data: updatedLogs } = await supabase
                  .from('call_logs')
                  .select('*')
                  .eq('campaignId', id);
                
                if (updatedLogs) {
                  setCallLogs(updatedLogs);
                  updateStats(updatedLogs);
                }
              }
            )
            .subscribe();

          channelRef.current = callLogsChannel;
          setIsInitialLoad(false);

        } catch (err) {
          console.error('Error fetching data:', err);
          setError('Failed to load campaign data. Please try again.');
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

  const updateStats = (logs: CallLog[]) => {
    const totalCalls = logs.length;
    const analyzedCalls = logs.filter(log => log.disconnection_reason || log.call_transcript).length;
    const hitCalls = logs.filter(log => 
      ["agent_hangup", "user_hangup", "call_transfer"].includes(log.disconnection_reason || '')
    ).length;
    
    const totalDuration = logs.reduce((sum, log) => sum + (log.call_duration || 0), 0);
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    setStats({
      totalCalls,
      analyzedCalls,
      hitCalls,
      unansweredCalls: totalCalls - hitCalls,
      averageCallDuration: avgDuration
    });
  };

  return {
    callLogs, 
    setCallLogs,
    campaignTitle, 
    loading, 
    error, 
    stats
  };
};

const COLORS = [
  "#ca061b",  // Primary red
  "#ff5900",  // Orange
  "#f9a901",  // Yellow
  "#5c5dd6",  // Blue
  "#11b1a1",  // Green
  "#6366f1",  // Indigo
  "#ec4899",  // Pink
  "#8b5cf6",  // Purple
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
  gradient: string;
  secondaryValue?: string;
}> = ({ icon, value, label, color, gradient, secondaryValue }) => (
  <div className="relative overflow-hidden group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col h-full">
    {/* Subtle gradient background that appears on hover */}
    <div className={`absolute inset-0 bg-gradient-to-b ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
    
    <div className="p-6 flex flex-col h-full relative z-10">
      <div className="flex items-center mb-1">
        <div className={`flex items-center justify-center p-3 ${color} bg-opacity-10 rounded-lg mr-3 group-hover:scale-105 transition-all duration-300 ease-out`}>
          {icon}
        </div>
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
      </div>
      
      <div className="mt-auto">
        <div className="flex items-baseline">
          <span className="text-3xl font-bold text-gray-800 tracking-tight mr-2 group-hover:translate-y-0 translate-y-0 transition-all duration-300">
            {value}
          </span>
          {secondaryValue && (
            <span className="text-sm text-gray-500 font-normal">
              {secondaryValue}
            </span>
          )}
        </div>
        
        {/* Subtle animated line on hover */}
        <div className="h-0.5 w-0 group-hover:w-full transition-all duration-500 mt-2 rounded-full bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
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
    <div className={`bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-500 h-full overflow-hidden flex flex-col transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
      <div className="p-6 pb-0">
        <div className="flex items-center mb-4">
          <div className="text-gray-800 mr-3 transform transition-transform duration-300 hover:scale-110">
            {icon}
          </div>
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        </div>
      </div>
      
      <div className="flex-grow p-4">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <PieChart>
            <defs>
              {colors.map((color, index) => (
                <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.8} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
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
                  fill={`url(#colorGradient-${index % colors.length})`}
                  stroke="none" 
                  className="transition-all duration-300"
                  style={{
                    filter: activeIndex === index 
                      ? 'drop-shadow(0px 6px 12px rgba(0,0,0,0.15))' 
                      : 'drop-shadow(0px 2px 3px rgba(0,0,0,0.05))',
                    transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    transformBox: 'fill-box',
                    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease'
                  }}
                />
              ))}
            </Pie>
            <Legend 
              verticalAlign="bottom"
              layout="horizontal"
              iconType="circle"
              iconSize={10}
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value, entry: any, index) => (
                <span className="text-sm text-gray-700 font-medium group transition-all duration-300 inline-flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${activeIndex === index ? 'scale-150' : ''} transition-transform duration-300`} 
                    style={{ backgroundColor: colors[index % colors.length] }} />
                  {value} ({((entry.payload.value / total) * 100).toFixed(1)}%)
                </span>
              )}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-black/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-xl border border-white/10 animate-fade-in">
                      <p className="text-white font-semibold mb-1">{payload[0].name}</p>
                      <p className="text-white/80 text-sm">
                        <span className="font-medium">{payload[0].value}</span> calls 
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
      </div>
    </div>
  );
};

// Call logs table with enhanced styling
const CallLogTable: React.FC<{
  callLogs: CallLog[];
  onRowClick: (log: CallLog) => void;
}> = ({ callLogs, onRowClick }) => {
  const [sortedLogs, setSortedLogs] = useState<CallLog[]>(callLogs);
  const [sortConfig, setSortConfig] = useState<{
    key: 'call_duration';
    direction: 'asc' | 'desc' | null;
  }>({ key: 'call_duration', direction: null });

  useEffect(() => {
    setSortedLogs(callLogs);
  }, [callLogs]);

  const handleSort = () => {
    let direction: 'asc' | 'desc' | null = 'asc';
    
    if (sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.direction === 'desc') {
      direction = null;
    }

    setSortConfig({ key: 'call_duration', direction });

    let sortedData = [...sortedLogs];
    if (direction === null) {
      setSortedLogs(callLogs);
    } else {
      sortedData.sort((a, b) => {
        const aValue = a.call_duration || 0;
        const bValue = b.call_duration || 0;
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      });
      setSortedLogs(sortedData);
    }
  };

  const handleExport = () => {
    const exportData = sortedLogs.map(log => ({
      'Phone Number': log.phoneNumber,
      'First Name': log.firstName,
      'Call ID': log.callId,
      'Disconnection Reason': log.disconnection_reason || 'N/A',
      'Duration (sec)': log.call_duration?.toFixed(2),
      'Sentiment': log.user_sentiment,
      'Start Time': log.start_time,
      'Call Summary': log.call_summary,
      'Call Transcript': log.call_transcript,
      'Call Recording URL': log.call_recording,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Call Logs');
    const fileName = `call_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Function to get row classes based on sentiment
  const getRowClasses = (log: CallLog) => {
    let baseClasses = "transition-colors duration-150 cursor-pointer";
    
    if (!log.user_sentiment || !log.disconnection_reason) {
      return `${baseClasses} hover:bg-gray-50`;
    }
    
    if (log.user_sentiment === "Positive") {
      return `${baseClasses} hover:bg-green-50/70 border-l-4 border-green-400`;
    } else if (log.user_sentiment === "Negative") {
      return `${baseClasses} hover:bg-red-50/70 border-l-4 border-red-400`;
    } else if (log.user_sentiment === "Neutral") {
      return `${baseClasses} hover:bg-blue-50/70 border-l-4 border-blue-400`;
    }
    
    return `${baseClasses} hover:bg-gray-50`;
  };

  // Function to determine badge styles based on type
  const getBadgeStyle = (type: string, field: 'sentiment' | 'status' | 'disconnection') => {
    const baseClasses = "px-2 py-1 text-xs rounded-full inline-flex items-center justify-center font-medium";
    
    if (field === 'sentiment') {
      switch (type) {
        case "Positive": return `${baseClasses} bg-green-50 text-green-700 border border-green-200`;
        case "Negative": return `${baseClasses} bg-red-50 text-red-700 border border-red-200`;
        case "Neutral": return `${baseClasses} bg-blue-50 text-blue-700 border border-blue-200`;
        default: return `${baseClasses} bg-gray-50 text-gray-700 border border-gray-200`;
      }
    }
    
    if (field === 'status') {
      if (type === "true" || type === "Successful") {
        return `${baseClasses} bg-green-50 text-green-700 border border-green-200`;
      }
      return `${baseClasses} bg-red-50 text-red-700 border border-red-200`;
    }
    
    // Disconnection reason styling
    switch (type) {
      case "agent_hangup": return `${baseClasses} bg-purple-50 text-purple-700 border border-purple-200`;
      case "user_hangup": return `${baseClasses} bg-blue-50 text-blue-700 border border-blue-200`;
      case "call_transfer": return `${baseClasses} bg-emerald-50 text-emerald-700 border border-emerald-200`;
      default: return `${baseClasses} bg-gray-50 text-gray-700 border border-gray-200`;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-6 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center">
          <FileText className="text-gray-500 w-5 h-5 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">Call Logs</h2>
          <div className="ml-3 px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-600">
            {sortedLogs.length} {sortedLogs.length === 1 ? 'record' : 'records'}
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors duration-200 font-medium text-sm border border-emerald-200"
        >
          <Download size={16} className="mr-2" />
          Export to Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Phone Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                First Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Call ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Disconnection Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <button
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors duration-200"
                  onClick={handleSort}
                >
                  <span>Duration</span>
                  <span className="flex flex-col">
                    <ArrowUp
                      size={10}
                      className={`${
                        sortConfig.direction === 'asc'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}
                    />
                    <ArrowDown
                      size={10}
                      className={`${
                        sortConfig.direction === 'desc'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}
                    />
                  </span>
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Sentiment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No call logs available
                </td>
              </tr>
            ) : (
              sortedLogs.map((log, index) => (
                <tr
                  key={log.id || index}
                  onClick={() => onRowClick(log)}
                  className={getRowClasses(log)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.phoneNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {log.firstName || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {log.callId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getBadgeStyle(log.disconnection_reason || 'unknown', 'disconnection')}>
                      {log.disconnection_reason
                        ? log.disconnection_reason.replace(/_/g, ' ')
                        : 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className={`font-semibold ${log.call_duration ? 'text-gray-900' : 'text-gray-400'}`}>
                      {log.call_duration ? `${log.call_duration.toFixed(2)} sec` : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getBadgeStyle(log.user_sentiment || 'unknown', 'sentiment')}>
                      {log.user_sentiment || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
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
      case "Positive": return "text-green-600";
      case "Negative": return "text-red-600";
      case "Neutral": return "text-blue-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={onClose}
              className="group p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              <ChevronLeft size={20} className="text-gray-500 group-hover:text-gray-800" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">Call Details</h2>
            <div className="w-8"></div> {/* Spacer for alignment */}
          </div>
        </div>

        <div className="p-6">
          {/* Call Recording Player */}
          {callLog.call_recording && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <audio
                ref={audioRef}
                src={callLog.call_recording}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePlayPause}
                  className={`p-2 rounded-full ${isPlaying ? 'bg-gray-200' : 'bg-blue-600 text-white'}`}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-100"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
                <div className="relative">
                  <button
                    className="p-2 rounded-full hover:bg-gray-200 text-gray-600"
                    onMouseEnter={() => setIsVolumeHovered(true)}
                    onMouseLeave={() => setIsVolumeHovered(false)}
                  >
                    <Volume2 size={18} />
                  </button>
                  {isVolumeHovered && (
                    <div className="absolute bottom-full right-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
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
          <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
            <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-2">
              Call Summary
            </h3>
            <p className="text-sm text-gray-700">
              {callLog.call_summary || "No summary available"}
            </p>
          </div>

          {/* Call Metadata */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: "Call ID", value: callLog.callId },
              { label: "Phone Number", value: callLog.phoneNumber },
              { label: "First Name", value: callLog.firstName || "—" },
              { 
                label: "Duration", 
                value: callLog.call_duration ? `${callLog.call_duration.toFixed(2)} sec` : "—" 
              },
              { 
                label: "Start Time", 
                value: formatTimestamp(callLog.start_time)
              },
              { 
                label: "Call Direction", 
                value: callLog.call_direction || "—" 
              },
            ].map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className="text-sm font-medium text-gray-800 truncate">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Call Analysis */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
              Call Analysis
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                <div className="text-xs text-gray-500 mb-1">Disconnection</div>
                <div className="text-sm font-medium text-gray-800">
                  {callLog.disconnection_reason 
                    ? callLog.disconnection_reason.replace(/_/g, ' ')
                    : "Unknown"
                  }
                </div>
              </div>
              <div className={`bg-gray-50 rounded-lg p-3 border-l-4 ${callLog.user_sentiment === 'Positive' ? 'border-green-500' : callLog.user_sentiment === 'Negative' ? 'border-red-500' : 'border-blue-500'}`}>
                <div className="text-xs text-gray-500 mb-1">User Sentiment</div>
                <div className={`text-sm font-medium ${getSentimentColor(callLog.user_sentiment)}`}>
                  {callLog.user_sentiment || "Unknown"}
                </div>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Transcript
              </h3>
              <button
                onClick={() => {
                  if (callLog.call_transcript) {
                    navigator.clipboard.writeText(callLog.call_transcript);
                  }
                }}
                className="flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <Copy size={14} className="mr-1" />
                Copy
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto">
              {callLog.call_transcript ? (
                <div className="space-y-3">
                  {callLog.call_transcript.split('\n').filter(line => line.trim()).map((line, index) => {
                    // Try to detect if line is from Agent or User based on common patterns
                    const isAgentLine = line.match(/^agent|^assistant|^ai:/i);
                    const isUserLine = line.match(/^user|^customer|^caller:/i);
                    
                    // Extract speaker if detected
                    let speaker = '';
                    let content = line;
                    
                    if (isAgentLine || isUserLine) {
                      const parts = line.split(':', 2);
                      if (parts.length > 1) {
                        speaker = parts[0];
                        content = parts[1].trim();
                      }
                    } else if (line.includes(':')) {
                      // Try to extract speaker from other formats
                      const parts = line.split(':', 2);
                      if (parts[0].length < 20 && !parts[0].includes(' ')) {
                        speaker = parts[0];
                        content = parts[1].trim();
                      }
                    }
                    
                    if (speaker) {
                      return (
                        <div key={index} className={`flex ${isUserLine ? 'justify-end' : ''} animate-fade-in`} style={{ animationDelay: `${index * 50}ms` }}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                            isAgentLine ? 'bg-blue-50 text-blue-800 border border-blue-100' : 
                            isUserLine ? 'bg-gray-100 text-gray-800' : 'bg-white border border-gray-200'
                          }`}>
                            <div className="text-xs font-semibold mb-1 opacity-70">
                              {speaker}
                            </div>
                            <div className="text-sm">
                              {content}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Default display for lines without a clear speaker
                    return (
                      <div key={index} className="text-sm text-gray-700 px-2 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                        {line}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
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
    const style = document.createElement('style');
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
    callLogs, 
    setCallLogs,
    campaignTitle, 
    loading, 
    error, 
    stats
  } = useCampaignData(id);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);
  const analysisAbortController = useRef<AbortController | null>(null);
  const [shouldStopAnalysis, setShouldStopAnalysis] = useState(false);

  const handleAnalyze = async () => {
    if (!id) return;
    setIsAnalyzing(true);
    setAnalyzingProgress(0);
    setShouldStopAnalysis(false);
    analysisAbortController.current = new AbortController();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      // Get unanalyzed calls
      const { data: unanalyzedLogs } = await supabase
        .from('call_logs')
        .select('*')
        .eq('campaignId', id);

      // Filter logs that haven't been analyzed yet
      const logsToAnalyze = unanalyzedLogs?.filter(log => 
        !log.disconnection_reason && !log.call_transcript
      ) || [];

      if (!logsToAnalyze.length) {
        alert('No calls to analyze!');
        setIsAnalyzing(false);
        return;
      }

      const retellApiKey = await getUserRetellApiKey(user.id);
      if (!retellApiKey) throw new Error('Retell API key not found');

      let processedCount = 0;
      const batchSize = 10;
      
      for (let i = 0; i < logsToAnalyze.length; i += batchSize) {
        if (shouldStopAnalysis) {
          console.log('Analysis stopped by user');
          break;
        }

        const batch = logsToAnalyze.slice(i, i + batchSize);
        const batchPromises = batch.map(async (log) => {
          try {
            const response = await axios.get(
              `https://api.retellai.com/v2/get-call/${log.callId}`,
              {
                headers: {
                  Authorization: `Bearer ${retellApiKey}`,
                },
                signal: analysisAbortController.current?.signal,
              }
            );

            // Validate timestamps before calculating duration and creating Date objects
            const startTimestamp = Number(response.data.start_timestamp);
            const endTimestamp = Number(response.data.end_timestamp);
            
            const isValidTimestamp = (timestamp: number) => {
              return !isNaN(timestamp) && isFinite(timestamp) && timestamp > 0;
            };

            const callDuration = isValidTimestamp(startTimestamp) && isValidTimestamp(endTimestamp)
              ? (endTimestamp - startTimestamp) / 1000.0
              : null;

            await supabase
              .from('call_logs')
              .update({
                disconnection_reason: response.data.disconnection_reason || '',
                call_transcript: response.data.transcript || '',
                call_summary: response.data.call_analysis?.call_summary || '',
                call_recording: response.data.recording_url || '',
                start_time: isValidTimestamp(startTimestamp) 
                  ? new Date(startTimestamp).toISOString()
                  : null,
                end_time: isValidTimestamp(endTimestamp)
                  ? new Date(endTimestamp).toISOString()
                  : null,
                call_duration: callDuration,
                user_sentiment: response.data.call_analysis?.user_sentiment,
                call_direction: response.data.direction,
              })
              .eq('id', log.id);

          } catch (error) {
            if (error.name === 'AbortError') {
              throw error;
            }
            console.error(`Error analyzing call ${log.callId}:`, error);
          }
        });

        await Promise.all(batchPromises);
        processedCount += batch.length;
        setAnalyzingProgress(Math.round((processedCount / logsToAnalyze.length) * 100));

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Refresh the data without page reload
      const { data: updatedLogs } = await supabase
        .from('call_logs')
        .select('*')
        .eq('campaignId', id)
        .order('id', { ascending: false });

      setCallLogs(updatedLogs || []);

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Analysis aborted');
      } else {
        console.error('Error analyzing calls:', err);
        alert('An error occurred during analysis. Please try again.');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Loading campaign data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <div className="text-red-500 mb-4">
            <AlertTriangle size={48} className="mx-auto" />
          </div>
          <p className="text-red-600 font-semibold text-xl mb-2">Error Loading Data</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors duration-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { totalCalls, analyzedCalls, hitCalls, unansweredCalls, averageCallDuration } = stats;

  // Data preparation for pie charts
  const disconnectionReasonData = callLogs.reduce(
    (acc, log) => {
      const reason = log.disconnection_reason || "Unknown";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const disconnectionReasonChartData = Object.entries(
    disconnectionReasonData
  ).map(([name, value]) => ({ 
    name: name === 'Unknown' ? name : name.replace(/_/g, ' '), 
    value 
  }));

  const sentimentData = callLogs.reduce(
    (acc, log) => {
      const sentiment = log.user_sentiment || "Unknown";
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sentimentChartData = Object.entries(sentimentData).map(
    ([name, value]) => ({ name, value })
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-800">
      {/* Fixed Header/Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 group"
              >
                <ArrowLeft size={20} className="text-gray-500 group-hover:text-gray-800 group-hover:-translate-x-1 transition-all duration-200" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center">
                  {campaignTitle}
                  {isAnalyzing && (
                    <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full animate-pulse flex items-center">
                      <Loader2 size={14} className="mr-1 animate-spin" />
                      Analyzing...
                    </span>
                  )}
                </h1>
                <p className="text-sm text-gray-500">Campaign Analytics Dashboard</p>
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
                        color="#3b82f6"
                      >
                        <span className="text-xs font-semibold">{analyzingProgress}%</span>
                      </ProgressRing>
                      <div className="ml-3">
                        <p className="text-xs text-gray-500">Processing batch</p>
                        <p className="text-sm font-medium">{analyzedCalls} / {totalCalls} calls</p>
                      </div>
                    </div>
                    <button
                      onClick={handleStopAnalysis}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200 font-medium text-sm border border-red-200"
                    >
                      <X size={16} className="inline mr-1" />
                      Stop
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleAnalyze}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-sm hover:shadow flex items-center"
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Analytics Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Analytics Overview</h2>
            <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
              {analyzedCalls} of {totalCalls} calls analyzed ({Math.round((analyzedCalls / totalCalls) * 100)}%)
            </div>
          </div>
          
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <PhoneCall size={24} className="text-[#ca061b]" />,
                value: totalCalls,
                label: "Total Calls",
                color: "bg-[#ca061b]",
                gradient: "from-[#ca061b]/5 to-[#ca061b]/10",
                delay: 0
              },
              {
                icon: <Target size={24} className="text-[#5c5dd6]" />,
                value: hitCalls,
                secondaryValue: `${((hitCalls / totalCalls) * 100).toFixed(1)}%`,
                label: "Connected Calls",
                color: "bg-[#5c5dd6]",
                gradient: "from-[#5c5dd6]/5 to-[#5c5dd6]/10",
                delay: 100
              },
              {
                icon: <PhoneOff size={24} className="text-[#ff5900]" />,
                value: unansweredCalls,
                secondaryValue: `${((unansweredCalls / totalCalls) * 100).toFixed(1)}%`,
                label: "Unanswered Calls",
                color: "bg-[#ff5900]",
                gradient: "from-[#ff5900]/5 to-[#ff5900]/10",
                delay: 200
              },
              {
                icon: <Clock size={24} className="text-[#11b1a1]" />,
                value: `${averageCallDuration.toFixed(1)}`,
                secondaryValue: "seconds",
                label: "Avg. Call Duration",
                color: "bg-[#11b1a1]",
                gradient: "from-[#11b1a1]/5 to-[#11b1a1]/10",
                delay: 300
              }
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
                  gradient={card.gradient}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
            <EnhancedPieChart
              data={disconnectionReasonChartData}
              title="Call Disconnection Reasons"
              icon={<PieChartIcon size={24} className="text-[#5c5dd6]" />}
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <EnhancedPieChart
              data={sentimentChartData}
              title="User Sentiment Analysis"
              icon={<BarChart2 size={24} className="text-[#11b1a1]" />}
              colors={["#10b981", "#ef4444", "#3b82f6", "#6b7280"]} // Green, Red, Blue, Gray
            />
          </div>
        </div>

        {/* Call Logs Table */}
        <div className="mb-8">
          <CallLogTable callLogs={callLogs} onRowClick={setSelectedCallLog} />
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