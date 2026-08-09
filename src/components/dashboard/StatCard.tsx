type StatCardProps = {
  title: string;
  value: string;
  change: string;
};

export default function StatCard({
  title,
  value,
  change,
}: StatCardProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "24px",
        padding: "25px",
        color: "white",
        backdropFilter: "blur(20px)",
      }}
    >
      <p
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: "14px",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          fontSize: "36px",
          fontWeight: 700,
          marginTop: "12px",
        }}
      >
        {value}
      </h2>

      <p
        style={{
          marginTop: "10px",
          color: "#34d399",
          fontSize: "14px",
        }}
      >
        {change}
      </p>
    </div>
  );
}