import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

declare module 'next/headers' {
  // cookies 함수의 반환 타입을 확장
  function cookies(): ReadonlyRequestCookies & {
    get(name: string): { name: string; value: string } | undefined;
    set(options: { name: string; value: string; [key: string]: any }): void;
    delete(options: { name: string; [key: string]: any }): void;
  };
} 