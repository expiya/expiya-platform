export const carsRoutes = Object.freeze({
  home: "/cars",
  analysis: "/cars/analysis",
  catalog: "/cars/catalog",
  recommendationTerms: "/cars/arac-oneri-kosullari",
  salesAdvisorDisclosure: "/cars/satis-danismani-bilgilendirmesi",
});

export function carsDecisionPath(decisionId: string): string {
  return `/cars/decision/${encodeURIComponent(decisionId)}`;
}

export const legacyCarsRedirects = Object.freeze([
  { source: "/analysis", destination: carsRoutes.analysis, permanent: false },
  { source: "/decision/:id", destination: "/cars/decision/:id", permanent: false },
  { source: "/arac-oneri-kosullari", destination: carsRoutes.recommendationTerms, permanent: false },
  { source: "/satis-danismani-bilgilendirmesi", destination: carsRoutes.salesAdvisorDisclosure, permanent: false },
]);
