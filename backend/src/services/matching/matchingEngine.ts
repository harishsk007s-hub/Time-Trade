import prisma from '../../config/db';

export interface GraphEdge {
  from: string;
  to: string;
  offerId: string;
  skillId: string;
  skillName: string;
  estimatedDuration: number;
}

export type AdjacencyList = Record<string, GraphEdge[]>;

export interface Cycle {
  users: string[]; // Order of user IDs in cycle (e.g. A, B, C)
  edges: GraphEdge[]; // Directed edges in order
  length: number;
}

export interface UserRating {
  userId: string;
  name: string;
  rating: number;
  reviewsCount: number;
}

export interface RankedCycle {
  type: 'direct' | 'cycle';
  chainLength: number;
  averageRating: number;
  members: Array<{
    id: string;
    name: string;
    rating: number;
    reviewsCount: number;
    providesSkill: string;
    providesSkillId: string;
    providesOfferId: string;
    providesDuration: number;
  }>;
}

/**
 * Pure function to detect simple cycles containing targetUserId in a directed graph.
 * Bounded by maxDepth to prevent excessive recursive search in large graphs.
 */
export function findCyclesInGraph(
  adjList: AdjacencyList,
  targetUserId: string,
  maxDepth: number = 4
): Cycle[] {
  const cycles: Cycle[] = [];
  const visited = new Set<string>();
  const path: string[] = [targetUserId];
  const edges: GraphEdge[] = [];

  visited.add(targetUserId);

  function dfs(currentUserId: string, depth: number) {
    if (depth > maxDepth) return;

    const neighbors = adjList[currentUserId] || [];
    for (const edge of neighbors) {
      if (edge.to === targetUserId) {
        // Simple cycle found!
        cycles.push({
          users: [...path],
          edges: [...edges, edge],
          length: edges.length + 1,
        });
      } else if (!visited.has(edge.to)) {
        visited.add(edge.to);
        path.push(edge.to);
        edges.push(edge);

        dfs(edge.to, depth + 1);

        edges.pop();
        path.pop();
        visited.delete(edge.to);
      }
    }
  }

  dfs(targetUserId, 1);
  return cycles;
}

/**
 * Main service function to fetch DB data, construct the directed graph,
 * run cycle detection, fetch ratings, and rank the matches.
 */
export async function getPotentialMatchesForUser(targetUserId: string): Promise<RankedCycle[]> {
  // 1. Fetch all active skill offers and wants
  const offers = await prisma.skillOffer.findMany({
    include: {
      user: true,
      skill: true,
    },
  });

  const wants = await prisma.skillWant.findMany({
    include: {
      skill: true,
    },
  });

  // 2. Build the adjacency list
  // Edge: A -> B if A offers what B wants
  const adjList: AdjacencyList = {};

  // Group wants by skillId for quick lookup
  const wantsBySkill: Record<string, string[]> = {}; // skillId -> list of userIds who want it
  for (const want of wants) {
    if (!wantsBySkill[want.skillId]) {
      wantsBySkill[want.skillId] = [];
    }
    wantsBySkill[want.skillId].push(want.userId);
  }

  // Construct edges
  for (const offer of offers) {
    const skillId = offer.skillId;
    const receivers = wantsBySkill[skillId] || [];

    for (const receiverId of receivers) {
      // Prevent self-loops (user cannot trade with themselves)
      if (offer.userId === receiverId) continue;

      const edge: GraphEdge = {
        from: offer.userId,
        to: receiverId,
        offerId: offer.id,
        skillId,
        skillName: offer.skill.name,
        estimatedDuration: offer.estimatedDuration,
      };

      if (!adjList[offer.userId]) {
        adjList[offer.userId] = [];
      }
      adjList[offer.userId].push(edge);
    }
  }

  // 3. Find raw cycles starting at the target user
  const rawCycles = findCyclesInGraph(adjList, targetUserId, 4);

  if (rawCycles.length === 0) {
    return [];
  }

  // 4. Collect all unique user IDs across all cycles to fetch their ratings in one query
  const allUserIds = new Set<string>();
  for (const cycle of rawCycles) {
    for (const userId of cycle.users) {
      allUserIds.add(userId);
    }
  }

  // 5. Fetch user information and calculate their ratings
  const usersWithReviews = await prisma.user.findMany({
    where: {
      id: { in: Array.from(allUserIds) },
    },
    include: {
      reviewsReceived: {
        select: {
          rating: true,
        },
      },
    },
  });

  const userRatingsMap: Record<string, { name: string; rating: number; count: number }> = {};
  for (const user of usersWithReviews) {
    const totalReviews = user.reviewsReceived.length;
    const avgRating =
      totalReviews > 0
        ? user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0) / totalReviews
        : 5.0; // default to 5.0 rating for new users

    userRatingsMap[user.id] = {
      name: user.name,
      rating: Math.round(avgRating * 10) / 10,
      count: totalReviews,
    };
  }

  // 6. Map and rank the cycles
  const rankedCycles: RankedCycle[] = rawCycles.map((cycle) => {
    const members = cycle.users.map((userId, idx) => {
      const edge = cycle.edges[idx];
      const ratingInfo = userRatingsMap[userId] || { name: 'Unknown', rating: 5.0, count: 0 };
      
      return {
        id: userId,
        name: ratingInfo.name,
        rating: ratingInfo.rating,
        reviewsCount: ratingInfo.count,
        providesSkill: edge.skillName,
        providesSkillId: edge.skillId,
        providesOfferId: edge.offerId,
        providesDuration: edge.estimatedDuration,
      };
    });

    const averageRating =
      members.reduce((acc, m) => acc + m.rating, 0) / members.length;

    return {
      type: cycle.length === 2 ? 'direct' : 'cycle',
      chainLength: cycle.length,
      averageRating: Math.round(averageRating * 10) / 10,
      members,
    };
  });

  // Rank cycles:
  // First by chainLength ascending (shorter cycles are easier to coordinate)
  // Second by averageRating descending (better rated chains)
  rankedCycles.sort((a, b) => {
    if (a.chainLength !== b.chainLength) {
      return a.chainLength - b.chainLength;
    }
    return b.averageRating - a.averageRating;
  });

  return rankedCycles;
}
