import { NextResponse } from 'next/server';
import { NaverDocumentAPI } from '@/lib/naver-document-api';

export async function GET() {
  try {
    const documentAPI = new NaverDocumentAPI();
    const openApiKeyStatus = documentAPI.getOpenApiKeyStatus();
    const totalRemainingOpenApiCalls = documentAPI.getTotalRemainingOpenApiCalls();

    return NextResponse.json({ 
      openApiKeyStatus, 
      totalRemainingOpenApiCalls 
    });
  } catch (error) {
    console.error('OpenAPI 키 상태 조회 오류:', error);
    return NextResponse.json(
      { 
        message: 'OpenAPI 키 상태를 불러오는데 실패했습니다.', 
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
