import {
  LEVELS,
  getLevelProgress,
  isLevelUnlocked,
  type LevelDef,
} from './challengeStore';

/* ============================================================================
   THE GROWTH TREE — the shape of the whole programme, in one picture.

   One trunk everybody climbs, then the tree divides into branches. The trunk is
   the levels everyone does in order. The fork is the level where the tree
   divides. Each branch above the fork is an AREA OF LIFE, and it holds however
   many levels get allocated to it.

   EDITING THE TREE — a guide for Andrew, not for a developer

   Everything the picture draws comes from TRUNK_LEVELS, FORK_LEVEL and BRANCHES
   below. Nothing about the drawing is fixed: change the numbers here and the
   tree redraws itself to match.

     - Give a branch a different set of levels      -> its rungs change
     - Give one branch five levels and another two  -> both draw correctly
     - Add a fourth branch                          -> the canopy makes room
     - Remove a branch                              -> the rest spread out

   So when challenges get allocated to branches, this is the only file to edit.

   Level NAMES are not here on purpose. They come from LEVELS in
   lib/challengeStore, so the tree and the Challenges tab can never disagree
   about what a level is called. Rename a level there and the tree follows.

   WHAT IS STILL OPEN
   The three branch names below are placeholders. What the branches are called,
   and what the levels above the fork are, has not been decided yet. Change the
   `name` strings when it is.
   ============================================================================ */

export type TreeBranch = {
  id: string;
  /** The area of life this branch covers. */
  name: string;
  /** The levels allocated to this branch, in the order they are climbed. */
  levelNumbers: number[];
};

/** The levels everyone climbs, in order, before the tree divides. */
export const TRUNK_LEVELS = [1, 2, 3];

/** The level where the trunk ends and the branches open. */
export const FORK_LEVEL = 4;

/**
 * The branches. Each is an area of life, holding the levels allocated to it.
 * Finishing the fork opens all of them; you take one at a time and the rest
 * stay open and waiting.
 */
export const BRANCHES: TreeBranch[] = [
  { id: 'branch-1', name: 'Branch One', levelNumbers: [5, 6, 7, 8] },
  { id: 'branch-2', name: 'Branch Two', levelNumbers: [9, 10, 11, 12] },
  { id: 'branch-3', name: 'Branch Three', levelNumbers: [13, 14, 15, 16] },
];

// ---------- Derived state ----------

/**
 * How a level is drawn.
 *
 * `open` and `current` both mean the user can work on it — nothing in this app
 * ever blocks progress. `locked` means the content above the fork is not
 * reachable yet, which is a statement about the programme's shape, not a gate
 * on the user's day.
 */
export type NodeState = 'complete' | 'current' | 'open' | 'locked';

export type TreeNode = {
  level: LevelDef;
  state: NodeState;
  /** 0-1, how much of this level's written content has a response. */
  fraction: number;
  /** True when this level has no content written yet. */
  empty: boolean;
};

export type BranchState = {
  branch: TreeBranch;
  nodes: TreeNode[];
  /** 0-1 across every written day allocated to this branch. */
  fraction: number;
};

/*
 * No reveal lock. The tree used to stay hidden until Level 3; now that it lives
 * inside the Challenges tab as another view of the same levels, Andrew removed
 * the lock - it is visible from day one.
 */
export type GrowthTreeState = {
  trunk: TreeNode[];
  fork: TreeNode;
  branches: BranchState[];
  /** 0-1 across the trunk and the fork — how far up the shared climb the user is. */
  trunkFraction: number;
  /** True once the trunk and the fork are finished and the branches have opened. */
  branchesOpen: boolean;
};

async function nodeFor(levelNumber: number): Promise<TreeNode> {
  const level = LEVELS.find((l) => l.number === levelNumber);
  const progress = await getLevelProgress(levelNumber);
  const unlocked = await isLevelUnlocked(levelNumber);

  const empty = progress.totalContentDays === 0;
  const fraction = empty ? 0 : progress.completedContentDays / progress.totalContentDays;
  const complete = !empty && progress.completedContentDays >= progress.totalContentDays;

  let state: NodeState;
  if (complete) state = 'complete';
  else if (!unlocked) state = 'locked';
  else if (progress.completedContentDays > 0) state = 'current';
  else state = 'open';

  return {
    // LEVELS only covers 1-6, so branch levels above that are unnamed placeholders
    // and draw as "Locked". Fall back rather than crash the screen.
    level: level ?? { id: `level-${levelNumber}`, number: levelNumber, name: `Level ${levelNumber}` },
    state,
    fraction,
    empty,
  };
}

function weightedFraction(nodes: TreeNode[]): number {
  const written = nodes.filter((n) => !n.empty);
  if (written.length === 0) return 0;
  return written.reduce((sum, n) => sum + n.fraction, 0) / written.length;
}

/**
 * Reads the whole tree in one pass. Every number the picture needs comes from
 * here, so the screen does no progress maths of its own.
 */
export async function getGrowthTreeState(): Promise<GrowthTreeState> {
  const trunk: TreeNode[] = [];
  for (const n of TRUNK_LEVELS) trunk.push(await nodeFor(n));

  const fork = await nodeFor(FORK_LEVEL);

  const branches: BranchState[] = [];
  for (const branch of BRANCHES) {
    const nodes: TreeNode[] = [];
    for (const n of branch.levelNumbers) nodes.push(await nodeFor(n));
    branches.push({ branch, nodes, fraction: weightedFraction(nodes) });
  }

  const climb = [...trunk, fork];

  return {
    trunk,
    fork,
    branches,
    trunkFraction: weightedFraction(climb),
    branchesOpen: climb.every((n) => n.state === 'complete'),
  };
}
