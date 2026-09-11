"use client";

import { useRouter } from "next/navigation";

import { LocationInput } from "@/components/location/location-input";
import { locationToResultsUrl } from "@/lib/schools/results-url";

export function HomeLocationSearch() {
  const router = useRouter();
  return <LocationInput onResolved={(location) => router.push(locationToResultsUrl(location))} />;
}
