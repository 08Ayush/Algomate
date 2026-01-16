import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST - Unpublish a bucket (set is_published to false)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const bucketId = params.id;

        if (!bucketId) {
            return NextResponse.json(
                { error: 'Bucket ID is required' },
                { status: 400 }
            );
        }

        // Check if bucket exists
        const { data: bucket, error: fetchError } = await supabaseAdmin
            .from('elective_buckets')
            .select('id, is_published, bucket_name')
            .eq('id', bucketId)
            .single();

        if (fetchError || !bucket) {
            return NextResponse.json(
                { error: 'Bucket not found' },
                { status: 404 }
            );
        }

        if (!bucket.is_published) {
            return NextResponse.json(
                { error: 'Bucket is already unpublished' },
                { status: 400 }
            );
        }

        // Unpublish the bucket
        const { data: updatedBucket, error: updateError } = await supabaseAdmin
            .from('elective_buckets')
            .update({
                is_published: false,
                published_at: null,
                published_by: null
            })
            .eq('id', bucketId)
            .select()
            .single();

        if (updateError) {
            console.error('Error unpublishing bucket:', updateError);
            return NextResponse.json(
                { error: 'Failed to unpublish bucket' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Bucket unpublished successfully',
            bucket: updatedBucket
        });

    } catch (error) {
        console.error('Error unpublishing bucket:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
