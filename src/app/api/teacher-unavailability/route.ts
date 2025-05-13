import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
        return NextResponse.json(
            { error: 'Teacher ID is required' },
            { status: 400 }
        );
    }

    try {
        const supabase = createRouteHandlerClient({ cookies });
        
        // Check if the day_of_week column exists
        const { data: columnInfo, error: columnError } = await supabase
            .from('teacher_unavailability')
            .select('*')
            .limit(1);

        // Determine the correct column name for day
        const dayColumnName = columnInfo && columnInfo.length > 0 && 'day_of_week' in columnInfo[0] 
            ? 'day_of_week' 
            : 'day';

        // Query with the correct column name
        const { data, error } = await supabase
            .from('teacher_unavailability')
            .select('*')
            .eq('teacher_id', teacherId)
            .order(dayColumnName, { ascending: true });

        if (error) {
            throw error;
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Error fetching teacher unavailability:', error);
        return NextResponse.json(
            { error: 'Failed to fetch teacher unavailability' },
            { status: 500 }
        );
    }
} 