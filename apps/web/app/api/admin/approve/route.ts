/**
 * Admin Approval Route
 * SuperAdmin approves or rejects admin applications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UserRole, UserStatus } from '@happypets/shared';
import { rateLimit } from '@/lib/redis';
import { sendAdminApprovalNotification } from '@/lib/resend';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:admin:approve');

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 50, 60);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    // Check authentication (superadmin only)
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user || user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse request
    const body = await request.json();
    const { adminId, action } = body;

    if (!adminId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get admin profile
    const { data: adminProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*, auth_users!inner(email)')
      .eq('user_id', adminId)
      .single();

    if (fetchError || !adminProfile) {
      return NextResponse.json(
        { error: 'Admin not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (adminProfile.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'User is not an admin', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Update status
    const newStatus = action === 'approve' ? UserStatus.APPROVED : UserStatus.REJECTED;

    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', adminId)
      .select()
      .single();

    if (updateError || !updatedProfile) {
      logger.error('Failed to update admin status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update admin', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Send notification email
    await sendAdminApprovalNotification(
      { ...adminProfile, email: adminProfile.auth_users?.email },
      action === 'approve'
    );

    // Create notification for admin
    try {
      await supabase.from('notifications').insert({
        user_id: adminId,
        type: action === 'approve' ? 'ADMIN_APPROVED' : 'ADMIN_REJECTED',
        title:
          action === 'approve'
            ? 'Your admin account has been approved!'
            : 'Your admin application has been reviewed',
        message:
          action === 'approve'
            ? 'You can now manage your shop and products'
            : 'Please contact support for more information',
      });
    } catch (error) {
      logger.warn('Failed to create notification:', error);
    }

    logger.info(
      `Admin ${adminId} ${action === 'approve' ? 'approved' : 'rejected'}`
    );

    return NextResponse.json(updatedProfile);
  } catch (error) {
    logger.error('Error in POST /api/admin/approve:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
