import { notFound } from "next/navigation";
import { artPreviewsOpen } from "../../art/previewAccess";

/** The review pages are for the team: closed on the live production site. */
export default function ArtLayout({ children }) {
  if (!artPreviewsOpen()) notFound();
  return children;
}
