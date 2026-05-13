export default function CanvasBanner({ selectedOrigin, onCancel }) {
  if (!selectedOrigin) return null;
  return <div className="cam-banner active">Origem: {selectedOrigin} · Clique no destino · ESC cancela</div>;
}
