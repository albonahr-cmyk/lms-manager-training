"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { QuestionType } from "@prisma/client";
import { requireAdmin } from "@/server/auth";
import {
  addQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/server/services/test-admin";
import { AppError } from "@/lib/errors";
import { ok, err, type ApiResult } from "@/lib/result";

const QuestionTypeEnum = z.enum(["SINGLE", "MULTIPLE"]);

const ChoiceSchema = z.object({
  label: z.string().min(1),
  correct: z.boolean(),
});

const QuestionPayloadSchema = z.object({
  testId: z.string().min(1),
  type: QuestionTypeEnum,
  prompt: z.string().min(1),
  explanation: z.string().default(""),
  choices: z.array(ChoiceSchema).min(2),
});

export type AddQuestionPayload = {
  testId: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  choices: { label: string; correct: boolean }[];
};

export async function addQuestionAction(
  payload: AddQuestionPayload,
): Promise<ApiResult<{ questionId: string }>> {
  const actor = await requireAdmin();
  const parsed = QuestionPayloadSchema.safeParse(payload);
  if (!parsed.success) return err("VALIDATION_FAILED", "入力値が不正です。");
  try {
    const r = await addQuestion(actor.id, parsed.data);
    revalidatePath(`/admin/tests/${parsed.data.testId}`);
    return ok(r);
  } catch (e) {
    if (e instanceof AppError) return err(e.code, e.message);
    return err("INTERNAL", "設問の追加に失敗しました。");
  }
}

const UpdatePayloadSchema = QuestionPayloadSchema.extend({
  id: z.string().min(1),
});

export type UpdateQuestionPayload = AddQuestionPayload & { id: string };

export async function updateQuestionAction(
  payload: UpdateQuestionPayload,
): Promise<ApiResult<null>> {
  const actor = await requireAdmin();
  const parsed = UpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) return err("VALIDATION_FAILED", "入力値が不正です。");
  try {
    await updateQuestion(actor.id, {
      id: parsed.data.id,
      testId: parsed.data.testId,
      type: parsed.data.type,
      prompt: parsed.data.prompt,
      explanation: parsed.data.explanation,
      choices: parsed.data.choices,
    });
    revalidatePath(`/admin/tests/${parsed.data.testId}`);
    return ok(null);
  } catch (e) {
    if (e instanceof AppError) return err(e.code, e.message);
    return err("INTERNAL", "更新に失敗しました。");
  }
}

const DeleteSchema = z.object({
  id: z.string().min(1),
  testId: z.string().min(1),
});

export async function deleteQuestionAction(
  payload: { id: string; testId: string },
): Promise<ApiResult<null>> {
  const actor = await requireAdmin();
  const parsed = DeleteSchema.safeParse(payload);
  if (!parsed.success) return err("VALIDATION_FAILED", "入力値が不正です。");
  try {
    await deleteQuestion(actor.id, { id: parsed.data.id, testId: parsed.data.testId });
    revalidatePath(`/admin/tests/${parsed.data.testId}`);
    return ok(null);
  } catch (e) {
    if (e instanceof AppError) return err(e.code, e.message);
    return err("INTERNAL", "削除に失敗しました。");
  }
}

const ReorderSchema = z.object({
  testId: z.string().min(1),
  idA: z.string().min(1),
  orderA: z.number().int().min(0),
  idB: z.string().min(1),
  orderB: z.number().int().min(0),
});

export type ReorderQuestionPayload = {
  testId: string;
  idA: string;
  orderA: number;
  idB: string;
  orderB: number;
};

/**
 * 隣接する 2 設問の order を swap する。
 * フロントが「↑」「↓」ボタンで呼び出す。
 */
export async function reorderQuestionAction(
  payload: ReorderQuestionPayload,
): Promise<ApiResult<null>> {
  await requireAdmin();
  const parsed = ReorderSchema.safeParse(payload);
  if (!parsed.success) return err("VALIDATION_FAILED", "入力値が不正です。");
  const { testId, idA, orderA, idB, orderB } = parsed.data;

  try {
    const { prisma } = await import("@/server/repositories/db");
    // 両設問が同じテストに属することを確認
    const [qA, qB] = await Promise.all([
      prisma.question.findUnique({ where: { id: idA }, select: { id: true, testId: true } }),
      prisma.question.findUnique({ where: { id: idB }, select: { id: true, testId: true } }),
    ]);
    if (!qA || qA.testId !== testId) return err("NOT_FOUND", "設問が見つかりません。");
    if (!qB || qB.testId !== testId) return err("NOT_FOUND", "設問が見つかりません。");

    // order を swap
    await prisma.$transaction([
      prisma.question.update({ where: { id: idA }, data: { order: orderB } }),
      prisma.question.update({ where: { id: idB }, data: { order: orderA } }),
    ]);
    revalidatePath(`/admin/tests/${testId}`);
    return ok(null);
  } catch (e) {
    if (e instanceof AppError) return err(e.code, e.message);
    return err("INTERNAL", "並び替えに失敗しました。");
  }
}
