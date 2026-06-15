export default function StatsCard({ label, value, colorClass }) {
  return (
    <div className={`p-6 rounded-xl shadow-sm border-l-4 bg-white flex flex-col justify-center ${colorClass}`}>
      <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-4xl font-extrabold text-gray-800 mt-2">{value ?? '-'}</p>
    </div>
  );
}
