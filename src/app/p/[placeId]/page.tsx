'use client';

import { useParams } from 'next/navigation';
import PlaceDetailClient from '@/components/PlaceDetailClient';

export default function PlaceDetailPage() {
  const params = useParams();
  const placeId = params.placeId as string;

  return <PlaceDetailClient placeId={placeId} />;
}
