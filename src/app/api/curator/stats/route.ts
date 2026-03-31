import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CURATOR") {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // Fetch all applications for tasks created by this curator
  const applications = await prisma.application.findMany({
    where: {
      task: {
        curatorId: session.user.id,
      },
    },
    select: {
      status: true,
      matchScore: true,
      verificationResult: true,
    },
  });

  // 1. Calculate AI Efficiency (avg matchScore of ACCEPTED or VERIFIED applications)
  const matchedApps = applications.filter(
    (app) => app.matchScore !== null && (app.status === "ACCEPTED" || app.status === "VERIFIED" || app.status === "COMPLETED")
  );
  
  let aiEfficiency = 0;
  if (matchedApps.length > 0) {
    const totalScore = matchedApps.reduce((acc, app) => acc + (app.matchScore || 0), 0);
    aiEfficiency = Math.round((totalScore / matchedApps.length) * 100);
  }

  // 2. Calculate Verification Status (avg confidence of VERIFIED applications)
  const verifiedApps = applications.filter((app) => app.status === "VERIFIED" && app.verificationResult);
  
  let verificationStatus = 0;
  if (verifiedApps.length > 0) {
    let totalConfidence = 0;
    let count = 0;
    for (const app of verifiedApps) {
      const vResult = app.verificationResult as any;
      if (vResult && typeof vResult.confidence === "number") {
        totalConfidence += vResult.confidence;
        count++;
      }
    }
    if (count > 0) {
      verificationStatus = Math.round((totalConfidence / count) * 100);
    }
  }

  // 3. Count pending verifications (COMPLETED applications awaiting curator review)
  const pendingVerificationsCount = applications.filter((app) => app.status === "COMPLETED").length;

  return NextResponse.json({
    aiEfficiency,
    verificationStatus,
    pendingVerificationsCount,
    hasData: matchedApps.length > 0 || verifiedApps.length > 0
  });
}
