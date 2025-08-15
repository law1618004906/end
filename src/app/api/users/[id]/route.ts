import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';

// حماية الآدمن الرئيسي من التعديل أو الحذف
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return requireAuth(async (req, user) => {
    const { id } = params;
    
    // منع تعديل الآدمن الرئيسي
    if (id === 'admin-root-permanent') {
      return NextResponse.json(
        { error: 'لا يمكن تعديل الآدمن الرئيسي - محمي دائماً' },
        { status: 403 }
      );
    }
    
    // باقي منطق تعديل المستخدمين العاديين
    return NextResponse.json({ message: 'تم التعديل بنجاح' });
  })(request);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return requireAuth(async (req, user) => {
    const { id } = params;
    
    // منع حذف الآدمن الرئيسي
    if (id === 'admin-root-permanent') {
      return NextResponse.json(
        { error: 'لا يمكن حذف الآدمن الرئيسي - محمي دائماً' },
        { status: 403 }
      );
    }
    
    // باقي منطق حذف المستخدمين العاديين
    return NextResponse.json({ message: 'تم الحذف بنجاح' });
  })(request);
}
