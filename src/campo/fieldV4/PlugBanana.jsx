export default function PlugBanana({ id, color }) {
  return (
    <div className="plug-container">
      <div
        className={`plug plug-${color}`}
        data-port={id}
        title={id}
      />
      <div className="plug-label">{id}</div>
    </div>
  );
}
