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
```

## 솔라피 알림톡 설정

본 프로젝트는 휴대폰 인증을 위해 솔라피 알림톡 API를 사용합니다. 다음 정보가 설정되어 있습니다:

- pfId: KA01PF2504110309591075HUSei4iarb
- templateId: KA01TP250430143738849XalNf3Jco1v

알림톡 템플릿은 다음과 같은 형식으로 설정되어야 합니다:
```
⚠️[사장노트] 인증번호는 [#{인증번호}]입니다. 3분 이내에 입력해주세요.
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
