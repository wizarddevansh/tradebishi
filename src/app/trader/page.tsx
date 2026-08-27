"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Plus,
  LogOut,
  Lock,
  X,
  Activity,
  Wallet,
  BarChart3,
  Camera,
  Upload,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type TradePhoto = {
  name: string;
  url: string;
};

type Trade = {
  id: string;
  symbol: string;
  trade_type: string;
  quantity: number;
  price: number;
  total_amount: number;
  trade_date: string;
  notes: string | null;
  photos?: TradePhoto[];
};

type Profile = {
  full_name: string | null;
  role: string | null;
};

export default function TraderDashboard() {
  const router = useRouter();

  const [userName, setUserName] = useState("Trader");
  const [role, setRole] = useState("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const [form, setForm] = useState({
    symbol: "",
    trade_type: "buy",
    quantity: "",
    price: "",
    trade_date: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  useEffect(() => {
    loadTrader();
  }, []);

  async function loadTrader() {
    const supabase = createClient();

    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        setError(`Authentication error: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (!user) {
        setError("No authenticated user found.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError(`Profile error: ${profileError.message}`);
        setLoading(false);
        return;
      }

      if (!profile) {
        setError("No profile was found for this account.");
        setLoading(false);
        return;
      }

      const typedProfile = profile as Profile;

      setUserName(typedProfile.full_name || "Trader");
      setRole(typedProfile.role || "unknown");

      if (typedProfile.role?.toLowerCase() !== "trader") {
        setError(
          `Trader access check failed. Supabase returned role: "${typedProfile.role}"`
        );

        setLoading(false);
        return;
      }

      await loadTrades();

      setLoading(false);
    } catch (err) {
      console.error("TRADER DASHBOARD ERROR:", err);
      setError("Unexpected error while loading Trader Dashboard.");
      setLoading(false);
    }
  }

  async function loadTrades() {
    const supabase = createClient();

    const { data, error: tradesError } = await supabase
      .from("trades")
      .select(
        `
          id,
          symbol,
          trade_type,
          quantity,
          price,
          total_amount,
          trade_date,
          notes
        `
      )
      .order("trade_date", {
        ascending: false,
      });

    if (tradesError) {
      setError(`Trades error: ${tradesError.message}`);
      return;
    }

    const loadedTrades = (data ?? []) as Trade[];

    const tradesWithPhotos = await Promise.all(
      loadedTrades.map(async (trade) => {
        const photos = await loadTradePhotos(trade.id);

        return {
          ...trade,
          photos,
        };
      })
    );

    setTrades(tradesWithPhotos);
  }

  async function loadTradePhotos(
    tradeId: string
  ): Promise<TradePhoto[]> {
    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from("trade-photos")
      .list(tradeId, {
        limit: 100,
        sortBy: {
          column: "created_at",
          order: "desc",
        },
      });

    if (error) {
      console.error(`PHOTO LOAD ERROR FOR TRADE ${tradeId}:`, error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data
      .filter(
        (file) =>
          file.name !== ".emptyFolderPlaceholder"
      )
      .map((file) => {
        const { data: publicUrlData } =
          supabase.storage
            .from("trade-photos")
            .getPublicUrl(
              `${tradeId}/${file.name}`
            );

        return {
          name: file.name,
          url: publicUrlData.publicUrl,
        };
      });
  }

  async function uploadTradePhotos(
    tradeId: string,
    files: File[]
  ) {
    if (files.length === 0) {
      return;
    }

    const supabase = createClient();

    for (const file of files) {
      const safeFileName = file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        "-"
      );

      const uniqueFileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}-${safeFileName}`;

      const filePath = `${tradeId}/${uniqueFileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("trade-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

      if (uploadError) {
        throw new Error(
          `Failed to upload ${file.name}: ${uploadError.message}`
        );
      }
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const symbol = form.symbol.trim().toUpperCase();
    const quantity = Number(form.quantity);
    const price = Number(form.price);

    if (!symbol) {
      setError("Enter a stock symbol.");
      setSaving(false);
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than 0.");
      setSaving(false);
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Price must be greater than 0.");
      setSaving(false);
      return;
    }

    if (!form.trade_date) {
      setError("Select a trade date.");
      setSaving(false);
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      setError(`Authentication error: ${authError.message}`);
      setSaving(false);
      return;
    }

    if (!user) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const {
      data: insertedTrade,
      error: insertError,
    } = await supabase
      .from("trades")
      .insert({
        symbol,
        trade_type: form.trade_type,
        quantity,
        price,
        total_amount: quantity * price,
        trade_date: new Date(
          form.trade_date
        ).toISOString(),
        notes: form.notes.trim() || null,
        trader_id: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("TRADE INSERT ERROR:", insertError);

      setError(
        `Trade could not be created: ${insertError.message}${
          insertError.details
            ? ` — ${insertError.details}`
            : ""
        }`
      );

      setSaving(false);
      return;
    }

    if (!insertedTrade?.id) {
      setError(
        "Trade was created but no trade ID was returned."
      );

      setSaving(false);
      return;
    }

    try {
      await uploadTradePhotos(
        insertedTrade.id,
        selectedPhotos
      );
    } catch (photoError) {
      console.error("PHOTO UPLOAD FAILED:", photoError);

      setError(
        photoError instanceof Error
          ? photoError.message
          : "Trade saved, but photo upload failed."
      );

      setSaving(false);

      await loadTrades();

      return;
    }

    resetForm();
    setShowModal(false);
    setSaving(false);

    await loadTrades();
  }

  function resetForm() {
    setForm({
      symbol: "",
      trade_type: "buy",
      quantity: "",
      price: "",
      trade_date: new Date()
        .toISOString()
        .slice(0, 16),
      notes: "",
    });

    setSelectedPhotos([]);
  }

  function handlePhotoSelection(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files ?? []
    );

    if (files.length === 0) {
      return;
    }

    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length !== files.length) {
      setError("Only image files can be uploaded.");
    }

    const maxSize = 10 * 1024 * 1024;

    const validFiles = imageFiles.filter(
      (file) => file.size <= maxSize
    );

    if (validFiles.length !== imageFiles.length) {
      setError("Each photo must be 10 MB or smaller.");
    }

    setSelectedPhotos((current) => [
      ...current,
      ...validFiles,
    ]);

    event.target.value = "";
  }

  function removeSelectedPhoto(index: number) {
    setSelectedPhotos((current) =>
      current.filter(
        (_, photoIndex) =>
          photoIndex !== index
      )
    );
  }

  async function deleteTradePhoto(
    tradeId: string,
    fileName: string
  ) {
    const confirmed = window.confirm(
      "Delete this trade photo?"
    );

    if (!confirmed) {
      return;
    }

    const supabase = createClient();

    const filePath = `${tradeId}/${fileName}`;

    const { error } = await supabase.storage
      .from("trade-photos")
      .remove([filePath]);

    if (error) {
      setError(
        `Could not delete photo: ${error.message}`
      );

      return;
    }

    await loadTrades();
  }

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  function formatCurrency(value: number) {
    return `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }

  const totalTradeValue = trades.reduce(
    (sum, trade) =>
      sum + Number(trade.total_amount || 0),
    0
  );

  const buyTrades = trades.filter(
    (trade) =>
      trade.trade_type?.toLowerCase() === "buy"
  );

  const sellTrades = trades.filter(
    (trade) =>
      trade.trade_type?.toLowerCase() === "sell"
  );

  const totalBuyValue = buyTrades.reduce(
    (sum, trade) =>
      sum + Number(trade.total_amount || 0),
    0
  );

  const totalSellValue = sellTrades.reduce(
    (sum, trade) =>
      sum + Number(trade.total_amount || 0),
    0
  );

  const uniqueSymbols = new Set(
    trades.map((trade) => trade.symbol)
  ).size;

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>
          <TrendingUp size={20} />
          <span>Loading Trader Account...</span>
        </div>
      </main>
    );
  }

  if (role.toLowerCase() !== "trader") {
    return (
      <main style={pageStyle}>
        <div style={diagnosticCard}>
          <Lock
            size={34}
            style={{
              marginBottom: "15px",
              opacity: 0.6,
            }}
          />

          <h1 style={diagnosticTitle}>
            Trader Access Check
          </h1>

          <p style={diagnosticText}>
            This page is loading correctly, but the
            account does not currently have the
            required Trader role.
          </p>

          <div style={roleBox}>
            <span>Current role returned by Supabase</span>

            <strong>{role || "null"}</strong>
          </div>

          {error && (
            <div style={diagnosticError}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              router.replace("/login")
            }
            style={{
              ...primaryButton,
              margin: "20px auto 0",
            }}
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>

        {/* HEADER */}

        <header style={headerStyle}>
          <div style={headerContent}>
            <div style={eyebrowStyle}>
              <TrendingUp size={15} />
              TRADEBISHI TRADER
            </div>

            <h1 style={titleStyle}>
              Welcome, {userName}
            </h1>

            <p style={subtitleStyle}>
              Manage and record your trading activity.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            style={secondaryButton}
          >
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </header>

        {/* STATS */}

        <section style={statsGrid}>
          <Stat
            icon={<Activity size={18} />}
            title="Trades"
            value={trades.length.toString()}
          />

          <Stat
            icon={<Wallet size={18} />}
            title="Trade Volume"
            value={formatCurrency(totalTradeValue)}
          />

          <Stat
            icon={<BarChart3 size={18} />}
            title="Stocks Traded"
            value={uniqueSymbols.toString()}
          />

          <Stat
            icon={<Lock size={18} />}
            title="Access"
            value="Trader"
          />
        </section>

        {/* SUMMARY */}

        <section style={summaryGrid}>
          <SummaryCard
            title="Total Buy Value"
            value={formatCurrency(totalBuyValue)}
            subtitle={`${buyTrades.length} buy ${
              buyTrades.length === 1
                ? "trade"
                : "trades"
            }`}
            positive
          />

          <SummaryCard
            title="Total Sell Value"
            value={formatCurrency(totalSellValue)}
            subtitle={`${sellTrades.length} sell ${
              sellTrades.length === 1
                ? "trade"
                : "trades"
            }`}
          />
        </section>

        {/* TRADES */}

        <section style={sectionStyle}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>
                Trading Activity
              </h2>

              <p style={sectionSubtitle}>
                All pooled trading activity is
                permanently recorded.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setShowModal(true);
              }}
              style={primaryButton}
            >
              <Plus size={18} />
              <span>Record Trade</span>
            </button>
          </div>

          {trades.length === 0 ? (
            <div style={emptyState}>
              <TrendingUp size={32} />

              <strong>No trades recorded yet.</strong>

              <p>
                Click "Record Trade" to add the first
                trade.
              </p>
            </div>
          ) : (
            <div style={tableWrapper}>
              <div style={tableMinWidth}>
                <div style={tableHeader}>
                  <span>Symbol</span>
                  <span>Type</span>
                  <span>Quantity</span>
                  <span>Price</span>
                  <span>Total</span>
                  <span>Date</span>
                  <span>Photos</span>
                </div>

                <div style={tradeList}>
                  {trades.map((trade) => {
                    const isBuy =
                      trade.trade_type?.toLowerCase() ===
                      "buy";

                    const photos =
                      trade.photos ?? [];

                    return (
                      <div
                        key={trade.id}
                        style={tradeRow}
                      >
                        <strong>{trade.symbol}</strong>

                        <span
                          style={{
                            ...typeBadge,
                            background: isBuy
                              ? "rgba(52,211,153,0.1)"
                              : "rgba(248,113,113,0.1)",
                            color: isBuy
                              ? "#34d399"
                              : "#f87171",
                          }}
                        >
                          {trade.trade_type}
                        </span>

                        <span>
                          {Number(
                            trade.quantity
                          ).toLocaleString("en-IN")}
                        </span>

                        <span>
                          {formatCurrency(
                            Number(trade.price)
                          )}
                        </span>

                        <strong>
                          {formatCurrency(
                            Number(
                              trade.total_amount
                            )
                          )}
                        </strong>

                        <span style={dateStyle}>
                          {new Date(
                            trade.trade_date
                          ).toLocaleString("en-IN")}
                        </span>

                        <div style={photoCell}>
                          {photos.length === 0 ? (
                            <span style={noPhotoText}>
                              No photos
                            </span>
                          ) : (
                            <div style={photoThumbs}>
                              {photos
                                .slice(0, 3)
                                .map((photo) => (
                                  <button
                                    key={photo.name}
                                    type="button"
                                    onClick={() =>
                                      setPreviewPhoto(
                                        photo.url
                                      )
                                    }
                                    style={
                                      photoThumbButton
                                    }
                                  >
                                    <img
                                      src={photo.url}
                                      alt="Trade"
                                      style={photoThumb}
                                    />
                                  </button>
                                ))}

                              {photos.length > 3 && (
                                <span
                                  style={morePhotos}
                                >
                                  +
                                  {photos.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SECURITY */}

        <div style={securityNotice}>
          <Lock size={16} />

          <span>
            Trader accounts can record trades but
            cannot modify or delete existing records.
          </span>
        </div>
      </div>

      {/* RECORD TRADE MODAL */}

      {showModal && (
        <div
          style={modalOverlay}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowModal(false);
            }
          }}
        >
          <div style={modalCard}>
            <div style={modalHeader}>
              <div>
                <h3 style={modalTitle}>
                  Record Trade
                </h3>

                <p style={modalSubtitle}>
                  Add a permanent trading record.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setError("");
                }}
                style={closeButton}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={formStyle}
            >
              <label style={labelStyle}>
                Stock Symbol
              </label>

              <input
                required
                placeholder="e.g. RELIANCE"
                value={form.symbol}
                onChange={(event) =>
                  setForm({
                    ...form,
                    symbol: event.target.value,
                  })
                }
                style={inputStyle}
              />

              <label style={labelStyle}>
                Trade Type
              </label>

              <select
                value={form.trade_type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    trade_type: event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>

              <label style={labelStyle}>
                Quantity
              </label>

              <input
                required
                type="number"
                min="0"
                step="any"
                placeholder="Quantity"
                value={form.quantity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    quantity: event.target.value,
                  })
                }
                style={inputStyle}
              />

              <label style={labelStyle}>
                Price Per Unit
              </label>

              <input
                required
                type="number"
                min="0"
                step="any"
                placeholder="Price"
                value={form.price}
                onChange={(event) =>
                  setForm({
                    ...form,
                    price: event.target.value,
                  })
                }
                style={inputStyle}
              />

              <label style={labelStyle}>
                Trade Date
              </label>

              <input
                required
                type="datetime-local"
                value={form.trade_date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    trade_date: event.target.value,
                  })
                }
                style={inputStyle}
              />

              <label style={labelStyle}>
                Notes
              </label>

              <textarea
                rows={3}
                placeholder="Optional trade notes"
                value={form.notes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes: event.target.value,
                  })
                }
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />

              {/* PHOTOS */}

              <div style={photoSection}>
                <div style={photoSectionHeader}>
                  <div>
                    <label
                      style={photoSectionTitle}
                    >
                      Trade Photos
                    </label>

                    <p
                      style={
                        photoSectionSubtitle
                      }
                    >
                      Attach screenshots,
                      confirmations or other
                      trade evidence.
                    </p>
                  </div>

                  <Camera
                    size={20}
                    style={{
                      opacity: 0.5,
                    }}
                  />
                </div>

                <label
                  htmlFor="trade-photo-upload"
                  style={uploadBox}
                >
                  <Upload size={22} />

                  <strong>Add Photos</strong>

                  <span>
                    PNG, JPG, WEBP · Max 10 MB each
                  </span>
                </label>

                <input
                  id="trade-photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelection}
                  style={{
                    display: "none",
                  }}
                />

                {selectedPhotos.length > 0 && (
                  <div
                    style={selectedPhotoGrid}
                  >
                    {selectedPhotos.map(
                      (file, index) => {
                        const previewUrl =
                          URL.createObjectURL(file);

                        return (
                          <div
                            key={`${file.name}-${index}`}
                            style={
                              selectedPhotoCard
                            }
                          >
                            <img
                              src={previewUrl}
                              alt={file.name}
                              style={
                                selectedPhotoImage
                              }
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeSelectedPhoto(
                                  index
                                )
                              }
                              style={
                                removePhotoButton
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {selectedPhotos.length > 0 && (
                  <span
                    style={photoCountText}
                  >
                    {selectedPhotos.length}{" "}
                    {selectedPhotos.length === 1
                      ? "photo"
                      : "photos"}{" "}
                    selected
                  </span>
                )}
              </div>

              <div style={totalBox}>
                <span style={totalLabel}>
                  Total Trade Value
                </span>

                <strong style={totalValue}>
                  {formatCurrency(
                    Number(form.quantity || 0) *
                      Number(form.price || 0)
                  )}
                </strong>
              </div>

              {error && (
                <div style={modalError}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...primaryButton,
                  justifyContent: "center",
                  opacity: saving ? 0.6 : 1,
                  width: "100%",
                }}
              >
                {saving
                  ? selectedPhotos.length > 0
                    ? "Saving Trade & Photos..."
                    : "Recording..."
                  : "Record Trade"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW */}

      {previewPhoto && (
        <div
          style={imagePreviewOverlay}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setPreviewPhoto(null);
            }
          }}
        >
          <button
            type="button"
            onClick={() =>
              setPreviewPhoto(null)
            }
            style={imagePreviewClose}
          >
            <X size={22} />
          </button>

          <img
            src={previewPhoto}
            alt="Trade photo"
            style={fullPreviewImage}
          />
        </div>
      )}
    </main>
  );
}

/* =========================
   COMPONENTS
========================= */

function Stat({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div style={statCard}>
      <div style={statHeader}>
        {icon}
        <span>{title}</span>
      </div>

      <strong style={statValue}>
        {value}
      </strong>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  positive = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
}) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>
        {title}
      </span>

      <strong
        style={{
          ...summaryValue,
          color: positive ? "#34d399" : "white",
        }}
      >
        {value}
      </strong>

      <span style={summarySubtitle}>
        {subtitle}
      </span>
    </div>
  );
}

/* =========================
   BASE STYLES
========================= */

const pageStyle = {
  minHeight: "100vh",
  width: "100%",
  boxSizing: "border-box" as const,
  overflowX: "hidden" as const,
  background:
    "radial-gradient(circle at top, #151515 0%, #050505 45%)",
  color: "white",
  padding: "clamp(18px, 3vw, 45px)",
};

const containerStyle = {
  width: "100%",
  maxWidth: "1450px",
  margin: "0 auto",
  boxSizing: "border-box" as const,
};

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  color: "rgba(255,255,255,0.5)",
};

const diagnosticCard = {
  width: "calc(100% - 32px)",
  maxWidth: "520px",
  margin: "100px auto",
  padding: "clamp(24px, 5vw, 35px)",
  boxSizing: "border-box" as const,
  borderRadius: "26px",
  background: "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.1)",
  textAlign: "center" as const,
};

const diagnosticTitle = {
  margin: 0,
  fontSize: "clamp(23px, 4vw, 28px)",
};

const diagnosticText = {
  color: "rgba(255,255,255,0.5)",
  marginTop: "10px",
  lineHeight: 1.6,
};

const diagnosticError = {
  marginTop: "15px",
  color: "#f87171",
  fontSize: "13px",
};

const roleBox = {
  marginTop: "25px",
  padding: "18px",
  borderRadius: "15px",
  background: "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

/* =========================
   HEADER
========================= */

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "30px",
  flexWrap: "wrap" as const,
};

const headerContent = {
  minWidth: 0,
  flex: "1 1 300px",
};

const eyebrowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  color: "rgba(255,255,255,0.4)",
  fontSize: "11px",
  letterSpacing: "3px",
  fontWeight: 600,
};

const titleStyle = {
  margin: "10px 0 0",
  fontSize: "clamp(30px, 5vw, 48px)",
  lineHeight: 1.05,
  letterSpacing: "-2px",
};

const subtitleStyle = {
  marginTop: "9px",
  color: "rgba(255,255,255,0.45)",
  fontSize: "14px",
  lineHeight: 1.5,
};

const primaryButton = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minHeight: "44px",
  padding: "11px 17px",
  borderRadius: "13px",
  border: "none",
  background: "white",
  color: "black",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

const secondaryButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  minHeight: "44px",
  padding: "11px 16px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
};

/* =========================
   STATS
========================= */

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "15px",
  marginBottom: "15px",
};

const statCard = {
  minWidth: 0,
  padding: "21px",
  borderRadius: "20px",
  background:
    "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  boxSizing: "border-box" as const,
};

const statHeader = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const statValue = {
  display: "block",
  marginTop: "9px",
  fontSize: "clamp(21px, 3vw, 25px)",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* =========================
   SUMMARY
========================= */

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: "15px",
  marginBottom: "25px",
};

const summaryCard = {
  minWidth: 0,
  padding: "20px",
  borderRadius: "18px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const summaryLabel = {
  color: "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const summaryValue = {
  display: "block",
  marginTop: "7px",
  fontSize: "clamp(18px, 3vw, 21px)",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const summarySubtitle = {
  display: "block",
  marginTop: "4px",
  color: "rgba(255,255,255,0.3)",
  fontSize: "12px",
};

/* =========================
   TRADING SECTION
========================= */

const sectionStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  background:
    "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: "26px",
  padding: "clamp(17px, 3vw, 28px)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  marginBottom: "25px",
  flexWrap: "wrap" as const,
};

const sectionTitle = {
  fontSize: "clamp(20px, 3vw, 24px)",
  fontWeight: 600,
  margin: 0,
};

const sectionSubtitle = {
  marginTop: "5px",
  color: "rgba(255,255,255,0.4)",
  fontSize: "13px",
  lineHeight: 1.5,
};

const emptyState = {
  padding: "55px 20px",
  textAlign: "center" as const,
  color: "rgba(255,255,255,0.4)",
  background:
    "rgba(0,0,0,0.2)",
  borderRadius: "18px",
  border:
    "1px solid rgba(255,255,255,0.05)",
};

const tableWrapper = {
  width: "100%",
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
  scrollbarWidth: "thin" as const,
};

const tableMinWidth = {
  minWidth: "950px",
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns:
    "1.1fr 0.9fr 1fr 1.1fr 1.2fr 1.5fr 1.2fr",
  gap: "15px",
  padding: "0 17px 11px",
  color: "rgba(255,255,255,0.35)",
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.07em",
};

const tradeList = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "9px",
};

const tradeRow = {
  display: "grid",
  gridTemplateColumns:
    "1.1fr 0.9fr 1fr 1.1fr 1.2fr 1.5fr 1.2fr",
  gap: "15px",
  alignItems: "center",
  padding: "17px",
  borderRadius: "15px",
  background:
    "rgba(0,0,0,0.25)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const typeBadge = {
  display: "inline-flex",
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "capitalize" as const,
};

const dateStyle = {
  color: "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

/* =========================
   SECURITY
========================= */

const securityNotice = {
  marginTop: "20px",
  padding: "15px 18px",
  borderRadius: "15px",
  background:
    "rgba(255,255,255,0.03)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "rgba(255,255,255,0.4)",
  fontSize: "13px",
  lineHeight: 1.5,
};

/* =========================
   PHOTO STYLES
========================= */

const photoCell = {
  minWidth: 0,
};

const noPhotoText = {
  color: "rgba(255,255,255,0.25)",
  fontSize: "11px",
};

const photoThumbs = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
};

const photoThumbButton = {
  width: "36px",
  height: "36px",
  padding: 0,
  flexShrink: 0,
  borderRadius: "8px",
  overflow: "hidden",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.05)",
  cursor: "pointer",
};

const photoThumb = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const morePhotos = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  flexShrink: 0,
  borderRadius: "8px",
  background:
    "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.55)",
  fontSize: "11px",
  fontWeight: 600,
};

/* =========================
   MODAL
========================= */

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "clamp(10px, 3vw, 20px)",
  boxSizing: "border-box" as const,
  background:
    "rgba(0,0,0,0.78)",
  backdropFilter: "blur(14px)",
};

const modalCard = {
  width: "100%",
  maxWidth: "520px",
  maxHeight: "calc(100vh - 20px)",
  overflowY: "auto" as const,
  padding: "clamp(20px, 4vw, 30px)",
  boxSizing: "border-box" as const,
  borderRadius: "25px",
  background: "#111",
  border:
    "1px solid rgba(255,255,255,0.12)",
  color: "white",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "15px",
  marginBottom: "25px",
};

const modalTitle = {
  fontSize: "clamp(21px, 4vw, 25px)",
  margin: 0,
};

const modalSubtitle = {
  marginTop: "5px",
  color: "rgba(255,255,255,0.4)",
  fontSize: "13px",
};

const formStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "14px",
};

const labelStyle = {
  color: "rgba(255,255,255,0.5)",
  fontSize: "12px",
  marginBottom: "-7px",
};

const inputStyle = {
  minHeight: "46px",
  padding: "12px 14px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  fontSize: "15px",
  width: "100%",
  boxSizing: "border-box" as const,
};

const totalBox = {
  padding: "15px",
  borderRadius: "14px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const totalLabel = {
  color: "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const totalValue = {
  display: "block",
  marginTop: "5px",
  fontSize: "21px",
};

const modalError = {
  padding: "11px 13px",
  borderRadius: "10px",
  background:
    "rgba(248,113,113,0.08)",
  border:
    "1px solid rgba(248,113,113,0.15)",
  color: "#f87171",
  fontSize: "13px",
  lineHeight: 1.5,
};

const closeButton = {
  width: "38px",
  height: "38px",
  flexShrink: 0,
  borderRadius: "50%",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/* =========================
   PHOTO UPLOAD
========================= */

const photoSection = {
  padding: "17px",
  borderRadius: "16px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const photoSectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "13px",
};

const photoSectionTitle = {
  display: "block",
  color: "rgba(255,255,255,0.7)",
  fontSize: "13px",
  fontWeight: 600,
};

const photoSectionSubtitle = {
  margin: "4px 0 0",
  color: "rgba(255,255,255,0.3)",
  fontSize: "11px",
  lineHeight: 1.4,
};

const uploadBox = {
  minHeight: "105px",
  padding: "15px",
  boxSizing: "border-box" as const,
  borderRadius: "13px",
  border:
    "1px dashed rgba(255,255,255,0.18)",
  background:
    "rgba(255,255,255,0.025)",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  color: "rgba(255,255,255,0.55)",
  cursor: "pointer",
  textAlign: "center" as const,
};

const selectedPhotoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill, minmax(70px, 1fr))",
  gap: "8px",
  marginTop: "12px",
};

const selectedPhotoCard = {
  position: "relative" as const,
  aspectRatio: "1",
  minWidth: 0,
  borderRadius: "10px",
  overflow: "hidden",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background: "#000",
};

const selectedPhotoImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const removePhotoButton = {
  position: "absolute" as const,
  top: "5px",
  right: "5px",
  width: "25px",
  height: "25px",
  borderRadius: "50%",
  border: "none",
  background:
    "rgba(0,0,0,0.75)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const photoCountText = {
  display: "block",
  marginTop: "10px",
  color: "rgba(255,255,255,0.35)",
  fontSize: "11px",
};

/* =========================
   FULL IMAGE PREVIEW
========================= */

const imagePreviewOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 10000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  boxSizing: "border-box" as const,
  background:
    "rgba(0,0,0,0.92)",
  backdropFilter: "blur(15px)",
};

const fullPreviewImage = {
  maxWidth: "94vw",
  maxHeight: "88vh",
  objectFit: "contain" as const,
  borderRadius: "15px",
  boxShadow:
    "0 25px 80px rgba(0,0,0,0.6)",
};

const imagePreviewClose = {
  position: "absolute" as const,
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