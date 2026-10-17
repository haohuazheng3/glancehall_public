import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getModel, getTask, models, tasks } from "@/lib/catalog";
import { mediaUrl } from "@/lib/site";
import { LivePlayer } from "@/components/LivePlayer";

export const dynamicParams = false;

export function generateStaticParams() {
  return tasks.flatMap((t) => models.filter((m) => t.runs[m.key]?.status === "ok").map((m) => ({ task: t.slug, model: m.key })));
}

export async function generateMetadata({ params }: { params: Promise<{ task: string; model: string }> }): Promise<Metadata> {
  const { task: ts, model: mk } = await params;
  const task = getTask(ts);
  const model = getModel(mk);
  if (!task || !model) return {};
  return {
    title: `${model.name}'s ${task.title.toLowerCase()}, live`,
    description: `Run the ${task.title.toLowerCase()} that ${model.name} built in one shot, exactly as delivered: no edits, no fixes.`,
    alternates: { canonical: `/play/${task.slug}/${model.key}` },
  };
}

export default async function PlayPage({ params }: { params: Promise<{ task: string; model: string }> }) {
  const { task: ts, model: mk } = await params;
  const task = getTask(ts);
  const model = getModel(mk);
  if (!task || !model) notFound();
  const run = task.runs[model.key];
  const src = mediaUrl(run?.artifact);
  if (!src) notFound();
  const others = models.filter((m) => m.key !== model.key && task.runs[m.key]?.status === "ok").map((m) => ({ key: m.key, name: m.name, accent: m.accent }));
  return (
    <LivePlayer
      src={src}
      task={{ slug: task.slug, title: task.title, category: task.category, views: task.views }}
      model={{ key: model.key, name: model.name, accent: model.accent, effortLabel: model.effortLabel }}
      others={others}
      game={task.dir === "04-fps-arena"}
    />
  );
}
