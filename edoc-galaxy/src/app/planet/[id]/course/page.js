import { notFound } from "next/navigation";
import CourseScreen from "../../../../screens/course/CourseScreen";
import { summarizeApproach } from "../../../../lib/server/approachData";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const a = await summarizeApproach(id);
  return { title: a ? `Setting course for ${a.name} · edoc` : "edoc" };
}

export default async function CoursePage({ params }) {
  const { id } = await params;
  const a = await summarizeApproach(id);
  if (!a) notFound();
  return <CourseScreen planetId={id} captions={a.course} next={`/planet/${id}/approach`} />;
}
