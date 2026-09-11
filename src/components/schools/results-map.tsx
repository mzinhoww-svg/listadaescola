"use client";

import { useRouter } from "next/navigation";

import { Map } from "@/components/map/map";
import { schoolHref } from "@/components/schools/school-card";
import type { SchoolResult } from "@/lib/schools/search-schools";

const MT_CENTER = { lat: -12.6819, lon: -56.9211 };

export interface ResultsMapProps {
  schools: SchoolResult[];
  center: { lat: number; lon: number } | null;
}

export function ResultsMap({ schools, center }: ResultsMapProps) {
  const router = useRouter();
  const withCoords = schools.filter(
    (school): school is SchoolResult & { latitude: number; longitude: number } =>
      school.latitude !== null && school.longitude !== null
  );

  return (
    <Map
      center={center ?? MT_CENTER}
      zoom={center ? 13 : 6}
      markers={withCoords.map((school) => ({
        id: school.id,
        lat: school.latitude,
        lon: school.longitude,
        label: school.name,
      }))}
      onMarkerClick={(id) => {
        const school = schools.find((s) => s.id === id);
        if (school) router.push(schoolHref(school));
      }}
      className="overflow-hidden rounded-xl border border-neutral-200"
      height={320}
    />
  );
}
