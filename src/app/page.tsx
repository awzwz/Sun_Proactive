import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session?.user?.role === "CURATOR") {
    redirect("/curator/dashboard");
  }
  if (session?.user?.role === "VOLUNTEER") {
    redirect("/volunteer/dashboard");
  }

  redirect("/login");
}
