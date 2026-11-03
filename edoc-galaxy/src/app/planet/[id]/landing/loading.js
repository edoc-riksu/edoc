/** Shown while the landing screen is on its way: the same black the scenes fade from, so nothing flashes. */
export default function LandingLoading() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#02060d" }} role="status">
      <span className="art-loading-label">Preparing the descent</span>
    </div>
  );
}
