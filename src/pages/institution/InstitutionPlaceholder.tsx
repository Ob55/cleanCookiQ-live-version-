import { useLocation } from "react-router-dom";

export default function InstitutionPlaceholder() {
  const location = useLocation();
  const section = location.pathname.split("/").pop() || "Section";
  const title = section.charAt(0).toUpperCase() + section.slice(1);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="bg-white rounded-xl p-10" style={{ border: "1px solid #DDDDDD" }}>
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "Georgia, serif", color: "#0A400C" }}>
          {title}
        </h2>
        <p className="text-sm" style={{ color: "#666", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          This section is coming soon.
        </p>
      </div>
    </div>
  );
}
