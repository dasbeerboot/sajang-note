This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정합니다:

```bash
# 솔라피 API 키
SOLAPI_API_KEY=YOUR_SOLAPI_API_KEY
SOLAPI_API_SECRET=YOUR_SOLAPI_API_SECRET

# 솔라피 발신번호 (실제 등록된 발신번호)
SOLAPI_SENDER_NUMBER=01012345678

# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# 사이트 URL (SEO 관련)
NEXT_PUBLIC_SITE_URL=https://sajang-note.vercel.app

# Mixpanel 분석 토큰
NEXT_PUBLIC_MIXPANEL_TOKEN=YOUR_MIXPANEL_TOKEN
```

## 솔라피 알림톡 설정

본 프로젝트는 휴대폰 인증을 위해 솔라피 알림톡 API를 사용합니다. 다음 정보가 설정되어 있습니다:

- pfId: KA01PF2504110309591075HUSei4iarb
- templateId: KA01TP250430143738849XalNf3Jco1v

알림톡 템플릿은 다음과 같은 형식으로 설정되어야 합니다:

```
⚠️[사장노트] 인증번호는 [#{인증번호}]입니다. 3분 이내에 입력해주세요.
```

## SEO 최적화: Sitemap 및 Robots.txt

이 프로젝트는 SEO 최적화를 위해 자동 생성되는 sitemap.xml 및 robots.txt 파일을 포함하고 있습니다.

### Sitemap 설정

- `src/app/sitemap.ts` 파일에서 사이트맵 생성 로직을 관리합니다.
- 정적 경로와 동적 경로(데이터베이스에서 가져온)를 모두 포함할 수 있습니다.
- 빌드 시 자동으로 `/sitemap.xml`로 변환됩니다.

### Robots.txt 설정

- `src/app/robots.ts` 파일에서 검색 엔진 크롤러에 대한 규칙을 관리합니다.
- 특정 경로의 접근 허용/거부 규칙을 설정할 수 있습니다.
- 빌드 시 자동으로 `/robots.txt`로 변환됩니다.

### 사용 방법

새로운 페이지를 추가할 때 `sitemap.ts` 파일에 해당 경로를 추가하여 검색 엔진에 노출될 수 있도록 합니다. 예:

```typescript
// 정적 페이지 추가 예시
{
  url: `${baseUrl}/new-page`,
  lastModified: new Date(),
  changeFrequency: 'weekly' as const,
  priority: 0.7,
}
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
