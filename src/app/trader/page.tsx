"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Image as ImageIcon,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type TradeStatus = "ongoing" | "successful" | "failed";

type Trade = {
  id: string;
  trade_name: string;
  invested_amount: number;
  approx_return: number;
  status: TradeStatus;
  trade_date: string;
  notes: string | null;
  trader_id: string | null;
  is_closed?: boolean;
};

type Member = {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  investment_amount: number;
  profit_share: number;
  status: string;
  created_at: string;
};

type TradeMember = {
  id: string;
  trade_id: string;
  member_id: string;
  invested_amount: number;
  created_at: string;
  member?: Member;
};

type TradeFile = {
  id: string;
  trade_id: string;
  category: "agreement" | "receipt" | "payment_proof" | "other";
  file_url: string;
  created_at: string;
};

type TradeLog = {
  id: string;
  trade_id: string;
  description: string;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type TradeForm = {
  trade_name: string;
  invested_amount: string;
  approx_return: string;
  status: TradeStatus;
  trade_date: string;
  notes: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const supabase = createClient();

const TRADE_FILE_BUCKET = "trade-photos";

const TRADE_STATUSES: TradeStatus[] = [
  "ongoing",
  "successful",
  "failed",
];

/* =========================================================
   HELPERS
========================================================= */

function isTradeStatus(value: unknown): value is TradeStatus {
  return (
    value === "ongoing" ||
    value === "successful" ||
    value === "failed"
  );
}

function statusLabel(status: TradeStatus): string {
  if (status === "successful") return "Profit";
  if (status === "failed") return "Invested Money Returned";
  return "Ongoing";
}

function statusDescription(status: TradeStatus): string {
  if (status === "successful") {
    return "Trade generated profit and has been successfully completed.";
  }

  if (status === "failed") {
    return "The invested money has been returned to the participating members.";
  }

  return "Trade is currently active and still in progress.";
}

function statusBadgeFor(status: TradeStatus): React.CSSProperties {
  if (status === "successful") {
    return {
      background: "rgba(52,211,153,0.10)",
      border: "1px solid rgba(52,211,153,0.18)",
      color: "#6ee7b7",
    };
  }

  if (status === "failed") {
    return {
      background: "rgba(251,191,36,0.08)",
      border: "1px solid rgba(251,191,36,0.14)",
      color: "#fcd34d",
    };
  }

  return {
    background: "rgba(96,165,250,0.09)",
    border: "1px solid rgba(96,165,250,0.15)",
    color: "#93c5fd",
  };
}

function money(value: number | null | undefined): string {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function numberValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tradeProfit(trade: Trade): number {
  return Number(trade.approx_return || 0) - Number(trade.invested_amount || 0);
}

function formatDate(value: string): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name: string | null | undefined): string {
  if (!name) return "TB";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function fileCategoryLabel(
  category: TradeFile["category"]
): string {
  if (category === "payment_proof") return "Payment Proof";
  if (category === "agreement") return "Agreement";
  if (category === "receipt") return "Receipt";
  return "Other";
}

function isImageFile(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url);
}

/* =========================================================
   PAGE
========================================================= */

export default function TraderPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [tradeMembers, setTradeMembers] = useState<TradeMember[]>([]);
  const [tradeFiles, setTradeFiles] = useState<TradeFile[]>([]);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [statusTrade, setStatusTrade] = useState<Trade | null>(null);
  const [newStatus, setNewStatus] =
    useState<TradeStatus>("ongoing");

  const [logTrade, setLogTrade] = useState<Trade | null>(null);
  const [fileTrade, setFileTrade] = useState<Trade | null>(null);

  const [logDescription, setLogDescription] = useState("");

  const [fileCategory, setFileCategory] =
    useState<TradeFile["category"]>("agreement");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [tradeForm, setTradeForm] = useState<TradeForm>({
    trade_name: "",
    invested_amount: "",
    approx_return: "",
    status: "ongoing",
    trade_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  /* =======================================================
     DATA LOADING
  ======================================================= */

  const loadMembers = useCallback(async () => {
    const { data, error: membersError } = await supabase
      .from("members")
      .select(
        "id,user_id,full_name,phone,investment_amount,profit_share,status,created_at"
      )
      .order("created_at", { ascending: false });

    if (membersError) {
      throw membersError;
    }

    setMembers((data ?? []) as Member[]);
  }, []);

  const loadTrades = useCallback(async () => {
    setLoadingTrades(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const { data, error: tradesError } = await supabase
        .from("trades")
        .select(
          "id,trade_name,invested_amount,approx_return,status,trade_date,notes,trader_id,is_closed"
        )
        .eq("trader_id", user.id)
        .order("trade_date", { ascending: false });

      if (tradesError) {
        throw tradesError;
      }

      const loadedTrades: Trade[] = (data ?? [])
        .map((item) => ({
          id: String(item.id),
          trade_name: String(item.trade_name ?? ""),
          invested_amount: Number(item.invested_amount ?? 0),
          approx_return: Number(item.approx_return ?? 0),
          status: isTradeStatus(item.status)
            ? item.status
            : "ongoing",
          trade_date: String(item.trade_date ?? ""),
          notes: item.notes ?? null,
          trader_id: item.trader_id ?? null,
          is_closed: Boolean(item.is_closed),
        }))
        .filter((item) => item.id && item.trade_name);

      setTrades(loadedTrades);

      return loadedTrades;
    } finally {
      setLoadingTrades(false);
    }
  }, []);

  const loadSelectedTradeData = useCallback(
    async (tradeId: string) => {
      const [
        tradeMembersResult,
        filesResult,
        logsResult,
      ] = await Promise.all([
        supabase
          .from("trade_members")
          .select(
            "id,trade_id,member_id,invested_amount,created_at"
          )
          .eq("trade_id", tradeId)
          .order("created_at", { ascending: true }),

        supabase
          .from("trade_files")
          .select(
            "id,trade_id,category,file_url,created_at"
          )
          .eq("trade_id", tradeId)
          .order("created_at", { ascending: false }),

        supabase
          .from("trade_logs")
          .select(
            "id,trade_id,description,created_at"
          )
          .eq("trade_id", tradeId)
          .order("created_at", { ascending: false }),
      ]);

      if (tradeMembersResult.error) {
        throw tradeMembersResult.error;
      }

      if (filesResult.error) {
        throw filesResult.error;
      }

      if (logsResult.error) {
        throw logsResult.error;
      }

      const loadedTradeMembers =
        (tradeMembersResult.data ?? []) as TradeMember[];

      const enrichedMembers: TradeMember[] =
        loadedTradeMembers.map((item) => ({
          ...item,
          member: members.find(
            (member) => member.id === item.member_id
          ),
        }));

      setTradeMembers(enrichedMembers);
      setTradeFiles(
        (filesResult.data ?? []) as TradeFile[]
      );
      setTradeLogs(
        (logsResult.data ?? []) as TradeLog[]
      );
    },
    [members]
  );

  useEffect(() => {
    let active = true;

    async function initialise() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        if (!active) return;

        setUserId(user.id);

        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("id,full_name,role")
            .eq("id", user.id)
            .single();

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          throw new Error(
            "Your TradeBishi profile could not be found."
          );
        }

        if (profileData.role !== "trader") {
          setProfile(profileData as Profile);
          return;
        }

        setProfile(profileData as Profile);

        await Promise.all([
          loadMembers(),
          loadTrades(),
        ]);
      } catch (err) {
        console.error("TRADER INITIALISE ERROR:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Trader Dashboard."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialise();

    return () => {
      active = false;
    };
  }, [loadMembers, loadTrades, router]);

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const ongoingTrades = useMemo(
    () => trades.filter((trade) => trade.status === "ongoing"),
    [trades]
  );

  const successfulTrades = useMemo(
    () =>
      trades.filter(
        (trade) => trade.status === "successful"
      ),
    [trades]
  );

  const returnedTrades = useMemo(
    () =>
      trades.filter(
        (trade) => trade.status === "failed"
      ),
    [trades]
  );

  const totalTradeCapital = useMemo(
    () =>
      trades.reduce(
        (total, trade) =>
          total + Number(trade.invested_amount || 0),
        0
      ),
    [trades]
  );

  const ongoingCapital = useMemo(
    () =>
      ongoingTrades.reduce(
        (total, trade) =>
          total + Number(trade.invested_amount || 0),
        0
      ),
    [ongoingTrades]
  );

  const expectedReturn = useMemo(
    () =>
      ongoingTrades.reduce(
        (total, trade) =>
          total + Number(trade.approx_return || 0),
        0
      ),
    [ongoingTrades]
  );

  const expectedProfit = useMemo(
    () =>
      ongoingTrades.reduce(
        (total, trade) =>
          total + tradeProfit(trade),
        0
      ),
    [ongoingTrades]
  );

  const realizedProfit = useMemo(
    () =>
      successfulTrades.reduce(
        (total, trade) =>
          total + tradeProfit(trade),
        0
      ),
    [successfulTrades]
  );

  const filteredTrades = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return trades;

    return trades.filter((trade) => {
      return (
        trade.trade_name.toLowerCase().includes(query) ||
        (trade.notes ?? "")
          .toLowerCase()
          .includes(query) ||
        statusLabel(trade.status)
          .toLowerCase()
          .includes(query)
      );
    });
  }, [search, trades]);

  /* =======================================================
     TRADE DETAILS
  ======================================================= */

  async function openTradeDetails(trade: Trade) {
    try {
      setError("");
      setSelectedTrade(trade);
      setTradeMembers([]);
      setTradeFiles([]);
      setTradeLogs([]);

      await loadSelectedTradeData(trade.id);
    } catch (err) {
      console.error("TRADE DETAILS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load trade details."
      );
    }
  }

  /* =======================================================
     CREATE TRADE
  ======================================================= */

  function openCreateModal() {
    setError("");

    setTradeForm({
      trade_name: "",
      invested_amount: "",
      approx_return: "",
      status: "ongoing",
      trade_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });

    setShowCreateModal(true);
  }

  async function createTrade(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const tradeName = tradeForm.trade_name.trim();
    const investedAmount = numberValue(
      tradeForm.invested_amount
    );
    const approxReturn = numberValue(
      tradeForm.approx_return
    );

    if (!tradeName) {
      setError("Please enter a trade name.");
      return;
    }

    if (investedAmount <= 0) {
      setError(
        "Trade investment must be greater than ₹0."
      );
      return;
    }

    if (approxReturn <= 0) {
      setError(
        "Expected return must be greater than ₹0."
      );
      return;
    }

    if (!userId) {
      setError("Trader account could not be verified.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { data, error: createError } =
        await supabase
          .from("trades")
          .insert({
            trade_name: tradeName,
            invested_amount: investedAmount,
            approx_return: approxReturn,
            status: tradeForm.status,
            trade_date: new Date(
              tradeForm.trade_date
            ).toISOString(),
            notes: tradeForm.notes.trim() || null,
            trader_id: userId,
          })
          .select(
            "id,trade_name,invested_amount,approx_return,status,trade_date,notes,trader_id, is_closed"
          )
          .single();

      if (createError) {
        throw createError;
      }

      if (!data) {
        throw new Error(
          "Trade was not returned after creation."
        );
      }

      const createdTrade: Trade = {
        id: String(data.id),
        trade_name: String(data.trade_name ?? ""),
        invested_amount: Number(
          data.invested_amount ?? 0
        ),
        approx_return: Number(
          data.approx_return ?? 0
        ),
        status: isTradeStatus(data.status)
          ? data.status
          : "ongoing",
        trade_date: String(data.trade_date ?? ""),
        notes: data.notes ?? null,
        trader_id: data.trader_id ?? null,
        is_closed: Boolean(data.is_closed),
      };

      const { error: logError } = await supabase
        .from("trade_logs")
        .insert({
          trade_id: createdTrade.id,
          description: "Trade created and recorded.",
        });

      if (logError) {
        console.warn(
          "TRADE CREATION LOG ERROR:",
          logError
        );
      }

      setTrades((previous) => [
        createdTrade,
        ...previous,
      ]);

      setShowCreateModal(false);

      await openTradeDetails(createdTrade);
    } catch (err) {
      console.error("CREATE TRADE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create trade."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     TRADE STATUS
  ======================================================= */

  function openStatusModal(trade: Trade) {
    setStatusTrade(trade);
    setNewStatus(trade.status);
    setError("");
    setShowStatusModal(true);
  }

  async function updateTradeStatus(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!statusTrade) return;

    if (statusTrade.is_closed) {
      setError("This trade is closed. Only Admin can make further changes.");
      setShowStatusModal(false);
      return;
    }

    const oldStatus = statusTrade.status;

    if (oldStatus === newStatus) {
      setShowStatusModal(false);
      setStatusTrade(null);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { error: updateError } = await supabase
        .from("trades")
        .update({
          status: newStatus,
        })
        .eq("id", statusTrade.id);

      if (updateError) {
        throw updateError;
      }

      const description = `Status changed from ${statusLabel(
        oldStatus
      )} to ${statusLabel(newStatus)}.`;

      const { data: logData, error: logError } =
        await supabase
          .from("trade_logs")
          .insert({
            trade_id: statusTrade.id,
            description,
          })
          .select(
            "id,trade_id,description,created_at"
          )
          .single();

      if (logError) {
        console.warn(
          "STATUS LOG ERROR:",
          logError
        );
      }

      const updatedTrade: Trade = {
        ...statusTrade,
        status: newStatus,
      };

      setTrades((previous) =>
        previous.map((trade) =>
          trade.id === statusTrade.id
            ? updatedTrade
            : trade
        )
      );

      setSelectedTrade((previous) =>
        previous &&
        previous.id === statusTrade.id
          ? updatedTrade
          : previous
      );

      if (logData) {
        setTradeLogs((previous) => [
          logData as TradeLog,
          ...previous,
        ]);
      }

      setShowStatusModal(false);
      setStatusTrade(null);
    } catch (err) {
      console.error(
        "UPDATE TRADE STATUS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update trade status."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     TRADE LOGS
  ======================================================= */

  function openLogModal(trade: Trade) {
    setLogTrade(trade);
    setLogDescription("");
    setError("");
    setShowLogModal(true);
  }

  async function addTradeLog(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!logTrade) return;

    const description = logDescription.trim();

    if (!description) {
      setError("Please enter an update.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { data, error: logError } =
        await supabase
          .from("trade_logs")
          .insert({
            trade_id: logTrade.id,
            description,
          })
          .select(
            "id,trade_id,description,created_at"
          )
          .single();

      if (logError) {
        throw logError;
      }

      if (data) {
        setTradeLogs((previous) => [
          data as TradeLog,
          ...previous,
        ]);
      }

      setShowLogModal(false);
      setLogTrade(null);
      setLogDescription("");

      if (
        selectedTrade &&
        selectedTrade.id === logTrade.id
      ) {
        await loadSelectedTradeData(logTrade.id);
      }
    } catch (err) {
      console.error("ADD TRADE LOG ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add trade update."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     FILE UPLOAD
  ======================================================= */

  function openFileModal(trade: Trade) {
    setFileTrade(trade);
    setFileCategory("agreement");
    setSelectedFile(null);
    setError("");
    setShowFileModal(true);
  }

  async function uploadTradeFile(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!fileTrade) return;

    if (!selectedFile) {
      setError("Please choose a file first.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const originalName = selectedFile.name;
      const safeName = originalName
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");

      const uniqueName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}-${safeName}`;

      const filePath = `${fileTrade.id}/${uniqueName}`;

      const { error: uploadError } =
        await supabase.storage
          .from(TRADE_FILE_BUCKET)
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: false,
          });

      if (uploadError) {
        throw uploadError;
      }

      // Keep the existing database format for compatibility.
      // The bucket is private, so viewing is handled with signed URLs.
      const {
        data: publicUrlData,
      } = supabase.storage
        .from(TRADE_FILE_BUCKET)
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData.publicUrl;

      const { data, error: fileInsertError } =
        await supabase
          .from("trade_files")
          .insert({
            trade_id: fileTrade.id,
            category: fileCategory,
            file_url: fileUrl,
          })
          .select(
            "id,trade_id,category,file_url,created_at"
          )
          .single();

      if (fileInsertError) {
        await supabase.storage
          .from(TRADE_FILE_BUCKET)
          .remove([filePath]);

        throw fileInsertError;
      }

      if (data) {
        setTradeFiles((previous) => [
          data as TradeFile,
          ...previous,
        ]);
      }

      setShowFileModal(false);
      setFileTrade(null);
      setSelectedFile(null);

      if (
        selectedTrade &&
        selectedTrade.id === fileTrade.id
      ) {
        await loadSelectedTradeData(fileTrade.id);
      }
    } catch (err) {
      console.error(
        "UPLOAD TRADE FILE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload trade evidence."
      );
    } finally {
      setSaving(false);
    }
  }

  async function getSignedTradeFileUrl(file: TradeFile) {
    const bucketMarker = `/storage/v1/object/public/${TRADE_FILE_BUCKET}/`;
    const markerIndex = file.file_url.indexOf(bucketMarker);

    if (markerIndex === -1) {
      return file.file_url;
    }

    const filePath = decodeURIComponent(
      file.file_url.slice(
        markerIndex + bucketMarker.length
      )
    );

    const { data, error } = await supabase.storage
      .from(TRADE_FILE_BUCKET)
      .createSignedUrl(filePath, 60 * 60);

    if (error || !data?.signedUrl) {
      throw error || new Error("Unable to create a secure file URL.");
    }

    return data.signedUrl;
  }

  async function viewTradeFile(file: TradeFile) {
    try {
      setError("");
      const signedUrl = await getSignedTradeFileUrl(file);
      setPreviewUrl(signedUrl);
    } catch (err) {
      console.error("TradeBishi file preview error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open this trade file."
      );
    }
  }

  async function openTradeFile(file: TradeFile) {
    try {
      setError("");
      const signedUrl = await getSignedTradeFileUrl(file);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("TradeBishi file open error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open this trade file."
      );
    }
  }

  /* =======================================================
     DELETE FILE
  ======================================================= */

  async function deleteTradeFile(file: TradeFile) {
    const confirmed = window.confirm(
      "Delete this trade document?"
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");

      const bucketMarker = `/storage/v1/object/public/${TRADE_FILE_BUCKET}/`;

      const markerIndex =
        file.file_url.indexOf(bucketMarker);

      if (markerIndex !== -1) {
        const filePath = decodeURIComponent(
          file.file_url.slice(
            markerIndex + bucketMarker.length
          )
        );

        const { error: storageError } =
          await supabase.storage
            .from(TRADE_FILE_BUCKET)
            .remove([filePath]);

        if (storageError) {
          console.warn(
            "STORAGE DELETE ERROR:",
            storageError
          );
        }
      }

      const { error: deleteError } =
        await supabase
          .from("trade_files")
          .delete()
          .eq("id", file.id);

      if (deleteError) {
        throw deleteError;
      }

      setTradeFiles((previous) =>
        previous.filter(
          (item) => item.id !== file.id
        )
      );
    } catch (err) {
      console.error(
        "DELETE TRADE FILE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete document."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     REFRESH
  ======================================================= */

  async function refreshDashboard() {
    try {
      setError("");

      await Promise.all([
        loadTrades(),
        loadMembers(),
      ]);

      if (selectedTrade) {
        await loadSelectedTradeData(
          selectedTrade.id
        );
      }
    } catch (err) {
      console.error(
        "REFRESH DASHBOARD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh dashboard."
      );
    }
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logout() {
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (err) {
      console.error("LOGOUT ERROR:", err);
      setError("Unable to log out.");
    }
  }

  /* =======================================================
     LOADING / ACCESS
  ======================================================= */

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingScreen}>
          <div style={loadingMark}>
            <TrendingUp size={20} />
          </div>

          <strong style={loadingTitle}>
            TradeBishi
          </strong>

          <span style={loadingSubtitle}>
            Loading Trader Dashboard…
          </span>
        </div>
      </main>
    );
  }

  if (!profile || profile.role !== "trader") {
    return (
      <main style={pageStyle}>
        <div style={accessScreen}>
          <div style={accessCard}>
            <div style={accessIcon}>
              <ShieldCheck size={24} />
            </div>

            <p style={topbarEyebrow}>
              TRADEBISHI
            </p>

            <h1 style={accessTitle}>
              Access restricted
            </h1>

            <p style={accessText}>
              This dashboard is available only to
              users with the Trader role.
            </p>

            <button
              type="button"
              onClick={() => router.replace("/")}
              style={primaryButton}
            >
              Return to TradeBishi
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main style={pageStyle}>
      <div style={appShell}>
        {/* SIDEBAR */}
        <aside
          className="tb-sidebar"
          style={sidebar}
        >
          <div>
            <div style={brand}>
              <div style={brandMark}>
                <TrendingUp size={17} />
              </div>

              <div style={brandText}>
                <strong
                  style={{
                    fontSize: "13px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  TradeBishi
                </strong>

                <span
                  style={{
                    color:
                      "rgba(255,255,255,0.28)",
                    fontSize: "8px",
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                  }}
                >
                  TRADER
                </span>
              </div>
            </div>

            <nav style={nav}>
              <button
                type="button"
                style={{
                  ...navButton,
                  ...navButtonActive,
                }}
              >
                <BarChart3 size={15} />
                Dashboard
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                style={navButton}
              >
                <Plus size={15} />
                New Trade
              </button>

              <button
                type="button"
                onClick={refreshDashboard}
                style={navButton}
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </nav>
          </div>

          <div style={sidebarBottom}>
            <div style={sidebarUser}>
              <div style={avatar}>
                {initials(profile.full_name)}
              </div>

              <div style={{ minWidth: 0 }}>
                <strong style={userNameStyle}>
                  {profile.full_name || "Trader"}
                </strong>

                <span style={userRoleStyle}>
                  Trader Account
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              style={logoutButton}
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <section style={mainArea}>
          {/* TOPBAR */}
          <header style={topbar}>
            <div>
              <p style={topbarEyebrow}>
                TRADING OPERATIONS
              </p>

              <h1 style={pageTitle}>
                Trader Dashboard
              </h1>
            </div>

            <div style={topbarActions}>
              <span style={onlineDot}>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#6ee7b7",
                    boxShadow:
                      "0 0 10px rgba(110,231,183,0.45)",
                  }}
                />
                Active
              </span>

              <button
                type="button"
                onClick={refreshDashboard}
                style={secondaryButton}
              >
                <RefreshCw size={13} />
                <span className="tb-action-text">
                  Refresh
                </span>
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                style={primaryButton}
              >
                <Plus size={14} />
                <span className="tb-action-text">
                  New Trade
                </span>
              </button>
            </div>
          </header>

          {/* ERROR */}
          {error && (
            <div style={errorBanner}>
              <AlertCircle size={14} />

              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                style={errorClose}
                aria-label="Close error"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* HERO */}
          <section
            className="tb-hero"
            style={hero}
          >
            <div>
              <p style={heroEyebrow}>
                TRADING OVERVIEW
              </p>

              <h2
                className="tb-hero-title"
                style={heroTitle}
              >
                Keep every trade
                <br />
                clearly tracked.
              </h2>

              <p style={heroText}>
                Record trades, monitor expected
                returns, maintain the timeline and
                keep agreements and payment evidence
                attached to the correct trade.
              </p>
            </div>

            <button
              type="button"
              className="tb-hero-button"
              onClick={openCreateModal}
              style={heroButton}
            >
              <Plus size={15} />
              Record New Trade
            </button>
          </section>

          {/* PRIMARY STATS */}
          <section
            className="tb-stats-grid"
            style={statsGrid}
          >
            <StatCard
              icon={<TrendingUp size={15} />}
              label="Total Trade Capital"
              value={money(totalTradeCapital)}
            />

            <StatCard
              icon={<Activity size={15} />}
              label="Ongoing Capital"
              value={money(ongoingCapital)}
            />

            <StatCard
              icon={<CircleDollarSign size={15} />}
              label="Expected Profit"
              value={money(expectedProfit)}
              positive={expectedProfit >= 0}
            />

            <StatCard
              icon={<Check size={15} />}
              label="Realized Profit"
              value={money(realizedProfit)}
              positive={realizedProfit >= 0}
            />
          </section>

          {/* SECONDARY METRICS */}
          <section
            className="tb-metric-grid"
            style={metricGrid}
          >
            <MetricCard
              label="All Trades"
              value={String(trades.length)}
              icon={<BarChart3 size={14} />}
            />

            <MetricCard
              label="Ongoing"
              value={String(
                ongoingTrades.length
              )}
              icon={<Activity size={14} />}
            />

            <MetricCard
              label="Profit Trades"
              value={String(
                successfulTrades.length
              )}
              icon={<TrendingUp size={14} />}
            />

            <MetricCard
              label="Returned"
              value={String(
                returnedTrades.length
              )}
              icon={<Check size={14} />}
            />
          </section>

          {/* TRADE LIST */}
          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <p style={sectionEyebrow}>
                  TRADE BOOK
                </p>

                <h2 style={sectionTitle}>
                  Trades
                </h2>

                <p style={sectionSubtitle}>
                  All trades recorded by the trading
                  desk.
                </p>
              </div>

              <div style={searchBox}>
                <Search size={13} />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search trades…"
                  style={searchInput}
                />
              </div>
            </div>

            {loadingTrades ? (
              <EmptyState
                icon={<RefreshCw size={19} />}
                title="Loading trades"
                text="Updating the trade book."
              />
            ) : filteredTrades.length === 0 ? (
              <EmptyState
                icon={<TrendingUp size={19} />}
                title={
                  search
                    ? "No trades found"
                    : "No trades yet"
                }
                text={
                  search
                    ? "Try another search term."
                    : "Create the first trade to start the trading record."
                }
              />
            ) : (
              <div style={tradeGrid}>
                {filteredTrades.map((trade) => (
                  <TradeCard
                    key={trade.id}
                    trade={trade}
                    onOpen={() =>
                      openTradeDetails(
                        trade
                      )
                    }
                    onLog={() =>
                      openLogModal(trade)
                    }
                    onFile={() =>
                      openFileModal(trade)
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* ACCOUNT */}
          <section style={accountPanel}>
            <div style={accountHeader}>
              <div>
                <p style={sectionEyebrow}>
                  ACCOUNT
                </p>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                    fontSize: "13px",
                  }}
                >
                  Trader access
                </strong>
              </div>

              <ShieldCheck
                size={16}
                color="rgba(255,255,255,0.35)"
              />
            </div>

            <div style={accountGrid}>
              <AccountRow
                label="Name"
                value={
                  profile.full_name ||
                  "Trader"
                }
              />

              <AccountRow
                label="Role"
                value="Trader"
              />

              <AccountRow
                label="User ID"
                value={
                  userId || "Unavailable"
                }
                mono
              />
            </div>
          </section>

          {/* FOOTER */}
          <footer style={footer}>
            <span>
              {profile.full_name ||
                "TradeBishi Trader"}
              {" • "}
              {userId || "User ID unavailable"}
            </span>

            <span>
              © {new Date().getFullYear()} TradeBishi.
              All rights reserved.
            </span>
          </footer>
        </section>
      </div>

      {/* =====================================================
          CREATE TRADE MODAL
      ===================================================== */}

      {showCreateModal && (
        <div
          style={modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >
          <div style={modalCard}>
            <div style={modalHeader}>
              <div>
                <p style={modalEyebrow}>
                  NEW TRADE
                </p>

                <h2 style={modalTitle}>
                  Record a trade
                </h2>

                <p style={modalSubtitle}>
                  Add the core financial details
                  first. Documents and timeline
                  updates can be added afterward.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreateModal(false)
                }
                style={closeButton}
              >
                <X size={15} />
              </button>
            </div>

            <form
              onSubmit={createTrade}
              style={form}
            >
              <div>
                <label style={fieldLabel}>
                  Trade Name
                </label>

                <input
                  value={tradeForm.trade_name}
                  onChange={(event) =>
                    setTradeForm(
                      (previous) => ({
                        ...previous,
                        trade_name:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. Tata Motors Swing Trade"
                  style={input}
                  required
                />
              </div>

              <div
                className="tb-two-columns"
                style={twoColumns}
              >
                <div>
                  <label style={fieldLabel}>
                    Trade Investment
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      tradeForm.invested_amount
                    }
                    onChange={(event) =>
                      setTradeForm(
                        (previous) => ({
                          ...previous,
                          invested_amount:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="₹ 0"
                    style={input}
                    required
                  />
                </div>

                <div>
                  <label style={fieldLabel}>
                    Return Expected Including
                    Investment
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      tradeForm.approx_return
                    }
                    onChange={(event) =>
                      setTradeForm(
                        (previous) => ({
                          ...previous,
                          approx_return:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="₹ 0"
                    style={input}
                    required
                  />
                </div>
              </div>

              <div style={profitPreview}>
                <span>
                  Expected Profit
                </span>

                <strong
                  style={{
                    color: "#6ee7b7",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  {money(
                    numberValue(
                      tradeForm.approx_return
                    ) -
                      numberValue(
                        tradeForm.invested_amount
                      )
                  )}
                </strong>
              </div>

              <div
                className="tb-two-columns"
                style={twoColumns}
              >
                <div>
                  <label style={fieldLabel}>
                    Status
                  </label>

                  <select
                    value={tradeForm.status}
                    onChange={(event) =>
                      setTradeForm(
                        (previous) => ({
                          ...previous,
                          status:
                            event.target.value as TradeStatus,
                        })
                      )
                    }
                    style={input}
                  >
                    {TRADE_STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {statusLabel(
                            status
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label style={fieldLabel}>
                    Trade Date
                  </label>

                  <input
                    type="date"
                    value={tradeForm.trade_date}
                    onChange={(event) =>
                      setTradeForm(
                        (previous) => ({
                          ...previous,
                          trade_date:
                            event.target.value,
                        })
                      )
                    }
                    style={input}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={fieldLabel}>
                  Notes
                </label>

                <textarea
                  value={tradeForm.notes}
                  onChange={(event) =>
                    setTradeForm(
                      (previous) => ({
                        ...previous,
                        notes: event.target.value,
                      })
                    )
                  }
                  placeholder="Optional trade notes…"
                  style={{
                    ...input,
                    minHeight: "100px",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={modalInfo}>
                <FileText
                  size={14}
                  style={{
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                />

                <span>
                  After creation, you can add
                  timeline updates and upload
                  agreements, receipts and trade
                  evidence from the trade details.
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...primaryButton,
                  width: "100%",
                  justifyContent: "center",
                  minHeight: "44px",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <>
                    <RefreshCw
                      size={14}
                      className="tb-spin"
                    />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Create Trade
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          LOG MODAL
      ===================================================== */}

      {showLogModal && logTrade && (
        <div
          style={modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogModal(false);
            }
          }}
        >
          <div style={smallModalCard}>
            <div style={modalHeader}>
              <div>
                <p style={modalEyebrow}>
                  TRADE UPDATE
                </p>

                <h2 style={modalTitle}>
                  Add timeline update
                </h2>

                <p style={modalSubtitle}>
                  {logTrade.trade_name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowLogModal(false)
                }
                style={closeButton}
              >
                <X size={15} />
              </button>
            </div>

            <form
              onSubmit={addTradeLog}
              style={form}
            >
              <div>
                <label style={fieldLabel}>
                  Update
                </label>

                <textarea
                  value={logDescription}
                  onChange={(event) =>
                    setLogDescription(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Entry confirmed and position opened."
                  style={{
                    ...input,
                    minHeight: "130px",
                    resize: "vertical",
                  }}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...primaryButton,
                  width: "100%",
                  justifyContent: "center",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "Saving…"
                  : "Add Update"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          FILE MODAL
      ===================================================== */}

      {showFileModal && fileTrade && (
        <div
          style={modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowFileModal(false);
            }
          }}
        >
          <div style={smallModalCard}>
            <div style={modalHeader}>
              <div>
                <p style={modalEyebrow}>
                  TRADE EVIDENCE
                </p>

                <h2 style={modalTitle}>
                  Upload document
                </h2>

                <p style={modalSubtitle}>
                  {fileTrade.trade_name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowFileModal(false)
                }
                style={closeButton}
              >
                <X size={15} />
              </button>
            </div>

            <form
              onSubmit={uploadTradeFile}
              style={form}
            >
              <div>
                <label style={fieldLabel}>
                  Document Type
                </label>

                <select
                  value={fileCategory}
                  onChange={(event) =>
                    setFileCategory(
                      event.target
                        .value as TradeFile["category"]
                    )
                  }
                  style={input}
                >
                  <option value="agreement">
                    Agreement
                  </option>

                  <option value="receipt">
                    Receipt
                  </option>

                  <option value="payment_proof">
                    Payment Proof
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </div>

              <label style={uploadBox}>
                <Upload size={22} />

                <strong
                  style={{
                    color:
                      "rgba(255,255,255,0.72)",
                    fontSize: "12px",
                  }}
                >
                  {selectedFile
                    ? selectedFile.name
                    : "Choose a document"}
                </strong>

                <span
                  style={{
                    fontSize: "10px",
                    color:
                      "rgba(255,255,255,0.3)",
                  }}
                >
                  Images, PDF, DOC, DOCX, XLS
                  or XLSX
                </span>

                <input
                  id="trade-document-upload"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(event) =>
                    setSelectedFile(
                      event.target.files?.[0] ??
                        null
                    )
                  }
                  style={{
                    display: "none",
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...primaryButton,
                  width: "100%",
                  justifyContent: "center",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "Uploading…"
                  : "Upload Evidence"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          STATUS MODAL
      ===================================================== */}

      {showStatusModal && statusTrade && (
        <div
          style={modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowStatusModal(false);
            }
          }}
        >
          <div style={smallModalCard}>
            <div style={modalHeader}>
              <div>
                <p style={modalEyebrow}>
                  TRADE STATUS
                </p>

                <h2 style={modalTitle}>
                  Update Status
                </h2>

                <p style={modalSubtitle}>
                  {statusTrade.trade_name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowStatusModal(false)
                }
                style={closeButton}
              >
                <X size={15} />
              </button>
            </div>

            <form
              onSubmit={updateTradeStatus}
              style={form}
            >
              <div style={statusExplanation}>
                <StatusOption
                  active={
                    newStatus === "ongoing"
                  }
                  title="Ongoing"
                  text={statusDescription(
                    "ongoing"
                  )}
                  onClick={() =>
                    setNewStatus("ongoing")
                  }
                />

                <StatusOption
                  active={
                    newStatus === "successful"
                  }
                  title="Profit"
                  text={statusDescription(
                    "successful"
                  )}
                  onClick={() =>
                    setNewStatus(
                      "successful"
                    )
                  }
                />

                <StatusOption
                  active={
                    newStatus === "failed"
                  }
                  title="Invested Money Returned"
                  text={statusDescription(
                    "failed"
                  )}
                  onClick={() =>
                    setNewStatus("failed")
                  }
                />
              </div>

              <div style={modalInfo}>
                <Activity
                  size={14}
                  style={{
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                />

                <span>
                  Changing the status also adds
                  an automatic entry to this
                  trade&apos;s timeline.
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...primaryButton,
                  width: "100%",
                  justifyContent: "center",
                  minHeight: "44px",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "Updating…"
                  : "Update Status"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          TRADE DETAIL MODAL
      ===================================================== */}

      {selectedTrade && (
        <div
          style={modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTrade(null);
            }
          }}
        >
          <div
            className="tb-detail-modal"
            style={detailModalCard}
          >
            {/* DETAIL HEADER */}
            <div style={modalHeader}>
              <div style={{ minWidth: 0 }}>
                <p style={modalEyebrow}>
                  TRADE DETAIL
                </p>

                <h2
                  className="tb-detail-title"
                  style={detailTitle}
                >
                  {selectedTrade.trade_name}
                </h2>

                <div style={detailMeta}>
                  <span>
                    {formatDate(
                      selectedTrade.trade_date
                    )}
                  </span>

                  <span>•</span>

                  <span
                    style={
                      selectedTrade.is_closed
                        ? { ...statusBadge, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }
                        : { ...statusBadge, ...statusBadgeFor(selectedTrade.status) }
                    }
                  >
                    {selectedTrade.is_closed ? "CLOSED" : statusLabel(selectedTrade.status)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTrade(null)
                }
                style={closeButton}
              >
                <X size={15} />
              </button>
            </div>

            {/* STRONG FINANCIAL CARDS */}
            <div
              className="tb-detail-stats"
              style={detailStats}
            >
              <DetailStat
                label="Trade Investment"
                value={money(
                  selectedTrade.invested_amount
                )}
              />

              <DetailStat
                label="Return Expected Including Investment"
                value={money(
                  selectedTrade.approx_return
                )}
              />

              <DetailStat
                label="Expected Profit"
                value={money(
                  tradeProfit(
                    selectedTrade
                  )
                )}
                positive={
                  tradeProfit(
                    selectedTrade
                  ) >= 0
                }
              />

              <DetailStat
                label="Members"
                value={String(
                  tradeMembers.length
                )}
              />
            </div>

            {/* ACTIONS */}
            {!selectedTrade.is_closed && (
            <div style={detailActions}>
              <button
                type="button"
                onClick={() =>
                  openStatusModal(
                    selectedTrade
                  )
                }
                style={primaryButton}
              >
                <Activity size={13} />
                Update Status
              </button>

              <button
                type="button"
                onClick={() =>
                  openLogModal(
                    selectedTrade
                  )
                }
                style={secondaryButton}
              >
                <MoreHorizontal size={13} />
                Add Update
              </button>

              <button
                type="button"
                onClick={() =>
                  openFileModal(
                    selectedTrade
                  )
                }
                style={secondaryButton}
              >
                <Upload size={13} />
                Upload Evidence
              </button>
            </div>
            )}

            {selectedTrade.is_closed && (
              <div style={{ ...detailActions, marginBottom: "20px" }}>
                <div style={{ ...modalInfo, width: "100%" }}>
                  <ShieldCheck size={13} />
                  <span>This trade is CLOSED. It is read-only for the trader; Admin controls post-close changes.</span>
                </div>
              </div>
            )}

            {/* INFORMATION */}
            <section style={detailSection}>
              <div
                style={detailSectionHeader}
              >
                <div>
                  <h3
                    style={detailSectionTitle}
                  >
                    Trade Information
                  </h3>

                  <p
                    style={
                      detailSectionSubtitle
                    }
                  >
                    Core details associated with
                    this trade.
                  </p>
                </div>
              </div>

              <div
                className="tb-info-grid"
                style={infoGrid}
              >
                <InfoItem
                  label="Status"
                  value={statusLabel(
                    selectedTrade.status
                  )}
                />

                <InfoItem
                  label="Trader ID"
                  value={
                    selectedTrade.trader_id ||
                    "Unavailable"
                  }
                />

                <InfoItem
                  label="Participating Capital"
                  value={money(
                    tradeMembers.reduce(
                      (total, item) =>
                        total +
                        Number(
                          item.invested_amount ||
                            0
                        ),
                      0
                    )
                  )}
                />
              </div>

              {selectedTrade.notes && (
                <div style={notesBox}>
                  <span
                    style={{
                      display: "block",
                      color:
                        "rgba(255,255,255,0.28)",
                      fontSize: "8px",
                      fontWeight: 700,
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    Notes
                  </span>

                  <p
                    style={{
                      margin:
                        "7px 0 0",
                      color:
                        "rgba(255,255,255,0.58)",
                      fontSize: "11px",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedTrade.notes}
                  </p>
                </div>
              )}
            </section>

            {/* PARTICIPATING MEMBERS */}
            <section style={detailSection}>
              <div
                style={detailSectionHeader}
              >
                <div>
                  <h3
                    style={detailSectionTitle}
                  >
                    Participating Members
                  </h3>

                  <p
                    style={
                      detailSectionSubtitle
                    }
                  >
                    Members whose capital is linked
                    to this trade.
                  </p>
                </div>

                <div style={countBadge}>
                  {tradeMembers.length}
                </div>
              </div>

              {tradeMembers.length === 0 ? (
                <div style={miniEmpty}>
                  <Users size={14} />
                  No members are currently linked
                  to this trade.
                </div>
              ) : (
                <div style={participantList}>
                  {tradeMembers.map(
                    (item) => {
                      const memberName =
                        item.member
                          ?.full_name ||
                        "Unknown Member";

                      return (
                        <div
                          key={item.id}
                          style={
                            participantRow
                          }
                        >
                          <div
                            style={
                              participantAvatar
                            }
                          >
                            {initials(
                              memberName
                            )}
                          </div>

                          <div
                            style={{
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <strong
                              style={{
                                display:
                                  "block",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  700,
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {memberName}
                            </strong>

                            <span
                              style={
                                mutedText
                              }
                            >
                              Member capital
                            </span>
                          </div>

                          <strong
                            style={{
                              fontSize:
                                "11px",
                              fontWeight:
                                750,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {money(
                              item.invested_amount
                            )}
                          </strong>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* DOCUMENTS */}
            <section style={detailSection}>
              <div
                style={detailSectionHeader}
              >
                <div>
                  <h3
                    style={detailSectionTitle}
                  >
                    Documents & Evidence
                  </h3>

                  <p
                    style={
                      detailSectionSubtitle
                    }
                  >
                    Agreements, receipts and payment
                    evidence for this trade.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openFileModal(
                      selectedTrade
                    )
                  }
                  style={secondaryButton}
                >
                  <Upload size={12} />
                  Upload
                </button>
              </div>

              {tradeFiles.length === 0 ? (
                <div style={miniEmpty}>
                  <FileText size={14} />
                  No documents have been uploaded
                  for this trade.
                </div>
              ) : (
                <div style={fileList}>
                  {tradeFiles.map((file) => (
                    <div
                      key={file.id}
                      style={fileRow}
                    >
                      <div style={fileIcon}>
                        {isImageFile(
                          file.file_url
                        ) ? (
                          <ImageIcon
                            size={15}
                          />
                        ) : (
                          <FileText
                            size={15}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            fontSize:
                              "11px",
                            fontWeight:
                              700,
                          }}
                        >
                          {fileCategoryLabel(
                            file.category
                          )}
                        </strong>

                        <span
                          style={mutedText}
                        >
                          Added{" "}
                          {formatDateTime(
                            file.created_at
                          )}
                        </span>
                      </div>

                      <div
                        style={fileActions}
                      >
                        {isImageFile(
                          file.file_url
                        ) && (
                          <button
                            type="button"
                            onClick={() =>
                              viewTradeFile(file)
                            }
                            style={fileAction}
                          >
                            <ImageIcon
                              size={11}
                            />
                            View
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            openTradeFile(file)
                          }
                          style={fileAction}
                        >
                          <FileText
                            size={11}
                          />
                          Open
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteTradeFile(
                              file
                            )
                          }
                          style={
                            deleteButton
                          }
                          aria-label="Delete document"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* TIMELINE */}
            <section style={detailSection}>
              <div
                style={detailSectionHeader}
              >
                <div>
                  <h3
                    style={detailSectionTitle}
                  >
                    Trade Timeline
                  </h3>

                  <p
                    style={
                      detailSectionSubtitle
                    }
                  >
                    Updates and status changes for
                    this trade.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openLogModal(
                      selectedTrade
                    )
                  }
                  style={secondaryButton}
                >
                  <Plus size={12} />
                  Update
                </button>
              </div>

              {tradeLogs.length === 0 ? (
                <div style={miniEmpty}>
                  <Activity size={14} />
                  No timeline updates yet.
                </div>
              ) : (
                <div
                  style={detailTimeline}
                >
                  {tradeLogs.map((log) => (
                    <div
                      key={log.id}
                      style={
                        detailTimelineRow
                      }
                    >
                      <div
                        style={
                          detailTimelineLine
                        }
                      >
                        <div
                          style={
                            detailTimelineDot
                          }
                        />
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <p
                          style={
                            timelineDescription
                          }
                        >
                          {log.description}
                        </p>

                        <span
                          style={{
                            display:
                              "block",
                            marginTop:
                              "5px",
                            color:
                              "rgba(255,255,255,0.25)",
                            fontSize:
                              "9px",
                          }}
                        >
                          {formatDateTime(
                            log.created_at
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* =====================================================
          IMAGE VIEWER
      ===================================================== */}

      {previewUrl && (
        <div
          style={imageViewer}
          onClick={() =>
            setPreviewUrl(null)
          }
        >
          <button
            type="button"
            onClick={() =>
              setPreviewUrl(null)
            }
            style={imageViewerClose}
            aria-label="Close image"
          >
            <X size={17} />
          </button>

          <img
            src={previewUrl}
            alt="Trade evidence"
            style={imageViewerImage}
            onClick={(event) =>
              event.stopPropagation()
            }
          />
        </div>
      )}

      {/* =====================================================
          GLOBAL STYLES
      ===================================================== */}

      <style jsx global>{`
        html {
          background: #000;
        }

        body {
          margin: 0;
          background: #000;
          color: #fff;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "SF Pro Display",
            "SF Pro Text",
            Inter,
            Arial,
            sans-serif;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        button:disabled {
          cursor: not-allowed;
        }

        input::placeholder,
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.22);
        }

        select option {
          background: #111;
          color: #fff;
        }

        ::selection {
          background: rgba(255, 255, 255, 0.18);
        }

        .tb-spin {
          animation: tbspin 0.9s linear infinite;
        }

        @keyframes tbspin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1050px) {
          .tb-sidebar {
            display: none !important;
          }

          .tb-detail-modal {
            max-width: 760px !important;
          }
        }

        @media (max-width: 850px) {
          .tb-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .tb-metric-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 720px) {
          .tb-page {
            padding: 12px !important;
          }

          .tb-detail-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .tb-info-grid {
            grid-template-columns: 1fr !important;
          }

          .tb-two-columns {
            grid-template-columns: 1fr !important;
          }

          .tb-action-text {
            display: none;
          }

          .tb-hero {
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .tb-hero-button {
            align-self: stretch;
            justify-content: center;
          }

          .tb-panel-header {
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .tb-search-box {
            width: 100% !important;
          }

          .tb-account-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 560px) {
          .tb-stats-grid {
            grid-template-columns: 1fr !important;
          }

          .tb-metric-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .tb-trade-financial-grid {
            grid-template-columns: 1fr !important;
          }

          .tb-detail-modal {
            padding: 18px !important;
            border-radius: 18px !important;
          }

          .tb-file-row {
            align-items: flex-start !important;
            flex-wrap: wrap !important;
          }

          .tb-file-actions {
            width: 100%;
            margin-left: 44px;
          }
        }

        @media (max-width: 480px) {
          .tb-detail-stats {
            grid-template-columns: 1fr !important;
          }

          .tb-hero {
            padding: 20px !important;
          }

          .tb-hero-title {
            font-size: 25px !important;
          }

          .tb-hero-button {
            width: 100%;
            justify-content: center;
          }

          .tb-detail-modal {
            padding: 18px !important;
            border-radius: 18px !important;
          }

          .tb-metric-grid {
            grid-template-columns: 1fr !important;
          }

          .tb-detail-actions {
            flex-direction: column !important;
          }

          .tb-detail-actions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function StatCard({
  icon,
  label,
  value,
  positive = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div style={statCard}>
      <div style={statIcon}>{icon}</div>

      <div style={{ minWidth: 0 }}>
        <span style={statLabel}>
          {label}
        </span>

        <strong
          style={{
            display: "block",
            marginTop: "7px",
            fontSize:
              "clamp(18px, 2vw, 23px)",
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: positive
              ? "#6ee7b7"
              : "#fff",
          }}
        >
          {value}
        </strong>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={metricCard}>
      <div style={metricIcon}>
        {icon}
      </div>

      <div>
        <span style={metricLabel}>
          {label}
        </span>

        <strong style={metricValue}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function TradeCard({
  trade,
  onOpen,
  onLog,
  onFile,
}: {
  trade: Trade;
  onOpen: () => void;
  onLog: () => void;
  onFile: () => void;
}) {
  const badge = statusBadgeFor(
    trade.status
  );

  const profit = tradeProfit(trade);

  return (
    <article style={tradeCard}>
      <div style={tradeCardTop}>
        <div style={tradeIdentity}>
          <div style={tradeIcon}>
            <TrendingUp size={17} />
          </div>

          <div style={{ minWidth: 0 }}>
            <h3 style={tradeNameStyle}>
              {trade.trade_name}
            </h3>

            <span style={tradeDateStyle}>
              {formatDate(
                trade.trade_date
              )}
            </span>
          </div>
        </div>

        <span
          style={
            trade.is_closed
              ? { ...statusBadge, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }
              : { ...statusBadge, ...badge }
          }
        >
          {trade.is_closed ? "CLOSED" : statusLabel(trade.status)}
        </span>
      </div>

      <div
        className="tb-trade-financial-grid"
        style={tradeFinancialGrid}
      >
        <TradeMetric
          label="Trade Investment"
          value={money(
            trade.invested_amount
          )}
        />

        <TradeMetric
          label="Return Expected"
          value={money(
            trade.approx_return
          )}
        />

        <TradeMetric
          label="Expected Profit"
          value={money(profit)}
          positive={profit >= 0}
        />
      </div>

      {trade.notes && (
        <p style={tradeNotes}>
          {trade.notes}
        </p>
      )}

      <div style={tradeCardBottom}>
        <div style={tradeMeta}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Users size={12} />
            Trade
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Activity size={12} />
            Recorded
          </span>
        </div>

        <div style={tradeActions}>
          <button
            type="button"
            onClick={onOpen}
            style={tradeOpenButton}
          >
            Open Trade
            <ChevronRight size={13} />
          </button>

          {!trade.is_closed && (
            <>
              <button
                type="button"
                onClick={onLog}
                style={iconButton}
                aria-label="Add trade update"
              >
                <MoreHorizontal size={15} />
              </button>

              <button
                type="button"
                onClick={onFile}
                style={iconButton}
                aria-label="Upload trade evidence"
              >
                <Upload size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function TradeMetric({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div style={tradeMetric}>
      <span
        style={{
          display: "block",
          color:
            "rgba(255,255,255,0.27)",
          fontSize: "8px",
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: "5px",
          color: positive
            ? "#6ee7b7"
            : "#fff",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "-0.015em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function DetailStat({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div
      className="tb-detail-stat"
      style={detailStat}
    >
      <span style={detailStatLabel}>
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: "9px",
          fontSize:
            "clamp(21px, 3vw, 28px)",
          lineHeight: 1.05,
          fontWeight: 800,
          letterSpacing: "-0.045em",
          color: positive
            ? "#6ee7b7"
            : "#fff",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="tb-info-item"
      style={infoItem}
    >
      <span style={infoItemLabel}>
        {label}
      </span>

      <strong style={infoItemValue}>
        {value}
      </strong>
    </div>
  );
}

function StatusOption({
  active,
  title,
  text,
  onClick,
}: {
  active: boolean;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...statusOption,
        border: active
          ? "1px solid rgba(255,255,255,0.18)"
          : "1px solid rgba(255,255,255,0.07)",
        background: active
          ? "rgba(255,255,255,0.07)"
          : "rgba(255,255,255,0.025)",
      }}
    >
      <div
        style={{
          ...statusOptionCheck,
          opacity: active ? 1 : 0.25,
        }}
      >
        {active && <Check size={12} />}
      </div>

      <div style={{ textAlign: "left" }}>
        <strong
          style={{
            display: "block",
            fontSize: "12px",
            color:
              "rgba(255,255,255,0.82)",
          }}
        >
          {title}
        </strong>

        <span
          style={{
            display: "block",
            marginTop: "3px",
            fontSize: "10px",
            lineHeight: 1.4,
            color:
              "rgba(255,255,255,0.35)",
          }}
        >
          {text}
        </span>
      </div>
    </button>
  );
}

function AccountRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={accountRow}>
      <span style={accountRowLabel}>
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: "5px",
          fontFamily: mono
            ? "ui-monospace, SFMono-Regular, Menlo, monospace"
            : "inherit",
          fontSize: mono
            ? "10px"
            : "12px",
          wordBreak: mono
            ? "break-all"
            : "normal",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div style={emptyState}>
      <div style={emptyIcon}>
        {icon}
      </div>

      <strong
        style={{
          fontSize: "13px",
          fontWeight: 750,
        }}
      >
        {title}
      </strong>

      <span
        style={{
          color:
            "rgba(255,255,255,0.3)",
          fontSize: "10px",
        }}
      >
        {text}
      </span>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
};

const loadingScreen: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "9px",
  padding: "24px",
};

const loadingMark: React.CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.07)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  marginBottom: "6px",
};

const loadingTitle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
};

const loadingSubtitle: React.CSSProperties = {
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "11px",
};

const accessScreen: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const accessCard: React.CSSProperties = {
  width: "100%",
  maxWidth: "460px",
  padding: "36px",
  borderRadius: "24px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  textAlign: "center",
  boxShadow:
    "0 30px 80px rgba(0,0,0,0.45)",
};

const accessIcon: React.CSSProperties = {
  width: "52px",
  height: "52px",
  margin: "0 auto 20px",
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.07)",
};

const accessTitle: React.CSSProperties = {
  margin: "8px 0 10px",
  fontSize: "24px",
  letterSpacing: "-0.03em",
};

const accessText: React.CSSProperties = {
  margin: "0 0 22px",
  color:
    "rgba(255,255,255,0.42)",
  fontSize: "13px",
  lineHeight: 1.6,
};

const appShell: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "224px minmax(0, 1fr)",
};

const sidebar: React.CSSProperties = {
  position: "sticky",
  top: 0,
  height: "100vh",
  padding: "22px 14px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  borderRight:
    "1px solid rgba(255,255,255,0.07)",
  background:
    "rgba(255,255,255,0.015)",
};

const brand: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "5px 7px 22px",
};

const brandMark: React.CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.09)",
  border:
    "1px solid rgba(255,255,255,0.1)",
};

const brandText: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const nav: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "5px",
};

const navButton: React.CSSProperties = {
  width: "100%",
  minHeight: "39px",
  padding: "9px 11px",
  border: "0",
  borderRadius: "10px",
  background: "transparent",
  color:
    "rgba(255,255,255,0.42)",
  display: "flex",
  alignItems: "center",
  gap: "9px",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "12px",
};

const navButtonActive: React.CSSProperties = {
  background:
    "rgba(255,255,255,0.075)",
  color: "#fff",
};

const sidebarBottom: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const sidebarUser: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  padding: "10px 7px",
};

const avatar: React.CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: "9px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.09)",
  fontSize: "11px",
  fontWeight: 800,
};

const userNameStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "130px",
};

const userRoleStyle: React.CSSProperties = {
  display: "block",
  marginTop: "2px",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "9px",
};

const logoutButton: React.CSSProperties = {
  width: "100%",
  minHeight: "36px",
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: "10px",
  background:
    "rgba(255,255,255,0.025)",
  color:
    "rgba(255,255,255,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  cursor: "pointer",
  fontSize: "11px",
};

const mainArea: React.CSSProperties = {
  minWidth: 0,
  padding:
    "24px clamp(16px, 3vw, 42px) 18px",
};

const topbar: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "20px",
  marginBottom: "22px",
};

const topbarEyebrow: React.CSSProperties = {
  margin: 0,
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "9px",
  fontWeight: 800,
  letterSpacing: "0.16em",
};

const pageTitle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize:
    "clamp(24px, 3vw, 34px)",
  lineHeight: 1.05,
  letterSpacing: "-0.04em",
};

const topbarActions: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
};

const onlineDot: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "10px",
};

const primaryButton: React.CSSProperties = {
  minHeight: "38px",
  padding: "9px 13px",
  border:
    "1px solid rgba(255,255,255,0.13)",
  borderRadius: "10px",
  background: "#fff",
  color: "#000",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 750,
  boxShadow:
    "0 8px 25px rgba(255,255,255,0.06)",
};

const secondaryButton: React.CSSProperties = {
  minHeight: "38px",
  padding: "9px 12px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: "10px",
  background:
    "rgba(255,255,255,0.045)",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 650,
};

const iconButton: React.CSSProperties = {
  width: "32px",
  height: "32px",
  padding: 0,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: "9px",
  background:
    "rgba(255,255,255,0.035)",
  color:
    "rgba(255,255,255,0.55)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const errorBanner: React.CSSProperties = {
  marginBottom: "16px",
  padding: "11px 13px",
  border:
    "1px solid rgba(248,113,113,0.15)",
  borderRadius: "11px",
  background:
    "rgba(248,113,113,0.055)",
  color: "#fca5a5",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "11px",
};

const errorClose: React.CSSProperties = {
  marginLeft: "auto",
  width: "25px",
  height: "25px",
  padding: 0,
  border: 0,
  background: "transparent",
  color:
    "rgba(255,255,255,0.5)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const hero: React.CSSProperties = {
  minHeight: "235px",
  padding: "32px",
  borderRadius: "25px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.09), transparent 34%), rgba(255,255,255,0.035)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "25px",
  overflow: "hidden",
  marginBottom: "13px",
};

const heroEyebrow: React.CSSProperties = {
  margin: 0,
  color:
    "rgba(255,255,255,0.32)",
  fontSize: "9px",
  fontWeight: 800,
  letterSpacing: "0.16em",
};

const heroTitle: React.CSSProperties = {
  margin: "9px 0 10px",
  fontSize:
    "clamp(28px, 4vw, 43px)",
  lineHeight: 1.03,
  letterSpacing: "-0.05em",
};

const heroText: React.CSSProperties = {
  maxWidth: "520px",
  margin: 0,
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "12px",
  lineHeight: 1.65,
};

const heroButton: React.CSSProperties = {
  minHeight: "40px",
  padding: "10px 14px",
  border: 0,
  borderRadius: "11px",
  background: "#fff",
  color: "#000",
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 750,
  whiteSpace: "nowrap",
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "9px",
  marginBottom: "9px",
};

const statCard: React.CSSProperties = {
  minWidth: 0,
  padding: "16px",
  borderRadius: "16px",
  border:
    "1px solid rgba(255,255,255,0.07)",
  background:
    "rgba(255,255,255,0.035)",
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
};

const statIcon: React.CSSProperties = {
  width: "31px",
  height: "31px",
  flexShrink: 0,
  borderRadius: "9px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.055)",
  color:
    "rgba(255,255,255,0.55)",
};

const statLabel: React.CSSProperties = {
  display: "block",
  color:
    "rgba(255,255,255,0.32)",
  fontSize: "9px",
  fontWeight: 700,
  lineHeight: 1.3,
};

const metricGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "9px",
  marginBottom: "22px",
};

const metricCard: React.CSSProperties = {
  minWidth: 0,
  padding: "13px",
  borderRadius: "13px",
  background:
    "rgba(255,255,255,0.02)",
  border:
    "1px solid rgba(255,255,255,0.055)",
  display: "flex",
  alignItems: "center",
  gap: "9px",
};

const metricIcon: React.CSSProperties = {
  width: "28px",
  height: "28px",
  flexShrink: 0,
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.04)",
  color:
    "rgba(255,255,255,0.4)",
};

const metricLabel: React.CSSProperties = {
  display: "block",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "9px",
};

const metricValue: React.CSSProperties = {
  display: "block",
  marginTop: "3px",
  fontSize: "14px",
  fontWeight: 750,
};

const panel: React.CSSProperties = {
  padding: "19px",
  borderRadius: "18px",
  border:
    "1px solid rgba(255,255,255,0.07)",
  background:
    "rgba(255,255,255,0.025)",
};

const panelHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "15px",
  marginBottom: "15px",
};

const sectionEyebrow: React.CSSProperties = {
  margin: 0,
  color:
    "rgba(255,255,255,0.28)",
  fontSize: "8px",
  fontWeight: 800,
  letterSpacing: "0.16em",
};

const sectionTitle: React.CSSProperties = {
  margin: "5px 0 0",
  fontSize: "18px",
  letterSpacing: "-0.025em",
};

const sectionSubtitle: React.CSSProperties = {
  margin: "4px 0 0",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "10px",
};

const searchBox: React.CSSProperties = {
  width: "min(260px, 100%)",
  minHeight: "36px",
  padding: "0 10px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.07)",
  background:
    "rgba(255,255,255,0.035)",
  display: "flex",
  alignItems: "center",
  gap: "7px",
  color:
    "rgba(255,255,255,0.3)",
};

const searchInput: React.CSSProperties = {
  width: "100%",
  border: 0,
  outline: 0,
  background: "transparent",
  color: "#fff",
  fontSize: "11px",
};

const tradeGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill, minmax(290px, 1fr))",
  gap: "9px",
};

const tradeCard: React.CSSProperties = {
  minWidth: 0,
  padding: "16px",
  borderRadius: "16px",
  border:
    "1px solid rgba(255,255,255,0.065)",
  background:
    "rgba(255,255,255,0.025)",
  transition:
    "transform 160ms ease, border-color 160ms ease",
};

const tradeCardTop: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
};

const tradeIdentity: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  minWidth: 0,
};

const tradeIcon: React.CSSProperties = {
  width: "34px",
  height: "34px",
  flexShrink: 0,
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.06)",
  color:
    "rgba(255,255,255,0.65)",
};

const tradeNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "-0.01em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const tradeDateStyle: React.CSSProperties = {
  display: "block",
  marginTop: "3px",
  color:
    "rgba(255,255,255,0.28)",
  fontSize: "9px",
};

const statusBadge: React.CSSProperties = {
  flexShrink: 0,
  padding: "5px 8px",
  borderRadius: "999px",
  fontSize: "8px",
  fontWeight: 750,
  lineHeight: 1,
};

const tradeFinancialGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "7px",
  marginTop: "15px",
};

const tradeMetric: React.CSSProperties = {
  minWidth: 0,
  padding: "9px",
  borderRadius: "10px",
  background:
    "rgba(255,255,255,0.025)",
};

const tradeNotes: React.CSSProperties = {
  margin: "11px 0 0",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "10px",
  lineHeight: 1.5,
};

const tradeCardBottom: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  marginTop: "14px",
  paddingTop: "11px",
  borderTop:
    "1px solid rgba(255,255,255,0.055)",
};

const tradeMeta: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color:
    "rgba(255,255,255,0.25)",
  fontSize: "8px",
};

const tradeActions: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
};

const tradeOpenButton: React.CSSProperties = {
  minHeight: "32px",
  padding: "7px 9px",
  border: 0,
  borderRadius: "8px",
  background:
    "rgba(255,255,255,0.07)",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  cursor: "pointer",
  fontSize: "9px",
  fontWeight: 700,
};

const accountPanel: React.CSSProperties = {
  marginTop: "10px",
  padding: "17px",
  borderRadius: "16px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  background:
    "rgba(255,255,255,0.02)",
};

const accountHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "13px",
};

const accountGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "8px",
};

const accountRow: React.CSSProperties = {
  minWidth: 0,
  padding: "11px",
  borderRadius: "10px",
  background:
    "rgba(255,255,255,0.025)",
};

const accountRowLabel: React.CSSProperties = {
  color:
    "rgba(255,255,255,0.28)",
  fontSize: "9px",
};

const emptyState: React.CSSProperties = {
  minHeight: "180px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  textAlign: "center",
};

const emptyIcon: React.CSSProperties = {
  width: "42px",
  height: "42px",
  marginBottom: "4px",
  borderRadius: "13px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.05)",
  color:
    "rgba(255,255,255,0.4)",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  padding: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(0,0,0,0.72)",
  backdropFilter: "blur(18px)",
  overflowY: "auto",
};

const modalCard: React.CSSProperties = {
  width: "100%",
  maxWidth: "520px",
  maxHeight: "92vh",
  overflowY: "auto",
  padding: "22px",
  borderRadius: "20px",
  background:
    "rgba(18,18,18,0.97)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  boxShadow:
    "0 35px 100px rgba(0,0,0,0.6)",
};

const smallModalCard: React.CSSProperties = {
  width: "100%",
  maxWidth: "450px",
  padding: "22px",
  borderRadius: "20px",
  background:
    "rgba(18,18,18,0.97)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  boxShadow:
    "0 35px 100px rgba(0,0,0,0.6)",
};

const detailModalCard: React.CSSProperties = {
  width: "100%",
  maxWidth: "850px",
  maxHeight: "92vh",
  overflowY: "auto",
  padding: "25px",
  borderRadius: "22px",
  background:
    "rgba(15,15,15,0.98)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  boxShadow:
    "0 40px 120px rgba(0,0,0,0.65)",
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "15px",
  marginBottom: "20px",
};

const modalEyebrow: React.CSSProperties = {
  margin: 0,
  color:
    "rgba(255,255,255,0.28)",
  fontSize: "8px",
  fontWeight: 800,
  letterSpacing: "0.16em",
};

const modalTitle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: "20px",
  letterSpacing: "-0.03em",
};

const modalSubtitle: React.CSSProperties = {
  margin: "5px 0 0",
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "10px",
  lineHeight: 1.5,
};

const closeButton: React.CSSProperties = {
  width: "34px",
  height: "34px",
  flexShrink: 0,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  background:
    "rgba(255,255,255,0.04)",
  color:
    "rgba(255,255,255,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const form: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "13px",
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color:
    "rgba(255,255,255,0.42)",
  fontSize: "9px",
  fontWeight: 700,
};

const input: React.CSSProperties = {
  width: "100%",
  minHeight: "45px",
  padding: "11px 12px",
  borderRadius: "11px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.055)",
  color: "white",
  outline: "none",
  fontSize: "13px",
  boxSizing: "border-box",
};

const twoColumns: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const profitPreview: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "13px",
  borderRadius: "12px",
  background:
    "rgba(52,211,153,0.06)",
  border:
    "1px solid rgba(52,211,153,0.12)",
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "11px",
};

const modalInfo: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "9px",
  padding: "12px",
  borderRadius: "11px",
  background:
    "rgba(255,255,255,0.035)",
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "11px",
  lineHeight: 1.5,
};

const uploadBox: React.CSSProperties = {
  minHeight: "120px",
  padding: "18px",
  borderRadius: "13px",
  border:
    "1px dashed rgba(255,255,255,0.18)",
  background:
    "rgba(255,255,255,0.025)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  textAlign: "center",
  color:
    "rgba(255,255,255,0.48)",
  cursor: "pointer",
};

const detailTitle: React.CSSProperties = {
  margin: "7px 0 0",
  fontSize:
    "clamp(22px, 4vw, 30px)",
  lineHeight: 1.15,
  letterSpacing: "-0.04em",
};

const detailMeta: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  flexWrap: "wrap",
  marginTop: "10px",
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "10px",
};

const detailStats: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "9px",
  marginBottom: "15px",
};

const detailStat: React.CSSProperties = {
  minWidth: 0,
  padding: "16px",
  borderRadius: "15px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.025))",
  border:
    "1px solid rgba(255,255,255,0.085)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.025)",
};

const detailStatLabel: React.CSSProperties = {
  display: "block",
  color:
    "rgba(255,255,255,0.38)",
  fontSize: "9px",
  fontWeight: 700,
  lineHeight: 1.35,
};

const detailActions: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const detailSection: React.CSSProperties = {
  paddingTop: "20px",
  marginTop: "20px",
  borderTop:
    "1px solid rgba(255,255,255,0.07)",
};

const detailSectionHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "13px",
};

const detailSectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  fontWeight: 750,
};

const detailSectionSubtitle: React.CSSProperties = {
  margin: "4px 0 0",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "10px",
};

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "9px",
};

const infoItem: React.CSSProperties = {
  minWidth: 0,
  padding: "12px",
  borderRadius: "11px",
  background:
    "rgba(255,255,255,0.025)",
};

const infoItemLabel: React.CSSProperties = {
  display: "block",
  color:
    "rgba(255,255,255,0.28)",
  fontSize: "8px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const infoItemValue: React.CSSProperties = {
  display: "block",
  marginTop: "6px",
  color:
    "rgba(255,255,255,0.72)",
  fontSize: "11px",
  fontWeight: 650,
  overflowWrap: "anywhere",
};

const notesBox: React.CSSProperties = {
  marginTop: "10px",
  padding: "13px",
  borderRadius: "12px",
  background:
    "rgba(255,255,255,0.025)",
};

const participantList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "7px",
};

const participantRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "11px",
  borderRadius: "11px",
  background:
    "rgba(255,255,255,0.025)",
};

const participantAvatar: React.CSSProperties = {
  width: "34px",
  height: "34px",
  flexShrink: 0,
  borderRadius: "9px",
  background:
    "rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  fontWeight: 700,
};

const mutedText: React.CSSProperties = {
  display: "block",
  marginTop: "3px",
  color:
    "rgba(255,255,255,0.28)",
  fontSize: "9px",
};

const countBadge: React.CSSProperties = {
  minWidth: "25px",
  height: "25px",
  padding: "0 7px",
  borderRadius: "8px",
  background:
    "rgba(255,255,255,0.06)",
  color:
    "rgba(255,255,255,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  fontWeight: 700,
};

const miniEmpty: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "13px",
  borderRadius: "11px",
  background:
    "rgba(255,255,255,0.025)",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "11px",
};

const fileList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "7px",
};

const fileRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  borderRadius: "11px",
  background:
    "rgba(255,255,255,0.025)",
};

const fileIcon: React.CSSProperties = {
  width: "34px",
  height: "34px",
  flexShrink: 0,
  borderRadius: "9px",
  background:
    "rgba(255,255,255,0.06)",
  color:
    "rgba(255,255,255,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const fileActions: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
};

const fileAction: React.CSSProperties = {
  minHeight: "32px",
  padding: "7px 9px",
  borderRadius: "8px",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "10px",
  border: 0,
  cursor: "pointer",
};

const deleteButton: React.CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  border:
    "1px solid rgba(248,113,113,0.12)",
  background:
    "rgba(248,113,113,0.05)",
  color: "#f87171",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const detailTimeline: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const detailTimelineRow: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  padding: "11px 0",
};

const detailTimelineLine: React.CSSProperties = {
  width: "12px",
  position: "relative",
  flexShrink: 0,
};

const detailTimelineDot: React.CSSProperties = {
  width: "9px",
  height: "9px",
  marginTop: "5px",
  borderRadius: "50%",
  background:
    "rgba(255,255,255,0.6)",
};

const timelineDescription: React.CSSProperties = {
  margin: 0,
  color:
    "rgba(255,255,255,0.62)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const statusExplanation: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "7px",
};

const statusOption: React.CSSProperties = {
  width: "100%",
  minHeight: "57px",
  padding: "10px",
  borderRadius: "11px",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  gap: "9px",
  cursor: "pointer",
};

const statusOptionCheck: React.CSSProperties = {
  width: "25px",
  height: "25px",
  flexShrink: 0,
  borderRadius: "8px",
  background:
    "rgba(255,255,255,0.09)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const imageViewer: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10001,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background:
    "rgba(0,0,0,0.93)",
  backdropFilter: "blur(15px)",
};

const imageViewerImage: React.CSSProperties = {
  maxWidth: "94vw",
  maxHeight: "88vh",
  objectFit: "contain",
  borderRadius: "14px",
};

const imageViewerClose: React.CSSProperties = {
  position: "absolute",
  top: "20px",
  right: "20px",
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  border:
    "1px solid rgba(255,255,255,0.15)",
  background:
    "rgba(255,255,255,0.08)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const footer: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  padding: "20px 4px 5px",
  color:
    "rgba(255,255,255,0.22)",
  fontSize: "9px",
};