export default function CampoStatus({ bkStatus }) {
  const statusMap = {
    '52a': bkStatus?.state === 'closed' ? 'on' : 'off',
    '52b': bkStatus?.state === 'open' ? 'on' : 'off',
    'FC': 'off',
    'BL': 'off'
  };

  return (
    <div className="cam-card">
      <div className="cam-card-title">⚡ Status</div>
      <div className="cam-status">
        {Object.entries(statusMap).map(([label, state]) => (
          <div key={label} className={`cam-status-pill ${state}`}>
            {label}: {state === 'on' ? 'ON' : 'OFF'}
          </div>
        ))}
      </div>
    </div>
  );
}
