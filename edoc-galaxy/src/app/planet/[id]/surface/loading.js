/** Shown while the surface screen is on its way: the same black the scenes fade from, so nothing flashes. */
export default function SurfaceLoading() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#02060d" }} role="status">
      <span className="art-loading-label">Touching down</span>
    </div>
  );
}
