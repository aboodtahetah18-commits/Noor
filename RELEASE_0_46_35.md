# Release 0.46.35

Implements P46.34 + P46.35 compound pressure-decision packages.

Key additions:
- multi-action package builder from current pressure scenarios;
- combined before/after arithmetic;
- timing-shift separation;
- stale-snapshot validation before approval;
- package/item/event audit persistence;
- approved items link to their canonical execution workflows.

No direct financial write is performed by package approval.

Verification performed for this release is recorded in the delivery response; a full dependency-backed Next.js build must only be claimed when dependencies are actually installed and the build runs successfully.
