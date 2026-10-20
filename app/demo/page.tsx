import { notFound } from "next/navigation";
import { AnuChat } from "@/components/anu-chat";

export default function DemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AnuChat localDemo />;
}
