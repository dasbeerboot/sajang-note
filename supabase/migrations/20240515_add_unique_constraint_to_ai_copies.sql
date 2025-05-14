-- place_id와 copy_type의 복합 고유 제약 조건 추가
ALTER TABLE ai_generated_copies
ADD CONSTRAINT ai_generated_copies_place_id_copy_type_key
UNIQUE (place_id, copy_type, user_id);

-- 제약 조건 추가 설명:
-- 이 복합 고유 제약 조건은 특정 장소(place_id)와 카피 유형(copy_type)의 조합이
-- 특정 사용자(user_id)에 대해 고유함을 보장합니다.
-- 이를 통해 ON CONFLICT 구문이 올바르게 작동할 수 있습니다. 