'use server';

import { z } from 'zod';
import { MANAGER_ROLES } from '../permissions';
import { createUserSchema, reviewSchema, updateUserSchema, type CreateUserInput, type ReviewInput, type UpdateUserInput } from '../../lib/schemas/users';
import { reviewAccessRequest } from '../services/commands/accessRequests';
import { createUser, deactivateUser, setUserActive, updateUser } from '../services/commands/users';
import { runAction } from './runAction';

const id = z.string().min(1);
const opts = { revalidate: ['/usuarios'], roles: MANAGER_ROLES } as const;

export async function createUserAction(input: CreateUserInput) {
  return runAction({ schema: createUserSchema, input, ...opts }, async (actor, data) => { await createUser(actor, data); return null; });
}

export async function updateUserAction(userId: string, input: UpdateUserInput) {
  return runAction({ schema: updateUserSchema.extend({ id }), input: { ...input, id: userId }, ...opts }, async (actor, { id: target, ...data }) => {
    await updateUser(actor, target, data);
    return null;
  });
}

export async function setUserActiveAction(userId: string, active: boolean) {
  return runAction({ schema: z.object({ id, active: z.boolean() }), input: { id: userId, active }, ...opts }, async (actor, data) => {
    await setUserActive(actor, data.id, data.active);
    return null;
  });
}

export async function deactivateUserAction(userId: string) {
  return runAction({ schema: z.object({ id }), input: { id: userId }, ...opts }, async (actor, data) => { await deactivateUser(actor, data.id); return null; });
}

export async function reviewAccessRequestAction(requestId: string, input: ReviewInput) {
  return runAction({ schema: reviewSchema.extend({ id }), input: { ...input, id: requestId }, ...opts }, async (actor, { id: target, ...data }) => {
    await reviewAccessRequest(actor, target, data);
    return null;
  });
}
