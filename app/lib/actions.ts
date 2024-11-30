'use server';
import { z } from 'zod';
import { db } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect, RedirectType } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = z.object({
	id: z.string(),
	customerId: z.string(),
	amount: z.coerce.number(),
	status: z.enum(['pending', 'paid']),
	date: z.string(),
});
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
	const { customerId, amount, status } = CreateInvoice.parse({
		customerId: formData.get('customerId'),
		amount: formData.get('amount'),
		status: formData.get('status'),
	});
	const amountInCents = amount * 100;
	const date = new Date().toISOString().split('T')[0];

	const client = await db.connect();
	try {
		await client.sql`
		INSERT INTO invoices (customer_id, amount, status, date)
		VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
		`;
	} catch (e) {
		console.error('Database Error:', e);
		return { message: 'Database Error: Failed to add new invoice.' }
	} finally { client.release(); }
	revalidatePath('/dashboard/invoices');
	redirect('/dashboard/invoices');
}
export async function updateInvoice(id: string, formData: FormData) {
	const { customerId, amount, status } = CreateInvoice.parse({
		customerId: formData.get('customerId'),
		amount: formData.get('amount'),
		status: formData.get('status'),
	});
	const amountInCents = amount * 100;

	const client = await db.connect();
	try {
		await client.sql`
		UPDATE invoices SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
		WHERE id = ${id}
		`;
	} catch (e) {
		console.error('Database Error:', e);
		return { message: 'Database Error: Failed to edit the invoice.' }
	} finally { client.release(); }
	revalidatePath('/dashboard/invoices');
	redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
	// throw new Error("My error");
	const client = await db.connect();
	try {
		await client.sql`
	  DELETE FROM invoices WHERE id = ${id}
		`;
	} catch (e) {
		console.error('Database Error:', e);
		return { message: 'Database Error: Failed to delete the invoice.' }
	} finally { client.release(); }
	revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}