import { getSql, isDatabaseConfigured } from '@/lib/db/client'
import { NextResponse } from 'next/server'

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'DATABASE_URL is not configured',
      },
      { status: 503 }
    )
  }

  try {
    const sql = getSql()
    const result = await sql`SELECT NOW() AS current_time`

    return NextResponse.json({
      success: true,
      databaseTime: result[0].current_time,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
      },
      { status: 500 }
    )
  }
}
