"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAllReviews() {
  try {
    if (!prisma.review) {
      console.error("Prisma Error: 'Review' model is not defined in the Prisma client. Check schema sync.");
      return [];
    }
    return await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Review Fetch Failure (Vercel Log):", error.message, error.stack);
    return [];
  }
}

export async function updateReviewStatus(id, isApproved) {
  try {
    await prisma.review.update({
      where: { id },
      data: { isApproved },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Update Review Error:", error);
    return { error: "Güncelleme hatası." };
  }
}

export async function deleteReview(id) {
  try {
    await prisma.review.delete({
      where: { id },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Delete Review Error:", error);
    return { error: "Silme hatası." };
  }
}

export async function updateReviewContent(id, data) {
  try {
    await prisma.review.update({
      where: { id },
      data: {
        name: data.name,
        handle: data.handle,
        text: data.text,
        rating: parseInt(data.rating),
      },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Update Content Error:", error);
    return { error: "Düzenleme hatası." };
  }
}
