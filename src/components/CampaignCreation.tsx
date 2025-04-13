import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  addCampaign,
  addContacts,
  Campaign,
  Contact,
  getUserRetellApiKey,
} from "../utils/db";
import { fetchAgents, fetchPhoneNumbers } from "../utils/retellApi";
import {
  FileText,
  User,
  Upload,
  AlertCircle,
  SmartphoneCharging,
  Bug,
  Table,
  CheckSquare,
  Phone,
  Info,
  Speech
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../utils/supabaseClient";

interface Agent {
  agent_id: string;
  agent_name: string;
}

interface PhoneNumber {
  phone_number: string;
  phone_number_pretty: string;
  nickname?: string;
}

interface EnhancedContact extends Omit<Contact, "id" | "campaignId"> {
  dynamicVariables?: Record<string, string>;
}

const ExcelFormatExample = () => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
            Phone
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
            Name
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
            Email
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
            Gender
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
            Column_Name
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <tr>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            11223344556
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            John
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            john@mail.com
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            Male
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            Value1
          </td>
        </tr>
        <tr>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            12334445678
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            Mary
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            mary@mail.com
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            Female
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            Value2
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

const CampaignCreation: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [outboundNumber, setOutboundNumber] = useState("");
  const [contacts, setContacts] = useState<EnhancedContact[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [localTouchEnabled, setLocalTouchEnabled] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const validateExcelColumns = (headers: string[]) => {
    // Check if any header contains spaces
    const headerWithSpace = headers.find((header) => header.includes(" "));
    if (headerWithSpace) {
      throw new Error(
        `Column title "${headerWithSpace}" contains spaces. Please remove all spaces from column titles.`,
      );
    }

    // Check if first two columns are Phone and Name
    if (headers[0] !== "Phone" || headers[1] !== "Name") {
      throw new Error(
        'The first column must be titled "Phone" and the second column must be titled "Name".',
      );
    }

    return true;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

          // Get headers and validate them
          const headers = data[0] as string[];
          validateExcelColumns(headers);

          // Process the data rows
          const parsedContacts: EnhancedContact[] = data
            .slice(1)
            .map((row: any) => {
              const contact: EnhancedContact = {
                phoneNumber: row[0]?.toString(),
                firstName: row[1]?.toString(),
                dynamicVariables: {},
              };

              // Add dynamic variables for additional columns
              headers.slice(2).forEach((header, index) => {
                if (row[index + 2] !== undefined) {
                  contact.dynamicVariables![header] =
                    row[index + 2]?.toString();
                }
              });

              return contact;
            })
            .filter((contact) => contact.phoneNumber && contact.firstName);

          setContacts(parsedContacts);
          setError("");
        } catch (err: any) {
          console.error("Error processing Excel file:", err);
          setError(err.message || "Error processing Excel file");
          setContacts([]);
          setFileName("");
        }
      };
      reader.readAsBinaryString(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      if (!localTouchEnabled && !outboundNumber) {
        setError("Please select an outbound number or enable Local Touch");
        return;
      }

      const campaign: Omit<Campaign, "id"> = {
        title,
        description,
        agentId,
        outboundNumber: localTouchEnabled ? null : outboundNumber,
        status: "Scheduled",
        progress: 0,
        hasRun: false,
        userId: user.id,
        localTouchEnabled,
      };

      const campaignId = await addCampaign(campaign);
      await addContacts(
        contacts.map((contact) => ({
          phoneNumber: contact.phoneNumber,
          firstName: contact.firstName,
          campaignId,
          dynamicVariables: contact.dynamicVariables,
        })),
      );

      navigate(`/campaign/${campaignId}`);
    } catch (error) {
      console.error("Error creating campaign:", error);
      setError("Failed to create campaign. Please try again.");
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <div className="inline-block mb-4">
            <div className="flex items-center px-4 py-1.5 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 text-blue-800 rounded-full text-xs font-semibold tracking-wider border border-blue-200">
              <Speech className="w-4 h-4 mr-2 text-blue-600" />
              NEW CAMPAIGN
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gray-900">Create Campaign</h1>
          <p className="text-lg text-gray-600">Set up your new outbound calling campaign</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Campaign Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Speech className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-900">Campaign Details</h2>
                  <p className="text-sm text-gray-600">Configure your campaign settings</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Campaign Title
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter a descriptive title for your campaign"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="agentId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Select Agent <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="agentId"
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 appearance-none"
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
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  {agents.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      No agents found. Please create an agent first.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    rows={4}
                    placeholder="Describe the purpose and goals of this campaign"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Phone Configuration Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                  <SmartphoneCharging className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-900">Phone Configuration</h2>
                  <p className="text-sm text-gray-600">Set up your outbound calling preferences</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start space-x-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Bug className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Smart Local Touch</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="localTouch"
                        type="checkbox"
                        checked={localTouchEnabled}
                        onChange={(e) => setLocalTouchEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Automatically match outbound numbers with contact area codes to increase answer rates
                  </p>
                </div>
              </div>

              {!localTouchEnabled && (
                <div>
                  <label
                    htmlFor="outboundNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Select Outbound Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="outboundNumber"
                      value={outboundNumber}
                      onChange={(e) => setOutboundNumber(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 appearance-none"
                      required={!localTouchEnabled}
                    >
                      <option value="">Choose a phone number</option>
                      {phoneNumbers.map((number) => (
                        <option key={number.phone_number} value={number.phone_number}>
                          {number.nickname
                            ? `${number.phone_number_pretty} (${number.nickname})`
                            : number.phone_number_pretty}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <Phone className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  {phoneNumbers.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      No phone numbers available. Please add a phone number first.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Upload Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-900">Upload Contacts</h2>
                  <p className="text-sm text-gray-600">Import your contact list from Excel</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Upload Contacts (Excel file)
              </label>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Excel File Requirements:
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          The title of the first column in the file should be
                          "Phone," and the title of the second column should be
                          "Name."
                        </li>
                        <li>
                          The first column must contain valid phone numbers in
                          international format, without the plus symbol.
                        </li>
                        <li>
                          Data from any additional columns will be included as
                          dynamic variables in the outbound call.
                        </li>
                        <li>
                          There should be no spaces in the titles of any columns.
                        </li>
                      </ol>
                      <p className="mt-2 italic">
                        Note: For XLSX files, only the first sheet will be imported.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Table className="h-4 w-4 mr-2" />
                  Example Excel Format:
                </h4>
                <ExcelFormatExample />
              </div>

              <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  isDragActive
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-gray-300 hover:border-blue-400"
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <Upload className={`w-8 h-8 ${
                      isDragActive ? "text-blue-500" : "text-gray-400"
                    }`} />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      Drop your Excel file here
                    </p>
                    <p className="text-sm text-gray-500">
                      or <span className="text-blue-500">browse</span> to choose a file
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supports: XLSX, XLS (max 10MB)
                  </p>
                </div>
              </div>
              {fileName && (
                <div className="bg-green-50 rounded-lg p-4 animate-fade-in">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">{fileName}</p>
                      <p className="text-xs text-green-600">
                        {contacts.length} contacts loaded successfully
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div
              className="bg-red-50 rounded-lg p-4 mt-8 animate-fade-in"
              role="alert"
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end mt-8">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 font-medium shadow-sm hover:shadow transform hover:-translate-y-0.5"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Campaign...
                </>
              ) : (
                <>
                  Create Campaign
                  <CheckSquare className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CampaignCreation;