import { notFound } from "next/navigation";
import CourseScreen from "../../../../screens/course/CourseScreen";
import { APPROACH } from "../../../../data/approach";

export async function generateStaticParams() {
  return Object.keys(APPROACH).map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const a = APPROACH[id];
  return { title: a ? `Setting course for ${a.name} · edoc` : "edoc" };
}

export default async function CoursePage({ params }) {
  const { id } = await params;
  const a = APPROACH[id];
  if (!a) notFound();
  return <CourseScreen planetId={id} captions={a.course} next={`/planet/${id}/approach`} />;
}
