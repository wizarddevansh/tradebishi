"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  File,
  FileImage,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Lock,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserPlus,
  UserRound,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type TradeStatus = "ongoing" | "successful" | "failed";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type Trader = {
  id: string;
  full_name: string | null;
};

type Member = {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  investment_amount: number | null;
  profit_share: number | null;
  status: string | null;
  created_at: string;
};

type Trade = {
  id: string;
  trade_name: string;
  invested_amount: number;
  approx_return: number;
  status: TradeStatus;
  trade_date: string;
  notes: string | null;
  trader_id: string | null;
  is_closed: boolean;
};

type TradeMember = {
  id: string;
  trade_id: string;
  member_id: string;
  invested_amount: number;
  profit_share: number | null;
  created_at: string;
  member?: Member | null;
};

type TradeFile = {
  id: string;
  trade_id: string;
  category: string;
  file_url: string;
  created_at: string;
};

type TradeLog = {
  id: string;
  trade_id: string;
  description: string;
  created_at: string;
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function numberValue(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function tradeProfit(trade: Trade) {
  return Number(trade.approx_return || 0) - Number(trade.invested_amount || 0);
}

function statusLabel(status: TradeStatus) {
  if (status === "successful") return "Profit";
  if (status === "failed") return "Invested Money Returned";
  return "Ongoing";
}

function statusClasses(status: TradeStatus) {
  if (status === "successful")
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

  if (status === "failed")
    return "border-sky-400/20 bg-sky-400/10 text-sky-300";

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function fileCategoryLabel(category: string) {
  if (category === "agreement") return "Agreement";
  if (category === "receipt") return "Receipt";
  if (category === "payment_proof") return "Payment Proof";
  return "Other";
}

function fileIcon(category: string) {
  if (category === "agreement") return FileText;
  if (category === "receipt") return File;
  if (category === "payment_proof") return FileImage;
  return FolderOpen;
}

function getErrorMessage(
  err: any,
  fallback: string,
) {
  if (typeof err === "string" && err.trim()) return err;

  return (
    err?.message ||
    err?.details ||
    err?.hint ||
    fallback
  );
}

export default function AdminTradesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedTraderId, setSelectedTraderId] = useState("");
  const [savingTrader, setSavingTrader] = useState(false);

  const [tradeMembers, setTradeMembers] = useState<TradeMember[]>([]);
  const [tradeFiles, setTradeFiles] = useState<TradeFile[]>([]);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDistributionModal, setShowDistributionModal] =
    useState(false);
  const [showAddMemberModal, setShowAddMemberModal] =
    useState(false);

  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const [editingMember, setEditingMember] =
    useState<TradeMember | null>(null);

  const [newTradeName, setNewTradeName] = useState("");
  const [newInvestedAmount, setNewInvestedAmount] = useState("");
  const [newApproxReturn, setNewApproxReturn] = useState("");
  const [newTradeDate, setNewTradeDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberInvestment, setMemberInvestment] = useState("");
  const [memberProfitShare, setMemberProfitShare] = useState("");

  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [distributing, setDistributing] = useState(false);

  async function verifyAdmin() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return null;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!data) {
      router.replace("/login");
      return null;
    }

    if (data.role !== "admin") {
      if (data.role === "trader") {
        router.replace("/trader");
      } else {
        router.replace("/dashboard");
      }

      return null;
    }

    setProfile(data as Profile);
    return user;
  }

  async function loadTrades(showRefresh = false) {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const user = await verifyAdmin();
      if (!user) return;

      const { data: tradeData, error: tradeError } =
        await supabase
          .from("trades")
          .select(
            "id, trade_name, invested_amount, approx_return, status, trade_date, notes, trader_id, is_closed",
          )
          .order("trade_date", { ascending: false });

      if (tradeError) throw tradeError;

      const { data: memberData, error: memberError } =
        await supabase
          .from("members")
          .select(
            "id, user_id, full_name, phone, investment_amount, profit_share, status, created_at",
          )
          .order("full_name", { ascending: true });

      if (memberError) throw memberError;

      const { data: traderData, error: traderError } =
        await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "trader")
          .order("full_name", { ascending: true });

      if (traderError) throw traderError;

      setTrades((tradeData || []) as Trade[]);
      setMembers((memberData || []) as Member[]);
      setTraders((traderData || []) as Trader[]);
    } catch (err) {
      console.error(
        "TradeBishi Admin Trades load error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Unable to load trades.",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadTradeDetails(trade: Trade) {
    try {
      setDetailLoading(true);
      setError("");
      setSuccessMessage("");
      setSelectedTrade(trade);
      setSelectedTraderId(trade.trader_id || "");

      const [
        membersResponse,
        filesResponse,
        logsResponse,
      ] = await Promise.all([
        supabase
          .from("trade_members")
          .select(
            "id, trade_id, member_id, invested_amount, profit_share, created_at",
          )
          .eq("trade_id", trade.id)
          .order("created_at", { ascending: true }),

        supabase
          .from("trade_files")
          .select(
            "id, trade_id, category, file_url, created_at",
          )
          .eq("trade_id", trade.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("trade_logs")
          .select(
            "id, trade_id, description, created_at",
          )
          .eq("trade_id", trade.id)
          .order("created_at", { ascending: false }),
      ]);

      if (membersResponse.error)
        throw membersResponse.error;

      if (filesResponse.error)
        throw filesResponse.error;

      if (logsResponse.error)
        throw logsResponse.error;

      const assignments =
        (membersResponse.data || []) as TradeMember[];

      setTradeMembers(
        assignments.map((item) => ({
          ...item,
          member:
            members.find(
              (member) => member.id === item.member_id,
            ) || null,
        })),
      );

      setTradeFiles(
        (filesResponse.data || []) as TradeFile[],
      );

      setTradeLogs(
        (logsResponse.data || []) as TradeLog[],
      );
    } catch (err) {
      console.error(
        "TradeBishi Admin Trades detail error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Unable to load trade details.",
        ),
      );
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadTrades();
  }, []);

  async function addTradeLog(
    tradeId: string,
    description: string,
  ) {
    const { data, error } = await supabase
      .from("trade_logs")
      .insert({
        trade_id: tradeId,
        description,
      })
      .select(
        "id, trade_id, description, created_at",
      )
      .maybeSingle();

    if (error) throw error;

    if (data) {
      setTradeLogs((current) => [
        data as TradeLog,
        ...current,
      ]);
    }
  }

  async function createTrade() {
    const invested = numberValue(newInvestedAmount);
    const expectedReturn = numberValue(newApproxReturn);

    if (!newTradeName.trim()) {
      setError("Trade name is required.");
      return;
    }

    if (invested <= 0) {
      setError("Trade investment must be greater than zero.");
      return;
    }

    if (expectedReturn <= 0) {
      setError("Expected return must be greater than zero.");
      return;
    }

    if (!newTradeDate) {
      setError("Trade date is required.");
      return;
    }

    if (!selectedTraderId) {
      setError("Select a trader for this trade.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const user = await verifyAdmin();
      if (!user) return;

      const { data, error: insertError } =
        await supabase
          .from("trades")
          .insert({
            trade_name: newTradeName.trim(),
            invested_amount: invested,
            approx_return: expectedReturn,
            status: "ongoing",
            trade_date: newTradeDate,
            notes: newNotes.trim() || null,
            trader_id: selectedTraderId,
            is_closed: false,
          })
          .select(
            "id, trade_name, invested_amount, approx_return, status, trade_date, notes, trader_id, is_closed",
          )
          .maybeSingle();

      if (insertError) throw insertError;

      if (!data) {
        throw new Error(
          "Trade was created but could not be loaded.",
        );
      }

      await addTradeLog(
        data.id,
        "Trade created by Admin.",
      );

      setTrades((current) => [
        data as Trade,
        ...current,
      ]);

      setNewTradeName("");
      setNewInvestedAmount("");
      setNewApproxReturn("");
      setNewTradeDate("");
      setNewNotes("");
      setSelectedTraderId("");
      setShowCreateModal(false);
      setSuccessMessage("Trade created successfully.");
    } catch (err) {
      console.error(
        "TradeBishi create trade error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Unable to create trade.",
        ),
      );
    } finally {
      setCreating(false);
    }
  }

  async function updateTradeStatus(
    newStatus: TradeStatus,
  ) {
    if (!selectedTrade) return;

    if (selectedTrade.status === newStatus) {
      setShowStatusMenu(false);
      return;
    }

    const oldLabel = statusLabel(
      selectedTrade.status,
    );
    const newLabel = statusLabel(newStatus);

    try {
      setError("");

      const { data, error: updateError } =
        await supabase
          .from("trades")
          .update({
            status: newStatus,
          })
          .eq("id", selectedTrade.id)
          .select(
            "id, trade_name, invested_amount, approx_return, status, trade_date, notes, trader_id, is_closed",
          )
          .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "Trade status was not updated.",
        );
      }

      const description = selectedTrade.is_closed
        ? `Post-close Admin change: Trade status changed from ${oldLabel} to ${newLabel}.`
        : `Admin changed trade status from ${oldLabel} to ${newLabel}.`;

      await addTradeLog(
        selectedTrade.id,
        description,
      );

      const updated = data as Trade;

      setSelectedTrade(updated);

      setTrades((current) =>
        current.map((trade) =>
          trade.id === updated.id
            ? updated
            : trade,
        ),
      );

      setShowStatusMenu(false);
      setSuccessMessage(
        selectedTrade.is_closed
          ? "Closed trade status changed. The change was recorded."
          : "Trade status updated.",
      );
    } catch (err) {
      console.error(
        "TradeBishi status update error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Unable to update trade status.",
        ),
      );
    }
  }

  function openAddMemberModal() {
    setSelectedMemberId("");
    setMemberInvestment("");
    setMemberProfitShare("");
    setMemberSearch("");
    setShowAddMemberModal(true);
  }

  async function addMemberToTrade() {
    if (!selectedTrade) return;

    if (!selectedMemberId) {
      setError("Select a member.");
      return;
    }

    const investment = numberValue(memberInvestment);
    const share = numberValue(memberProfitShare);

    if (investment <= 0) {
      setError(
        "Participation amount must be greater than zero.",
      );
      return;
    }

    if (share < 0 || share > 100) {
      setError(
        "Profit share must be between 0% and 100%.",
      );
      return;
    }

    if (
      tradeMembers.some(
        (item) => item.member_id === selectedMemberId,
      )
    ) {
      setError(
        "This member is already participating in this trade.",
      );
      return;
    }

    const currentTotal = tradeMembers.reduce(
      (sum, item) =>
        sum + Number(item.invested_amount || 0),
      0,
    );

    if (
      currentTotal + investment >
      Number(selectedTrade.invested_amount || 0) +
        0.01
    ) {
      setError(
        `The member directory cannot exceed ${money(
          selectedTrade.invested_amount,
        )}.`,
      );
      return;
    }

    try {
      setSavingMember(true);
      setError("");

      const { data, error: insertError } =
        await supabase
          .from("trade_members")
          .insert({
            trade_id: selectedTrade.id,
            member_id: selectedMemberId,
            invested_amount: investment,
            profit_share: share,
          })
          .select(
            "id, trade_id, member_id, invested_amount, profit_share, created_at",
          )
          .maybeSingle();

      if (insertError) throw insertError;

      if (!data) {
        throw new Error(
          "Member was added but could not be loaded.",
        );
      }

      const member =
        members.find(
          (item) => item.id === selectedMemberId,
        ) || null;

      const description = selectedTrade.is_closed
        ? `Post-close Admin change: Added ${
            member?.full_name || "a member"
          } to the trade directory with ${money(
            investment,
          )} participation and ${share.toFixed(
            2,
          )}% profit share.`
        : `Admin added ${
            member?.full_name || "a member"
          } to the trade directory with ${money(
            investment,
          )} participation and ${share.toFixed(
            2,
          )}% profit share.`;

      await addTradeLog(
        selectedTrade.id,
        description,
      );

      setTradeMembers((current) => [
        ...current,
        {
          ...(data as TradeMember),
          member,
        },
      ]);

      setShowAddMemberModal(false);
      setSuccessMessage(
        selectedTrade.is_closed
          ? "Member added. Post-close Admin change recorded."
          : "Member added to trade directory.",
      );
    } catch (err) {
      console.error(
        "TradeBishi add member error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Unable to add member.",
        ),
      );
    } finally {
      setSavingMember(false);
    }
  }

  function openEditMember(
    assignment: TradeMember,
  ) {
    setEditingMember(assignment);

    setMemberInvestment(
      String(assignment.invested_amount || ""),
    );

    setMemberProfitShare(
      assignment.profit_share == null
        ? ""
        : String(assignment.profit_share),
    );
  }

  async function saveMemberChanges() {
    if (!selectedTrade || !editingMember) return;

    const investment = numberValue(memberInvestment);
    const share = numberValue(memberProfitShare);

    if (investment <= 0) {
      setError(
        "Participation amount must be greater than zero.",
      );
      return;
    }

    if (share < 0 || share > 100) {
      setError(
        "Profit share must be between 0% and 100%.",
      );
      return;
    }

    const totalExcluding = tradeMembers.reduce(
      (sum, item) =>
        item.id === editingMember.id
          ? sum
          : sum + Number(item.invested_amount || 0),
      0,
    );

    if (
      totalExcluding + investment >
      Number(selectedTrade.invested_amount || 0) +
        0.01
    ) {
      setError(
        `The member directory cannot exceed ${money(
          selectedTrade.invested_amount,
        )}.`,
      );
      return;
    }

    try {
      setSavingMember(true);
      setError("");

      const memberName =
        editingMember.member?.full_name ||
        "Member";

      const { data, error: updateError } =
        await supabase
          .from("trade_members")
          .update({
            invested_amount: investment,
            profit_share: share,
          })
          .eq("id", editingMember.id)
          .eq("trade_id", selectedTrade.id)
          .select(
            "id, trade_id, member_id, invested_amount, profit_share, created_at",
          )
          .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "Member participation was not updated.",
        );
      }

      const description = selectedTrade.is_closed
        ? `Post-close Admin change: Updated ${memberName}'s trade participation to ${money(
            investment,
          )} with ${share.toFixed(
            2,
          )}% profit share.`
        : `Admin updated ${memberName}'s trade participation to ${money(
            investment,
          )} with ${share.toFixed(
            2,
          )}% profit share.`;

      await addTradeLog(
        selectedTrade.id,
        description,
      );

      setTradeMembers((current) =>
        current.map((item) =>
          item.id === editingMember.id
            ? {
                ...(data as TradeMember),
                member: item.member,
              }
            : item,
        ),
      );

      setEditingMember(null);

      setSuccessMessage(
        selectedTrade.is_closed
          ? "Closed trade member details updated and recorded."
          : "Member participation updated.",
      );
    } catch (err) {
      console.error(
        "TradeBishi member update error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Unable to update member.",
        ),
      );
    } finally {
      setSavingMember(false);
    }
  }

  async function removeMember(
    assignment: TradeMember,
  ) {
    if (!selectedTrade) return;

    const memberName =
      assignment.member?.full_name || "Member";

    if (
      !window.confirm(
        `Remove ${memberName} from this trade directory?`,
      )
    ) {
      return;
    }

    try {
      setError("");

      const { error: deleteError } =
        await supabase
          .from("trade_members")
          .delete()
          .eq("id", assignment.id)
          .eq("trade_id", selectedTrade.id);

      if (deleteError) throw deleteError;

      const description = selectedTrade.is_closed
        ? `Post-close Admin change: Removed ${memberName} from the trade directory.`
        : `Admin removed ${memberName} from the trade directory.`;

      await addTradeLog(
        selectedTrade.id,
        description,
      );

      setTradeMembers((current) =>
        current.filter(
          (item) => item.id !== assignment.id,
        ),
      );

      setSuccessMessage(
        selectedTrade.is_closed
          ? "Member removed. Post-close Admin change recorded."
          : "Member removed from trade.",
      );
    } catch (err) {
      console.error(
        "TradeBishi remove member error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Unable to remove member.",
        ),
      );
    }
  }

  async function uploadFile(
    event: React.ChangeEvent<HTMLInputElement>,
    category: string,
  ) {
    if (!selectedTrade) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");

      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-");

      const path = `${selectedTrade.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}-${safeName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("trade-photos")
          .upload(path, file, {
            upsert: false,
          });

      if (uploadError) throw uploadError;

      const { data: publicData } =
        supabase.storage
          .from("trade-photos")
          .getPublicUrl(path);

      const { data, error: insertError } =
        await supabase
          .from("trade_files")
          .insert({
            trade_id: selectedTrade.id,
            category,
            file_url: publicData.publicUrl,
          })
          .select(
            "id, trade_id, category, file_url, created_at",
          )
          .maybeSingle();

      if (insertError) throw insertError;

      if (!data) {
        throw new Error(
          "File uploaded but could not be recorded.",
        );
      }

      const description = selectedTrade.is_closed
        ? `Post-close Admin change: Uploaded ${fileCategoryLabel(
            category,
          )}: ${file.name}`
        : `Admin uploaded ${fileCategoryLabel(
            category,
          )}: ${file.name}`;

      await addTradeLog(
        selectedTrade.id,
        description,
      );

      setTradeFiles((current) => [
        data as TradeFile,
        ...current,
      ]);

      setSuccessMessage(
        selectedTrade.is_closed
          ? "File uploaded. Post-close Admin change recorded."
          : "File uploaded successfully.",
      );
    } catch (err) {
      console.error(
        "TradeBishi upload error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Unable to upload file.",
        ),
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function openTradeFile(file: TradeFile) {
    try {
      setError("");

      const marker = "/trade-photos/";
      const markerIndex = file.file_url.indexOf(marker);

      if (markerIndex === -1) {
        window.open(file.file_url, "_blank", "noopener,noreferrer");
        return;
      }

      const storagePath = decodeURIComponent(
        file.file_url.slice(markerIndex + marker.length),
      );

      const { data, error: signedUrlError } =
        await supabase.storage
          .from("trade-photos")
          .createSignedUrl(storagePath, 3600);

      if (signedUrlError) throw signedUrlError;

      if (!data?.signedUrl) {
        throw new Error("Unable to create a secure file URL.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("TradeBishi file open error:", err);
      setError(
        getErrorMessage(
          err,
          "Unable to open this trade file.",
        ),
      );
    }
  }

  async function deleteFile(file: TradeFile) {
    if (!selectedTrade) return;

    if (
      !window.confirm("Delete this trade file?")
    ) {
      return;
    }

    try {
      setError("");

      const marker = "/trade-photos/";

      if (file.file_url.includes(marker)) {
        const storagePath =
          file.file_url.split(marker)[1];

        const { error: storageError } =
          await supabase.storage
            .from("trade-photos")
            .remove([storagePath]);

        if (storageError) {
          console.warn(
            "Storage deletion warning:",
            storageError,
          );
        }
      }

      const { error: deleteError } =
        await supabase
          .from("trade_files")
          .delete()
          .eq("id", file.id);

      if (deleteError) throw deleteError;

      const description = selectedTrade.is_closed
        ? `Post-close Admin change: Deleted ${fileCategoryLabel(
            file.category,
          )} file.`
        : `Admin deleted ${fileCategoryLabel(
            file.category,
          )} file.`;

      await addTradeLog(
        selectedTrade.id,
        description,
      );

      setTradeFiles((current) =>
        current.filter(
          (item) => item.id !== file.id,
        ),
      );

      setSuccessMessage(
        selectedTrade.is_closed
          ? "File deleted. Post-close Admin change recorded."
          : "File deleted.",
      );
    } catch (err) {
      console.error(
        "TradeBishi delete file error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete file.",
        ),
      );
    }
  }

  async function saveTradeTrader() {
    if (!selectedTrade) return;
    if (!selectedTraderId) {
      setError("Select a trader.");
      return;
    }

    try {
      setSavingTrader(true);
      setError("");

      const { data, error } = await supabase
        .from("trades")
        .update({ trader_id: selectedTraderId })
        .eq("id", selectedTrade.id)
        .select("id, trade_name, invested_amount, approx_return, status, trade_date, notes, trader_id, is_closed")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Trade trader assignment was not saved.");

      const updated = data as Trade;
      setSelectedTrade(updated);
      setTrades((current) => current.map((trade) => trade.id === updated.id ? updated : trade));
      await addTradeLog(updated.id, `Admin assigned trade to trader ${traders.find((t) => t.id === selectedTraderId)?.full_name || selectedTraderId}.`);
      setSuccessMessage("Trader assignment saved. The trade is now linked to that trader dashboard.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to assign trader."));
    } finally {
      setSavingTrader(false);
    }
  }

  async function distributeTrade() {
    if (!selectedTrade) return;

    if (selectedTrade.is_closed) {
      setError(
        "This trade has already been distributed and closed.",
      );
      return;
    }

    if (selectedTrade.status !== "successful") {
      setError(
        "Only a trade marked Profit can be distributed.",
      );
      return;
    }

    if (tradeMembers.length === 0) {
      setError(
        "Distribution requires participating members.",
      );
      return;
    }

    const tradeInvestment = Number(
      selectedTrade.invested_amount || 0,
    );

    const finalReturn = Number(
      selectedTrade.approx_return || 0,
    );

    const directoryTotal = tradeMembers.reduce(
      (sum, item) =>
        sum + Number(item.invested_amount || 0),
      0,
    );

    if (
      Math.abs(directoryTotal - tradeInvestment) >
      0.01
    ) {
      setError(
        `Distribution blocked. Trade investment is ${money(
          tradeInvestment,
        )}, while the member directory totals ${money(
          directoryTotal,
        )}. They must exactly match.`,
      );
      return;
    }

    const profit = finalReturn - tradeInvestment;

    const rows = tradeMembers.map((item) => {
      const invested = Number(
        item.invested_amount || 0,
      );

      const percentage =
        tradeInvestment > 0
          ? invested / tradeInvestment
          : 0;

      const returned =
        finalReturn * percentage;

      return {
        item,
        invested,
        percentage,
        returned,
        profit: returned - invested,
      };
    });

    const summary = rows
      .map(
        (row) =>
          `${
            row.item.member?.full_name ||
            row.item.member_id
          }: invested ${money(
            row.invested,
          )}, return ${money(
            row.returned,
          )}, profit ${money(row.profit)}`,
      )
      .join(" | ");

    const confirmed = window.confirm(
      `Confirm distribution of ${money(
        finalReturn,
      )}?\n\nDirectory members: ${
        rows.length
      }\nTotal investment: ${money(
        tradeInvestment,
      )}\nTotal return: ${money(
        finalReturn,
      )}\nTotal profit: ${money(
        profit,
      )}\n\nThe trade will be CLOSED.`,
    );

    if (!confirmed) return;

    let insertedReturnTransactionIds: string[] = [];

    try {
      setDistributing(true);
      setError("");

      /*
       * IMPORTANT:
       * Distribution is calculated ONLY from trade_members.
       * members.investment_amount is not used.
       */

      const distributionDescription =
        `Trade distributed by Admin. Final return: ${money(
          finalReturn,
        )}. Total profit: ${money(
          profit,
        )}. Directory-based distribution: ${summary}`;

      /*
       * First record the financial distribution.
       */
      const returnTransactions = rows.map((row) => ({
        member_id: row.item.member_id,
        type: "trade_return",
        amount: row.returned,
        description: `Return from trade: ${selectedTrade.trade_name}`,
        status: "completed",
      }));

      const { data: insertedReturnTransactions, error: returnTransactionError } = await supabase
        .from("transactions")
        .insert(returnTransactions)
        .select("id");

      if (returnTransactionError) {
        throw new Error(`Distribution could not be recorded in member balances: ${returnTransactionError.message}`);
      }

      insertedReturnTransactionIds = (insertedReturnTransactions ?? []).map((row) => String(row.id));

      const { error: distributionLogError } =
        await supabase
          .from("trade_logs")
          .insert({
            trade_id: selectedTrade.id,
            description: distributionDescription,
          });

      if (distributionLogError) {
        throw distributionLogError;
      }

      /*
       * Then close the trade.
       *
       * The is_closed:false condition prevents a second
       * distribution from closing an already closed trade.
       */
      const { data: closedTrade, error: closeError } =
        await supabase
          .from("trades")
          .update({
            is_closed: true,
          })
          .eq("id", selectedTrade.id)
          .eq("is_closed", false)
          .select(
            "id, trade_name, invested_amount, approx_return, status, trade_date, notes, trader_id, is_closed",
          )
          .maybeSingle();

      if (closeError) {
        throw closeError;
      }

      if (!closedTrade) {
        throw new Error(
          "Distribution was recorded, but the trade could not be closed. Check the trade status before retrying.",
        );
      }

      const closedDescription =
        "Trade distribution completed. Trade is now CLOSED. Only Admin may make further changes, and all such changes must be recorded.";

      /*
       * The trade is already closed here.
       *
       * If this logging step fails, we DO NOT incorrectly say
       * that the trade was not closed.
       */
      const { error: closeLogError } =
        await supabase
          .from("trade_logs")
          .insert({
            trade_id: selectedTrade.id,
            description: closedDescription,
          });

      setSelectedTrade(closedTrade as Trade);

      setTrades((current) =>
        current.map((trade) =>
          trade.id === selectedTrade.id
            ? (closedTrade as Trade)
            : trade,
        ),
      );

      setShowDistributionModal(false);

      if (closeLogError) {
        console.error(
          "TradeBishi post-distribution logging error:",
          closeLogError,
        );

        setSuccessMessage(
          "Distribution completed and trade closed, but the final closure log could not be written. Check Supabase trade_logs permissions.",
        );

        setError(
          getErrorMessage(
            closeLogError,
            "The trade is closed, but the final activity log failed.",
          ),
        );
      } else {
        setTradeLogs((current) => [
          {
            id: crypto.randomUUID(),
            trade_id: selectedTrade.id,
            description: closedDescription,
            created_at:
              new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            trade_id: selectedTrade.id,
            description:
              distributionDescription,
            created_at:
              new Date().toISOString(),
          },
          ...current,
        ]);

        setSuccessMessage(
          "Distribution recorded and trade permanently closed.",
        );
      }
    } catch (err) {
      if (insertedReturnTransactionIds.length > 0) {
        const { error: rollbackError } = await supabase
          .from("transactions")
          .delete()
          .in("id", insertedReturnTransactionIds);

        if (rollbackError) {
          console.error("TradeBishi distribution rollback error:", rollbackError);
        }
      }

      console.error(
        "TradeBishi distribution error:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Distribution failed.",
        ),
      );
    } finally {
      setDistributing(false);
    }
  }

  const filteredTrades = trades.filter((trade) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      trade.trade_name
        .toLowerCase()
        .includes(query) ||
      statusLabel(trade.status)
        .toLowerCase()
        .includes(query)
    );
  });

  const filteredMembers = members.filter(
    (member) => {
      const query =
        memberSearch.trim().toLowerCase();

      if (!query) return true;

      return (
        member.full_name
          .toLowerCase()
          .includes(query) ||
        (member.phone || "")
          .toLowerCase()
          .includes(query)
      );
    },
  );

  const directoryTotal = tradeMembers.reduce(
    (sum, item) =>
      sum + Number(item.invested_amount || 0),
    0,
  );

  const directoryDifference =
    Number(
      selectedTrade?.invested_amount || 0,
    ) - directoryTotal;

  const expectedProfit = selectedTrade
    ? tradeProfit(selectedTrade)
    : 0;

  const stats = {
    total: trades.length,

    ongoing: trades.filter(
      (trade) =>
        trade.status === "ongoing" &&
        !trade.is_closed,
    ).length,

    profit: trades.filter(
      (trade) =>
        trade.status === "successful",
    ).length,

    closed: trades.filter(
      (trade) => trade.is_closed,
    ).length,

    capital: trades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.invested_amount || 0,
        ),
      0,
    ),
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Admin Trades...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-[245px] shrink-0 border-r border-white/[0.07] bg-[#080808] px-4 py-6 lg:flex lg:flex-col">
          <div className="mb-10 px-3">
            <div className="text-xl font-semibold">
              TradeBishi
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Admin Console
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() =>
                router.push("/admin")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-500 hover:bg-white/[0.05] hover:text-white"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            <button
              className="flex w-full items-center gap-3 rounded-xl bg-white/[0.08] px-3 py-3 text-sm font-medium text-white"
            >
              <TrendingUp className="h-4 w-4" />
              Trades
            </button>

            <button
              onClick={() =>
                router.push("/admin/members")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-500 hover:bg-white/[0.05] hover:text-white"
            >
              <Users className="h-4 w-4" />
              Members
            </button>
          </nav>

          <div className="mt-auto">
            <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08]">
                  <ShieldCheck className="h-4 w-4 text-zinc-300" />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {profile?.full_name ||
                      "Admin"}
                  </div>

                  <div className="text-xs text-zinc-500">
                    Administrator
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-500 hover:bg-white/[0.05] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10">
            <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                  <span>Admin</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-zinc-300">
                    Trades
                  </span>
                </div>

                <h1 className="text-3xl font-semibold">
                  Trades
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                  Review trades, manage participating
                  members, control participation and
                  profit shares, and distribute completed
                  trades.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    loadTrades(true)
                  }
                  className="flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                >
                  <RefreshCw
                    className={
                      refreshing
                        ? "h-4 w-4 animate-spin"
                        : "h-4 w-4"
                    }
                  />
                  Refresh
                </button>

                <button
                  onClick={() => {
                    setError("");
                    setShowCreateModal(true);
                  }}
                  className="flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black hover:bg-zinc-200"
                >
                  <Plus className="h-4 w-4" />
                  New Trade
                </button>
              </div>
            </header>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-300">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">
                  {error}
                </span>

                <button
                  onClick={() =>
                    setError("")
                  }
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm text-emerald-300">
                <Check className="mt-0.5 h-4 w-4" />

                <span className="flex-1">
                  {successMessage}
                </span>

                <button
                  onClick={() =>
                    setSuccessMessage("")
                  }
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                icon={TrendingUp}
                label="Total Trades"
                value={String(stats.total)}
              />

              <StatCard
                icon={Clock3}
                label="Ongoing"
                value={String(stats.ongoing)}
              />

              <StatCard
                icon={CircleDollarSign}
                label="Profit Trades"
                value={String(stats.profit)}
              />

              <StatCard
                icon={Lock}
                label="Closed"
                value={String(stats.closed)}
              />

              <StatCard
                icon={Activity}
                label="Trade Capital"
                value={money(stats.capital)}
              />
            </div>

            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4">
              <Search className="h-4 w-4 text-zinc-600" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search trades..."
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600"
              />

              {search && (
                <button
                  onClick={() =>
                    setSearch("")
                  }
                >
                  <X className="h-4 w-4 text-zinc-600 hover:text-white" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredTrades.length === 0 ? (
                <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] py-20 text-center">
                  <TrendingUp className="mx-auto mb-4 h-8 w-8 text-zinc-700" />
                  <div className="text-sm text-zinc-300">
                    No trades found
                  </div>
                </div>
              ) : (
                filteredTrades.map((trade) => (
                  <button
                    key={trade.id}
                    onClick={() =>
                      loadTradeDetails(trade)
                    }
                    className="group w-full rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-left hover:border-white/[0.12] hover:bg-white/[0.04]"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                          {trade.is_closed ? (
                            <Lock className="h-5 w-5 text-zinc-400" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-zinc-300" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-semibold">
                              {trade.trade_name}
                            </h2>

                            {trade.is_closed && (
                              <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase text-zinc-300">
                                Closed
                              </span>
                            )}
                          </div>

                          <div className="mt-1 text-xs text-zinc-600">
                            {formatDate(
                              trade.trade_date,
                            )}{" "}
                            •{" "}
                            {money(
                              trade.invested_amount,
                            )}{" "}
                            invested
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:w-[600px]">
                        <MiniValue
                          label="Investment"
                          value={money(
                            trade.invested_amount,
                          )}
                        />

                        <MiniValue
                          label="Expected Return"
                          value={money(
                            trade.approx_return,
                          )}
                        />

                        <MiniValue
                          label="Expected Profit"
                          value={money(
                            tradeProfit(trade),
                          )}
                          positive={
                            tradeProfit(trade) >= 0
                          }
                        />

                        <div>
                          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">
                            Status
                          </div>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] ${statusClasses(
                              trade.status,
                            )}`}
                          >
                            {statusLabel(
                              trade.status,
                            )}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="hidden h-5 w-5 text-zinc-700 lg:block" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {selectedTrade && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="mx-auto my-4 max-w-6xl rounded-[28px] border border-white/[0.08] bg-[#0b0b0b] shadow-2xl">
            <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0b0b0b]/95 px-5 py-5 backdrop-blur-xl sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <button
                    onClick={() =>
                      setSelectedTrade(null)
                    }
                    className="mb-3 flex items-center gap-2 text-xs text-zinc-500 hover:text-white"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to trades
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold">
                      {selectedTrade.trade_name}
                    </h2>

                    {selectedTrade.is_closed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-300">
                        <Lock className="h-3 w-3" />
                        CLOSED
                      </span>
                    ) : (
                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs ${statusClasses(
                          selectedTrade.status,
                        )}`}
                      >
                        {statusLabel(
                          selectedTrade.status,
                        )}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs text-zinc-600">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(
                      selectedTrade.trade_date,
                    )}
                    <span>•</span>
                    ID {selectedTrade.id}
                  </div>
                </div>

                <button
                  onClick={() =>
                    setSelectedTrade(null)
                  }
                  className="rounded-xl p-2 text-zinc-500 hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {selectedTrade.is_closed && (
                <div className="mb-6 flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />

                  <div>
                    <div className="text-sm font-semibold">
                      This trade is closed
                    </div>

                    <div className="mt-1 text-xs leading-5 text-zinc-500">
                      Traders and members have
                      read-only access. Admin can still
                      make changes, and every post-close
                      modification is recorded in the
                      cooperative activity log.
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailCard
                  label="Trade Investment"
                  value={money(
                    selectedTrade.invested_amount,
                  )}
                />

                <DetailCard
                  label="Return Expected Including Investment"
                  value={money(
                    selectedTrade.approx_return,
                  )}
                />

                <DetailCard
                  label="Expected Profit"
                  value={money(expectedProfit)}
                  positive={
                    expectedProfit >= 0
                  }
                />

                <DetailCard
                  label="Members"
                  value={String(
                    tradeMembers.length,
                  )}
                />
              </div>

              <section className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-zinc-400" />
                      <h3 className="font-semibold">Assigned Trader</h3>
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">Only the assigned trader can see this trade in the Trader Dashboard.</p>
                  </div>
                  <button
                    onClick={saveTradeTrader}
                    disabled={savingTrader || !selectedTraderId}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-black disabled:opacity-40"
                  >
                    {savingTrader ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save Trader
                  </button>
                </div>
                <select
                  value={selectedTraderId}
                  onChange={(e) => setSelectedTraderId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-white outline-none"
                >
                  <option value="" className="bg-zinc-950">Unassigned</option>
                  {traders.map((trader) => (
                    <option key={trader.id} value={trader.id} className="bg-zinc-950">
                      {trader.full_name || "Unnamed trader"}
                    </option>
                  ))}
                </select>
              </section>

              <section className="mb-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-400" />
                      <h3 className="text-base font-semibold">
                        Trade Member Directory
                      </h3>
                    </div>

                    <p className="mt-1 text-xs text-zinc-600">
                      Distribution is calculated
                      strictly from this directory.
                    </p>
                  </div>

                  <button
                    onClick={
                      openAddMemberModal
                    }
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-black hover:bg-zinc-200"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Member
                  </button>
                </div>

                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <DirectorySummary
                    label="Trade Investment"
                    value={money(
                      selectedTrade.invested_amount,
                    )}
                  />

                  <DirectorySummary
                    label="Directory Total"
                    value={money(
                      directoryTotal,
                    )}
                    warning={
                      Math.abs(
                        directoryDifference,
                      ) > 0.01
                    }
                  />

                  <DirectorySummary
                    label="Difference"
                    value={money(
                      directoryDifference,
                    )}
                    warning={
                      Math.abs(
                        directoryDifference,
                      ) > 0.01
                    }
                  />
                </div>

                {tradeMembers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[0.09] p-12 text-center">
                    <Users className="mx-auto mb-3 h-7 w-7 text-zinc-700" />
                    <div className="text-sm text-zinc-400">
                      No participating members
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
                    <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_100px] gap-4 border-b border-white/[0.06] bg-white/[0.025] px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600 md:grid">
                      <span>Member</span>
                      <span>Participation</span>
                      <span>Trade Share</span>
                      <span>Profit Share</span>
                      <span />
                    </div>

                    <div className="divide-y divide-white/[0.06]">
                      {tradeMembers.map(
                        (assignment) => {
                          const invested =
                            Number(
                              assignment.invested_amount ||
                                0,
                            );

                          const tradeShare =
                            Number(
                              selectedTrade.invested_amount,
                            ) > 0
                              ? (invested /
                                  Number(
                                    selectedTrade.invested_amount,
                                  )) *
                                100
                              : 0;

                          return (
                            <div
                              key={
                                assignment.id
                              }
                              className="px-5 py-4"
                            >
                              <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_100px] md:items-center">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06]">
                                    <UserRound className="h-4 w-4 text-zinc-400" />
                                  </div>

                                  <div>
                                    <div className="text-sm font-medium">
                                      {assignment
                                        .member
                                        ?.full_name ||
                                        "Unknown Member"}
                                    </div>

                                    <div className="text-xs text-zinc-600">
                                      {assignment
                                        .member
                                        ?.phone ||
                                        "No phone"}
                                    </div>
                                  </div>
                                </div>

                                <DirectoryValue
                                  mobileLabel="Participation"
                                  value={money(
                                    invested,
                                  )}
                                />

                                <DirectoryValue
                                  mobileLabel="Trade Share"
                                  value={`${tradeShare.toFixed(
                                    2,
                                  )}%`}
                                />

                                <DirectoryValue
                                  mobileLabel="Profit Share"
                                  value={
                                    assignment.profit_share ==
                                    null
                                      ? "—"
                                      : `${Number(
                                          assignment.profit_share,
                                        ).toFixed(
                                          2,
                                        )}%`
                                  }
                                />

                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() =>
                                      openEditMember(
                                        assignment,
                                      )
                                    }
                                    className="rounded-lg px-3 py-2 text-xs text-zinc-500 hover:bg-white/[0.06] hover:text-white"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    onClick={() =>
                                      removeMember(
                                        assignment,
                                      )
                                    }
                                    className="rounded-lg p-2 text-zinc-600 hover:bg-red-400/10 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
              </section>

              {selectedTrade.status ===
                "successful" &&
                !selectedTrade.is_closed && (
                  <section className="mb-8 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.035] p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CircleDollarSign className="h-5 w-5 text-emerald-300" />
                          <h3 className="font-semibold">
                            Ready for Distribution
                          </h3>
                        </div>

                        <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
                          Distribution uses only the
                          participating member directory.
                          The directory must exactly match
                          the trade investment.
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          setShowDistributionModal(
                            true,
                          )
                        }
                        disabled={
                          tradeMembers.length ===
                            0 ||
                          Math.abs(
                            directoryDifference,
                          ) > 0.01
                        }
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-black hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <CircleDollarSign className="h-4 w-4" />
                        Distribute Return
                      </button>
                    </div>
                  </section>
                )}

              <section className="mb-8">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-base font-semibold">
                      Trade Files
                    </h3>
                  </div>

                  <p className="mt-1 text-xs text-zinc-600">
                    Agreements, receipts and payment proof.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <UploadBox
                    label="Agreement"
                    disabled={uploading}
                    onChange={(e) =>
                      uploadFile(
                        e,
                        "agreement",
                      )
                    }
                  />

                  <UploadBox
                    label="Receipt"
                    disabled={uploading}
                    onChange={(e) =>
                      uploadFile(
                        e,
                        "receipt",
                      )
                    }
                  />

                  <UploadBox
                    label="Payment Proof"
                    disabled={uploading}
                    onChange={(e) =>
                      uploadFile(
                        e,
                        "payment_proof",
                      )
                    }
                  />
                </div>

                {tradeFiles.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {tradeFiles.map((file) => {
                      const Icon = fileIcon(
                        file.category,
                      );

                      return (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
                            <Icon className="h-4 w-4 text-zinc-400" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-zinc-300">
                              {fileCategoryLabel(
                                file.category,
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                openTradeFile(file)
                              }
                              className="mt-1 block max-w-full truncate text-left text-xs text-zinc-600 hover:text-white"
                            >
                              Open file
                            </button>
                          </div>

                          <button
                            onClick={() =>
                              deleteFile(
                                file,
                              )
                            }
                            className="rounded-lg p-2 text-zinc-600 hover:bg-red-400/10 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {selectedTrade.notes && (
                <section className="mb-8">
                  <div className="mb-3 flex items-center gap-2">
                    <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-base font-semibold">
                      Notes
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-sm leading-7 text-zinc-500">
                    {selectedTrade.notes}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-base font-semibold">
                      Cooperative Activity Log
                    </h3>
                  </div>

                  {selectedTrade.is_closed && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setShowStatusMenu(
                            (value) =>
                              !value,
                          )
                        }
                        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs text-zinc-400 hover:text-white"
                      >
                        Change Status
                        <ChevronRight className="h-3 w-3 rotate-90" />
                      </button>

                      {showStatusMenu && (
                        <div className="absolute right-0 top-11 z-10 w-48 rounded-xl border border-white/[0.08] bg-[#111] p-1 shadow-xl">
                          {(
                            [
                              "ongoing",
                              "successful",
                              "failed",
                            ] as TradeStatus[]
                          ).map(
                            (status) => (
                              <button
                                key={
                                  status
                                }
                                onClick={() =>
                                  updateTradeStatus(
                                    status,
                                  )
                                }
                                className="block w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                              >
                                {statusLabel(
                                  status,
                                )}
                              </button>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                  {tradeLogs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-600">
                      No activity recorded.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.05]">
                      {tradeLogs.map(
                        (log) => (
                          <div
                            key={log.id}
                            className="flex gap-4 p-4"
                          >
                            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.05]">
                              <Activity className="h-3.5 w-3.5 text-zinc-500" />
                            </div>

                            <div>
                              <div className="text-xs leading-5 text-zinc-300">
                                {
                                  log.description
                                }
                              </div>

                              <div className="mt-1 text-[10px] text-zinc-700">
                                {new Intl.DateTimeFormat(
                                  "en-IN",
                                  {
                                    dateStyle:
                                      "medium",
                                    timeStyle:
                                      "short",
                                  },
                                ).format(
                                  new Date(
                                    log.created_at,
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <Modal
          title="Create Trade"
          subtitle="Create a new trade for the cooperative."
          onClose={() =>
            setShowCreateModal(false)
          }
        >
          <div className="space-y-4">
            <Input
              label="Trade Name"
              value={newTradeName}
              onChange={setNewTradeName}
              placeholder="e.g. Gold Momentum Trade"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Trade Investment"
                value={newInvestedAmount}
                onChange={
                  setNewInvestedAmount
                }
                placeholder="35000"
                type="number"
              />

              <Input
                label="Return Expected Including Investment"
                value={newApproxReturn}
                onChange={
                  setNewApproxReturn
                }
                placeholder="42000"
                type="number"
              />
            </div>

            <Input
              label="Trade Date"
              value={newTradeDate}
              onChange={setNewTradeDate}
              type="date"
            />

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">Trader</label>
              <select
                value={selectedTraderId}
                onChange={(e) => setSelectedTraderId(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-white outline-none"
              >
                <option value="" className="bg-zinc-950">Select trader</option>
                {traders.map((trader) => (
                  <option key={trader.id} value={trader.id} className="bg-zinc-950">
                    {trader.full_name || "Unnamed trader"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Notes
              </label>

              <textarea
                value={newNotes}
                onChange={(e) =>
                  setNewNotes(
                    e.target.value,
                  )
                }
                rows={4}
                placeholder="Optional trade notes..."
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700"
              />
            </div>

            <button
              onClick={createTrade}
              disabled={creating}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
            >
              {creating && (
                <RefreshCw className="h-4 w-4 animate-spin" />
              )}
              Create Trade
            </button>
          </div>
        </Modal>
      )}

      {showAddMemberModal &&
        selectedTrade && (
          <Modal
            title="Add Trade Member"
            subtitle="Set exact participation and trade-specific profit share."
            onClose={() =>
              setShowAddMemberModal(
                false,
              )
            }
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-xs text-zinc-500">
                Trade investment:{" "}
                <span className="font-semibold text-white">
                  {money(
                    selectedTrade.invested_amount,
                  )}
                </span>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Member
                </label>

                <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3">
                  <Search className="h-4 w-4 text-zinc-600" />

                  <input
                    value={
                      memberSearch
                    }
                    onChange={(e) =>
                      setMemberSearch(
                        e.target.value,
                      )
                    }
                    placeholder="Search members..."
                    className="h-10 flex-1 bg-transparent text-xs text-white outline-none"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-white/[0.08]">
                  {filteredMembers
                    .filter(
                      (member) =>
                        !tradeMembers.some(
                          (item) =>
                            item.member_id ===
                            member.id,
                        ),
                    )
                    .map(
                      (member) => (
                        <button
                          key={
                            member.id
                          }
                          onClick={() =>
                            setSelectedMemberId(
                              member.id,
                            )
                          }
                          className={`flex w-full items-center gap-3 border-b border-white/[0.05] px-4 py-3 text-left last:border-0 ${
                            selectedMemberId ===
                            member.id
                              ? "bg-white/[0.08]"
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06]">
                            <UserRound className="h-3.5 w-3.5 text-zinc-400" />
                          </div>

                          <div className="flex-1">
                            <div className="text-xs font-medium">
                              {
                                member.full_name
                              }
                            </div>

                            <div className="text-[10px] text-zinc-600">
                              {
                                member.phone
                              }
                            </div>
                          </div>

                          {selectedMemberId ===
                            member.id && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      ),
                    )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Trade Participation"
                  value={
                    memberInvestment
                  }
                  onChange={
                    setMemberInvestment
                  }
                  placeholder="10000"
                  type="number"
                />

                <Input
                  label="Profit Share"
                  value={
                    memberProfitShare
                  }
                  onChange={
                    setMemberProfitShare
                  }
                  placeholder="28.57"
                  type="number"
                />
              </div>

              <button
                onClick={
                  addMemberToTrade
                }
                disabled={savingMember}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
              >
                {savingMember && (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
                Add to Trade Directory
              </button>
            </div>
          </Modal>
        )}

      {editingMember &&
        selectedTrade && (
          <Modal
            title="Edit Trade Member"
            subtitle={`Update ${
              editingMember.member
                ?.full_name ||
              "member"
            }'s participation.`}
            onClose={() =>
              setEditingMember(
                null,
              )
            }
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="text-xs text-zinc-600">
                  Member
                </div>

                <div className="mt-1 text-sm font-semibold">
                  {editingMember.member
                    ?.full_name ||
                    "Unknown Member"}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Trade Participation"
                  value={
                    memberInvestment
                  }
                  onChange={
                    setMemberInvestment
                  }
                  type="number"
                />

                <Input
                  label="Profit Share"
                  value={
                    memberProfitShare
                  }
                  onChange={
                    setMemberProfitShare
                  }
                  type="number"
                />
              </div>

              <button
                onClick={
                  saveMemberChanges
                }
                disabled={savingMember}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
              >
                {savingMember && (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
                Save Changes
              </button>
            </div>
          </Modal>
        )}

      {showDistributionModal &&
        selectedTrade && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[26px] border border-white/[0.08] bg-[#0c0c0c] shadow-2xl">
              <div className="border-b border-white/[0.07] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-emerald-300">
                      <CircleDollarSign className="h-5 w-5" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Distribution Review
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold">
                      Distribute{" "}
                      {
                        selectedTrade.trade_name
                      }
                    </h2>

                    <p className="mt-2 text-xs text-zinc-600">
                      This will permanently close
                      the trade.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setShowDistributionModal(
                        false,
                      )
                    }
                  >
                    <X className="h-5 w-5 text-zinc-500" />
                  </button>
                </div>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-6">
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <DetailCard
                    label="Trade Investment"
                    value={money(
                      selectedTrade.invested_amount,
                    )}
                  />

                  <DetailCard
                    label="Final Return"
                    value={money(
                      selectedTrade.approx_return,
                    )}
                  />

                  <DetailCard
                    label="Total Profit"
                    value={money(
                      expectedProfit,
                    )}
                    positive={
                      expectedProfit >= 0
                    }
                  />
                </div>

                <div className="rounded-2xl border border-white/[0.07]">
                  <div className="border-b border-white/[0.06] px-4 py-3 text-xs font-semibold text-zinc-400">
                    Directory-Based Distribution
                  </div>

                  <div className="divide-y divide-white/[0.05]">
                    {tradeMembers.map(
                      (assignment) => {
                        const invested =
                          Number(
                            assignment.invested_amount ||
                              0,
                          );

                        const percentage =
                          Number(
                            selectedTrade.invested_amount,
                          ) > 0
                            ? invested /
                              Number(
                                selectedTrade.invested_amount,
                              )
                            : 0;

                        const returned =
                          Number(
                            selectedTrade.approx_return,
                          ) *
                          percentage;

                        const profit =
                          returned -
                          invested;

                        return (
                          <div
                            key={
                              assignment.id
                            }
                            className="p-4"
                          >
                            <div className="mb-3 flex justify-between">
                              <div className="text-sm font-medium">
                                {assignment
                                  .member
                                  ?.full_name ||
                                  "Unknown Member"}
                              </div>

                              <div className="text-xs text-zinc-600">
                                {(
                                  percentage *
                                  100
                                ).toFixed(
                                  2,
                                )}
                                % of trade
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <MiniDistribution
                                label="Invested"
                                value={money(
                                  invested,
                                )}
                              />

                              <MiniDistribution
                                label="Return"
                                value={money(
                                  returned,
                                )}
                              />

                              <MiniDistribution
                                label="Profit"
                                value={money(
                                  profit,
                                )}
                                positive={
                                  profit >=
                                  0
                                }
                              />
                            </div>

                            <div className="mt-3 text-[10px] text-zinc-700">
                              Directory profit
                              share:{" "}
                              {assignment.profit_share ==
                              null
                                ? "—"
                                : `${Number(
                                    assignment.profit_share,
                                  ).toFixed(
                                    2,
                                  )}%`}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-400/15 bg-amber-400/[0.035] p-4 text-xs leading-5 text-zinc-500">
                  After confirmation, the trade will
                  become CLOSED. Traders and members
                  will have read-only access. Admin can
                  still make future changes, and every
                  such change will be recorded.
                </div>
              </div>

              <div className="flex gap-3 border-t border-white/[0.07] p-6">
                <button
                  onClick={() =>
                    setShowDistributionModal(
                      false,
                    )
                  }
                  className="h-11 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    distributeTrade
                  }
                  disabled={distributing}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-sm font-semibold text-black hover:bg-emerald-300 disabled:opacity-40"
                >
                  {distributing && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  Confirm Distribution
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05]">
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>

      <div className="text-xs text-zinc-600">
        {label}
      </div>

      <div className="mt-1 text-xl font-semibold">
        {value}
      </div>
    </div>
  );
}

function MiniValue({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">
        {label}
      </div>

      <div
        className={
          positive
            ? "text-sm font-semibold text-emerald-300"
            : "text-sm font-semibold text-zinc-200"
        }
      >
        {value}
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="mb-3 text-[10px] uppercase tracking-wider text-zinc-600">
        {label}
      </div>

      <div
        className={
          positive
            ? "text-2xl font-extrabold text-emerald-300"
            : "text-2xl font-extrabold text-white"
        }
      >
        {value}
      </div>
    </div>
  );
}

function DirectorySummary({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      className={
        warning
          ? "rounded-xl border border-amber-400/20 bg-amber-400/[0.035] p-4"
          : "rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
      }
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">
        {label}
      </div>

      <div
        className={
          warning
            ? "mt-1 text-lg font-bold text-amber-300"
            : "mt-1 text-lg font-bold text-zinc-200"
        }
      >
        {value}
      </div>
    </div>
  );
}

function DirectoryValue({
  mobileLabel,
  value,
}: {
  mobileLabel: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600 md:hidden">
        {mobileLabel}
      </div>

      <div className="text-sm font-semibold text-zinc-200">
        {value}
      </div>
    </div>
  );
}

function MiniDistribution({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.025] p-3">
      <div className="text-[9px] uppercase tracking-wider text-zinc-700">
        {label}
      </div>

      <div
        className={
          positive
            ? "mt-1 text-xs font-semibold text-emerald-300"
            : "mt-1 text-xs font-semibold text-zinc-300"
        }
      >
        {value}
      </div>
    </div>
  );
}

function UploadBox({
  label,
  disabled,
  onChange,
}: {
  label: string;
  disabled: boolean;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <label
      className={
        disabled
          ? "pointer-events-none flex items-center gap-3 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-4 opacity-30"
          : "flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-4 hover:border-white/[0.15] hover:bg-white/[0.035]"
      }
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]">
        <Upload className="h-4 w-4 text-zinc-500" />
      </div>

      <div>
        <div className="text-xs font-medium text-zinc-300">
          Upload {label}
        </div>

        <div className="mt-1 text-[10px] text-zinc-700">
          Image or PDF
        </div>
      </div>

      <input
        type="file"
        className="hidden"
        accept="image/*,.pdf"
        onChange={onChange}
        disabled={disabled}
      />
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-zinc-400">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/[0.16]"
      />
    </div>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[26px] border border-white/[0.08] bg-[#0c0c0c] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-6">
          <div>
            <h2 className="text-xl font-semibold">
              {title}
            </h2>

            <p className="mt-2 text-xs leading-5 text-zinc-600">
              {subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}