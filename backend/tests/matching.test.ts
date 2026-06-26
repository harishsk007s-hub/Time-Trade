import { findCyclesInGraph, AdjacencyList } from '../src/services/matching/matchingEngine';

describe('Matching Engine Cycle Detection', () => {
  // Test case 1: Direct 2-person match (A -> B -> A)
  test('detects direct 2-person mutual match', () => {
    const adjList: AdjacencyList = {
      'user-A': [
        { from: 'user-A', to: 'user-B', offerId: 'offer-1', skillId: 'skill-1', skillName: 'React', estimatedDuration: 2 }
      ],
      'user-B': [
        { from: 'user-B', to: 'user-A', offerId: 'offer-2', skillId: 'skill-2', skillName: 'French', estimatedDuration: 1 }
      ]
    };

    const cycles = findCyclesInGraph(adjList, 'user-A', 4);
    
    expect(cycles).toHaveLength(1);
    expect(cycles[0].length).toBe(2);
    expect(cycles[0].users).toEqual(['user-A', 'user-B']);
    expect(cycles[0].edges[0].to).toBe('user-B');
    expect(cycles[0].edges[1].to).toBe('user-A');
  });

  // Test case 2: Multi-person cycle (A -> B -> C -> A)
  test('detects 3-person cycle', () => {
    const adjList: AdjacencyList = {
      'user-A': [
        { from: 'user-A', to: 'user-B', offerId: 'offer-1', skillId: 'skill-1', skillName: 'React', estimatedDuration: 2 }
      ],
      'user-B': [
        { from: 'user-B', to: 'user-C', offerId: 'offer-2', skillId: 'skill-2', skillName: 'French', estimatedDuration: 1 }
      ],
      'user-C': [
        { from: 'user-C', to: 'user-A', offerId: 'offer-3', skillId: 'skill-3', skillName: 'Guitar', estimatedDuration: 1 }
      ]
    };

    const cycles = findCyclesInGraph(adjList, 'user-A', 4);
    
    expect(cycles).toHaveLength(1);
    expect(cycles[0].length).toBe(3);
    expect(cycles[0].users).toEqual(['user-A', 'user-B', 'user-C']);
    expect(cycles[0].edges[0].to).toBe('user-B');
    expect(cycles[0].edges[1].to).toBe('user-C');
    expect(cycles[0].edges[2].to).toBe('user-A');
  });

  // Test case 3: Linear path (no cycles)
  test('does not report cycle for a linear path', () => {
    const adjList: AdjacencyList = {
      'user-A': [
        { from: 'user-A', to: 'user-B', offerId: 'offer-1', skillId: 'skill-1', skillName: 'React', estimatedDuration: 2 }
      ],
      'user-B': [
        { from: 'user-B', to: 'user-C', offerId: 'offer-2', skillId: 'skill-2', skillName: 'French', estimatedDuration: 1 }
      ],
      'user-C': [] // C offers nothing to A
    };

    const cycles = findCyclesInGraph(adjList, 'user-A', 4);
    
    expect(cycles).toHaveLength(0);
  });

  // Test case 4: Bounded by max depth (cycle length 5, maxDepth 4)
  test('ignores cycles that exceed max depth', () => {
    const adjList: AdjacencyList = {
      'user-A': [{ from: 'user-A', to: 'user-B', offerId: 'o1', skillId: 's', skillName: 's', estimatedDuration: 1 }],
      'user-B': [{ from: 'user-B', to: 'user-C', offerId: 'o2', skillId: 's', skillName: 's', estimatedDuration: 1 }],
      'user-C': [{ from: 'user-C', to: 'user-D', offerId: 'o3', skillId: 's', skillName: 's', estimatedDuration: 1 }],
      'user-D': [{ from: 'user-D', to: 'user-E', offerId: 'o4', skillId: 's', skillName: 's', estimatedDuration: 1 }],
      'user-E': [{ from: 'user-E', to: 'user-A', offerId: 'o5', skillId: 's', skillName: 's', estimatedDuration: 1 }]
    };

    // With depth limit 4, it should not find the length 5 cycle.
    const cyclesLimit4 = findCyclesInGraph(adjList, 'user-A', 4);
    expect(cyclesLimit4).toHaveLength(0);

    // With depth limit 5, it should find it.
    const cyclesLimit5 = findCyclesInGraph(adjList, 'user-A', 5);
    expect(cyclesLimit5).toHaveLength(1);
    expect(cyclesLimit5[0].length).toBe(5);
  });

  // Test case 5: Intersecting cycles (A->B->A and A->B->C->A)
  test('detects multiple cycles of different lengths', () => {
    const adjList: AdjacencyList = {
      'user-A': [
        { from: 'user-A', to: 'user-B', offerId: 'o1', skillId: 's1', skillName: 's', estimatedDuration: 1 }
      ],
      'user-B': [
        { from: 'user-B', to: 'user-A', offerId: 'o2', skillId: 's2', skillName: 's', estimatedDuration: 1 },
        { from: 'user-B', to: 'user-C', offerId: 'o3', skillId: 's3', skillName: 's', estimatedDuration: 1 }
      ],
      'user-C': [
        { from: 'user-C', to: 'user-A', offerId: 'o4', skillId: 's4', skillName: 's', estimatedDuration: 1 }
      ]
    };

    const cycles = findCyclesInGraph(adjList, 'user-A', 4);
    expect(cycles).toHaveLength(2); // Should find A->B->A (len 2) and A->B->C->A (len 3)
    
    const lengths = cycles.map(c => c.length).sort();
    expect(lengths).toEqual([2, 3]);
  });
});
