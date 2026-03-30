/**
 * Notifications API
 * GET: Fetch notifications for authenticated user
 * PATCH: Mark notifications as read/unread
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('api:notifications');

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await rateLimit(ip, 100, 60);

    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMIT' }, { status: 429 });
    }

    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const supabase = createClient();
    
    // Fetch user-specific notifications or role-based notifications
    let query = supabase.from('notifications').select('*');

    if (user.role === 'superadmin') {
      // SuperAdmin sees global notifications or those targeted at their role
      query = query.or(`user_id.eq.${user.user_id},target_role.eq.superadmin`);
    } else if (user.role === 'admin') {
      // Admin sees shop-related notifications
      query = query.or(`user_id.eq.${user.user_id},target_role.eq.admin`);
    } else {
      // Customer sees only their own notifications
      query = query.eq('user_id', user.user_id);
    }

    const { data: notifications, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('Notifications query error:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications', code: 'FETCH_ERROR' }, { status: 500 });
    }

    return NextResponse.json(notifications || []);
  } catch (error) {
    logger.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { getUser } = await import('@/lib/supabase/server');
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, read } = body;

    if (!Array.isArray(notificationIds) || typeof read !== 'boolean') {
      return NextResponse.json({ error: 'Invalid input', code: 'INVALID_INPUT' }, { status: 400 });
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read })
      .in('id', notificationIds)
      .eq('user_id', user.user_id); // Security: Can only update own notifications

    if (error) {
      logger.error('Notifications update error:', error);
      return NextResponse.json({ error: 'Failed to update notifications', code: 'UPDATE_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in PATCH /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
