/**
 * Suspended Account Page
 * Shown when user account has been suspended by SuperAdmin
 * Server component - fetches suspension reason
 */

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { logoutAction } from '@/app/actions/auth';

export const metadata: Metadata = {
  title: 'Account Suspended',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SuspendedPage() {
  const user = await getUser();

  // If user is not suspended, redirect to home
  if (!user || user.status !== 'suspended') {
    redirect('/');
  }

  const suspensionReason = user.suspension_reason || 
    'Your account has been suspended. Please contact support for more information.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {/* Warning Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Account Suspended
        </h1>

        {/* Reason */}
        <div className="mb-6 text-gray-600">
          <p className="text-sm mb-4">
            {suspensionReason}
          </p>

          <p className="text-xs text-gray-500">
            If you believe this is a mistake or have any questions, please contact our support team.
          </p>
        </div>

        {/* Contact Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Support Email:</span>
            <br />
            <a
              href="mailto:support@thehappypets.in"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              support@thehappypets.in
            </a>
          </p>
        </div>

        {/* Sign Out Button */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            Sign Out
          </button>
        </form>

        {/* Footer Note */}
        <p className="text-xs text-gray-400 mt-6">
          Your account will remain suspended until further notice.
        </p>
      </div>
    </div>
  );
}
