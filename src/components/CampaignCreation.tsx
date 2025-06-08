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
  Description,
  Person,
  CloudUpload,
  Error,
  PhoneIphone,
  BugReport,
  TableChart,
  CheckBox,
  Phone,
  Info,
  RecordVoiceOver,
} from "@mui/icons-material";
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
  <div className="bg-white p-4 rounded-lg shadow-sm border border-black/5 overflow-x-auto">
    <table className="min-w-full divide-y divide-black/10">
      <thead className="bg-black/[0.02]">
        <tr>
          <th className="px-5 py-3 text-left text-xs font-bold text-black/60 tracking-wider font-primary">
            Phone
          </th>
          <th className="px-5 py-3 text-left text-xs font-bold text-black/60 tracking-wider font-primary">
            Name
          </th>
          <th className="px-5 py-3 text-left text-xs font-bold text-black/60 tracking-wider font-primary">
            Email
          </th>
          <th className="px-5 py-3 text-left text-xs font-bold text-black/60 tracking-wider font-primary">
            Gender
          </th>
          <th className="px-5 py-3 text-left text-xs font-bold text-black/60 tracking-wider font-primary">
            Column_Name
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-black/5">
        <tr>
          <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
            11223344556
          </td>
          <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
            John
          </td>
          <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
            john@mail.com
          </td>
          <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
            Male
          </td>
          <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
            Value1
          </td>
        </tr>
        <tr>
          <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
            12334445678
          </td>
          <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
            Mary
          </td>
          <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
            mary@mail.com
          </td>
          <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
            Female
          </td>
          <td className="px-5 py-3 whitespace-nowrap text-sm text-black/70 font-primary">
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
      <div className="flex justify-center items-center h-screen bg-secondary">
        <div className="w-16 h-16 border-4 border-t-custom-primary border-custom-primary/10 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-10">
          <div className="mb-4 inline-block">
            <div className="flex items-center px-4 py-1.5 bg-custom-primary/10 text-black rounded-full text-xs font-bold tracking-wider border border-custom-primary/20 font-primary">
              <RecordVoiceOver sx={{ fontSize: 16 }} className="mr-2" />
              NEW CAMPAIGN
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-black font-primary">
            Create Campaign
          </h1>
          <p className="text-lg text-black/70 font-primary">
            Set up your new outbound calling campaign
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Campaign Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
            <div className="p-5 border-b border-black/5 bg-black/[0.02]">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-custom-primary/10 rounded-xl flex items-center justify-center">
                  <RecordVoiceOver
                    sx={{ fontSize: 24 }}
                    className="text-black"
                  />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-black font-primary">
                    Campaign Details
                  </h2>
                  <p className="text-sm text-black/70 font-primary">
                    Configure your campaign settings
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-bold text-black mb-2 font-primary"
                  >
                    Campaign Title
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="font-primary w-full px-4 py-3 bg-white border border-black/10 rounded-lg focus:ring-2 focus:ring-black/20 focus:border-black transition-all duration-200"
                      placeholder="Enter a descriptive title for your campaign"
                      required
                    />
                  </div>
                </div>

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
                      <Error
                        sx={{ fontSize: 16 }}
                        className="mr-1 text-custom-orange"
                      />
                      No agents found. Please create an agent first.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-bold text-black mb-2 font-primary"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="font-primary w-full px-4 py-3 bg-white border border-black/10 rounded-lg focus:ring-2 focus:ring-black/20 focus:border-black transition-all duration-200"
                    rows={4}
                    placeholder="Describe the purpose and goals of this campaign"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Phone Configuration Card */}
          <div className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden mt-8">
            <div className="p-5 border-b border-black/5 bg-black/[0.02]">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-custom-purple/10 rounded-xl flex items-center justify-center">
                  <PhoneIphone sx={{ fontSize: 24 }} className="text-black" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-black font-primary">
                    Phone Configuration
                  </h2>
                  <p className="text-sm text-black/70 font-primary">
                    Set up your outbound calling preferences
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
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
                      <Error
                        sx={{ fontSize: 16 }}
                        className="mr-1 text-custom-orange"
                      />
                      No phone numbers available. Please add a phone number
                      first.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Upload Card */}
          <div className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden mt-8">
            <div className="p-5 border-b border-black/5 bg-black/[0.02]">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-custom-orange/10 rounded-xl flex items-center justify-center">
                  <CloudUpload sx={{ fontSize: 24 }} className="text-black" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-black font-primary">
                    Upload Contacts
                  </h2>
                  <p className="text-sm text-black/70 font-primary">
                    Import your contact list from Excel
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <label className="block text-sm font-bold text-black mb-4 font-primary">
                Upload Contacts (Excel file)
              </label>

              <div className="bg-custom-purple/5 border-l-4 border-custom-purple p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info sx={{ fontSize: 20 }} className="text-black" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-bold text-black font-primary">
                      Excel File Requirements:
                    </h3>
                    <div className="mt-2 text-sm text-black/70 font-primary">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          The title of the first column in the file should be
                          "Phone," and the title of the second column should be
                          "Name".
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
                          There should be no spaces in the titles of any
                          columns.
                        </li>
                      </ol>
                      <p className="mt-2 italic">
                        Note: For XLSX files, only the first sheet will be
                        imported.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="flex items-center text-sm font-bold text-black mb-2 font-primary">
                  <TableChart sx={{ fontSize: 16 }} className="mr-2" />
                  Example Excel Format:
                </h4>
                <ExcelFormatExample />
              </div>

              <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  isDragActive
                    ? "border-custom-primary bg-custom-primary/5"
                    : "border-black/20 hover:border-custom-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-black/5 rounded-full flex items-center justify-center">
                    <CloudUpload
                      sx={{ fontSize: 32 }}
                      className={`${
                        isDragActive ? "text-custom-primary" : "text-black/40"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-black font-primary">
                      Drop your Excel file here
                    </p>
                    <p className="text-sm text-black/70 font-primary">
                      or{" "}
                      <span className="text-custom-primary font-bold">
                        browse
                      </span>{" "}
                      to choose a file
                    </p>
                  </div>
                  <p className="text-xs text-black/50 font-primary">
                    Supports: XLSX, XLS (max 10MB)
                  </p>
                </div>
              </div>
              {fileName && (
                <div className="bg-custom-yellow/5 rounded-lg p-4 animate-fade-in border border-custom-yellow/10">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-custom-yellow/10 rounded-lg flex items-center justify-center">
                      <Description
                        sx={{ fontSize: 20 }}
                        className="text-black"
                      />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-bold text-black font-primary">
                        {fileName}
                      </p>
                      <p className="text-xs text-black/70 font-primary">
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
              className="bg-custom-primary/5 rounded-lg p-4 mt-8 animate-fade-in border border-custom-primary/10"
              role="alert"
            >
              <div className="flex items-center">
                <Error sx={{ fontSize: 20 }} className="text-black" />
                <p className="ml-3 text-sm text-black font-primary">{error}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end mt-8">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center px-6 py-3 bg-custom-primary text-white rounded-lg hover:bg-custom-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-primary transition-all duration-200 font-bold shadow-sm hover:shadow transform hover:-translate-y-0.5 font-primary"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white border-2 border-white border-t-transparent rounded-full"></div>
                  Creating Campaign...
                </>
              ) : (
                <>
                  Create Campaign
                  <CheckBox sx={{ fontSize: 20 }} className="ml-2" />
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
