# 매장 URL 변경 기능 문제 분석 및 해결 방안

## 현재 문제 상황

현재 내 매장 관리 페이지(`/my-places`)에서 매장 URL 변경 기능에 다음과 같은 문제가 발생하고 있습니다:

1. **Edge Function 처리 불일치**:

   - Edge Function 로그에는 처리가 완료된 것으로 표시됨 (`[AI Analysis Success]`)
   - 하지만 실제 테이블에는 상태가 `processing`으로 유지되고 있음
   - `crawled_data` 필드가 `null`로 유지됨

2. **URL 형식 문제**:

   - 사용자가 입력한 원본 URL 그대로 `place_url`에 저장됨
   - 처리된 형태의 모바일 URL(`m.place.naver.com` 형식)으로 변환되지 않음

3. **변경 횟수 차감 타이밍 문제**:
   - 매장 데이터가 성공적으로 불러와지기 전에 변경 횟수가 차감됨
   - 이로 인해 실패해도 변경 횟수가 차감되는 문제 발생

## 원인 분석

1. **`change_place` 함수 분석**:

   ```sql
   UPDATE places
   SET
     place_id = p_new_naver_place_id,
     place_url = p_new_place_url,
     place_name = NULL, -- 새 이름은 크롤링 후 업데이트
     place_address = NULL, -- 새 주소는 크롤링 후 업데이트
     crawled_data = NULL, -- 크롤링 데이터 초기화
     status = 'processing', -- 상태를 처리중으로 변경
     content_last_changed_at = NOW(), -- 콘텐츠 변경 시간 업데이트
     updated_at = NOW() -- 업데이트 시간 갱신
   WHERE id = p_place_id AND user_id = p_user_id;
   ```

   - 변경 시 데이터를 초기화하고 상태를 `processing`으로 변경만 함
   - 실제 크롤링 및 AI 처리가 완료되지 않은 상태에서 처리가 끝난 것으로 간주됨

2. **Edge Function - DB 업데이트 불일치**:

   - Edge Function이 실행되어 데이터 처리는 완료되었으나, 이 결과가 DB에 반영되지 않음
   - 로그를 확인하면 Edge Function 내에서 `updatePlaceError` 함수가 호출되지 않았음
   - 즉, 함수 내부에서는 오류가 감지되지 않았으나 DB 업데이트 로직이 정상 작동하지 않음

3. **URL 처리 불일치**:
   - URL을 파싱하여 네이버 Place ID는 추출하고 있으나, 표준화된 모바일 URL로 저장하지 않음
   - 별도의 트랜잭션/함수로 URL 변경 처리 후 Edge Function 호출이 이루어지지 않음

## 해결 방안

1. **프로세스 개선**:

   ```
   현재:
   URL 변경 요청 -> change_place 실행 (DB 업데이트 + 프로필 변경) -> 프로세스 종료

   개선:
   URL 변경 요청 -> URL 검증 및 네이버 ID 추출 -> 기록 생성(processing) -> 크롤링 실행 -> 처리 완료 확인 -> change_place 실행 (변경 횟수 차감)
   ```

2. **`change_place` 함수 수정**:

   - 함수를 두 단계로 분리:
     1. `prepare_place_change`: URL 유효성 검증, 상태 `processing`으로 변경 (변경 횟수 미차감)
     2. `complete_place_change`: 크롤링 및 처리 성공 확인 후 변경 횟수 차감 및 변경 로그 기록

3. **Edge Function 개선**:

   - 처리 완료 후 명시적으로 DB 업데이트가 성공했는지 확인하는 로직 추가
   - 오류 발생 시 더 자세한 로그 생성

4. **URL 형식 표준화**:

   - URL을 항상 `m.place.naver.com/restaurant/{naverPlaceId}/home` 형식으로 변환하여 저장
   - 이를 위한 헬퍼 함수 추가: `standardizeNaverPlaceUrl(naverPlaceId)`

5. **처리 상태 명확화**:
   - `status` 필드에 더 세부적인 상태 추가:
     - `preparing` (변경 준비 중)
     - `crawling` (크롤링 중)
     - `processing` (AI 분석 중)
     - `completed` (완료)
     - `failed` (실패)

## 구현 계획

1. **SQL 마이그레이션**:

   - `prepare_place_change` 및 `complete_place_change` 함수 구현
   - 로그 테이블에 상태 필드 추가

2. **API 엔드포인트 수정**:

   - `/api/my-places/change` 엔드포인트의 처리 로직 변경
   - URL 처리 및 상태 관리 개선

3. **Edge Function 수정**:

   - 성공/실패 처리 강화
   - 로깅 개선

4. **클라이언트 UI 개선**:
   - 상태에 따른 UI 피드백 추가
   - 변경 중인 매장에 대한 명확한 상태 표시
