import FeatureCard from './FeatureCard';
import { Gauge, Robot, MagnifyingGlass, ShareNetwork } from '@phosphor-icons/react';

export default function FeatureSection() {
  return (
    <section className="py-12 bg-base-200 rounded-xl">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10">사장노트 이렇게 활용하세요</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 자동 정보 수집 */}
          <FeatureCard
            title="자동 정보 수집"
            description="URL만 입력하면 우리 매장 정보를 자동으로 수집하여 최적의 콘텐츠 생성"
            icon={<Robot size={48} weight="duotone" className="text-primary" />}
          />

          {/* 상위노출 최적화 */}
          <FeatureCard
            title="상위노출 최적화"
            description="검색엔진과 플랫폼 알고리즘에 최적화된 키워드와 문구로 노출 확률 증가"
            icon={<MagnifyingGlass size={48} weight="duotone" className="text-primary" />}
          />

          {/* 높은 클릭률 */}
          <FeatureCard
            title="높은 클릭률"
            description="고객의 관심을 끌고 클릭을 유도하는 매력적인 문구와 콘텐츠 자동 생성"
            icon={<Gauge size={48} weight="duotone" className="text-primary" />}
          />

          {/* 모든 플랫폼 지원 */}
          <FeatureCard
            title="모든 플랫폼 지원"
            description="당근, 파워링크부터 인스타, 쓰레드까지 모든 마케팅 채널에 최적화된 콘텐츠 자동 생성"
            icon={<ShareNetwork size={48} weight="duotone" className="text-primary" />}
          />
        </div>
      </div>
    </section>
  );
}
