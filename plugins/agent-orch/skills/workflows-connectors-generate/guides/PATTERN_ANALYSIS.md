# Pattern Analysis Algorithm

This guide explains how to analyze existing connectors to identify common patterns for a new connector.

## Algorithm Overview

The pattern analysis process identifies which actions and triggers are most commonly implemented in similar connectors, then recommends them for the new connector.

## Pseudo-code Implementation

```typescript
// Pseudo-code for pattern matching

function analyzePatterns(serviceCategory: string, existingConnectors: string[]) {
  const patterns = {};

  // Extract actions from similar connectors
  for (const connector of existingConnectors) {
    const actions = listFiles(`packages/connectors/${connector}/src/lib/actions/*.ts`);
    actions.forEach(action => {
      const name = basename(action, '.ts');
      patterns[name] = (patterns[name] || 0) + 1;
    });
  }

  // Sort by frequency
  const sorted = Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      prevalence: count / existingConnectors.length,
      priority: calculatePriority(count, existingConnectors.length)
    }));

  return sorted;
}

function calculatePriority(count: number, total: number): number {
  const prevalence = count / total;
  if (prevalence >= 0.8) return 100; // ⭐⭐⭐
  if (prevalence >= 0.6) return 75;  // ⭐⭐
  if (prevalence >= 0.4) return 50;  // ⭐
  return 25;
}
```

## How to Use

1. **Identify service category**: Match the new service against PieceCategory values
2. **Find similar connectors**: Search for 3-8 connectors in the same category
3. **Extract patterns**: Run the analysis algorithm on actions and triggers
4. **Score and rank**: Use the priority calculation to rank recommendations
5. **Match to API**: For each pattern, verify it matches an available API endpoint
6. **Present to user**: Show recommendations with star ratings based on prevalence

## Star Rating System

- ⭐⭐⭐ (Priority 100): Found in 80%+ of similar connectors - Essential
- ⭐⭐ (Priority 75): Found in 60-79% of similar connectors - Highly recommended
- ⭐ (Priority 50): Found in 40-59% of similar connectors - Recommended
- (Priority 25): Found in <40% of similar connectors - Optional
