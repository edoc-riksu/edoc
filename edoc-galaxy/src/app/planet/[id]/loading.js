/** Shown while a planet screen is on its way. */
export default function PlanetLoading() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#04070d" }} role="status">
      <span className="art-loading-label">Charting your course</span>
    </div>
  );
}
