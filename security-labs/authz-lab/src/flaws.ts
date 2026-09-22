// Central place every vulnerable/secure branch reads from.
// SECURE_MODE=true forces every flaw off, no matter what the
// individual FLAW_* env vars say — this is the "make it safe" switch.

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw.toLowerCase() === "true" || raw === "1";
}

const SECURE_MODE = envBool("SECURE_MODE", false);

function flaw(name: string): boolean {
  if (SECURE_MODE) return false;
  return envBool(name, true);
}

export const FLAWS = {
  secureMode: SECURE_MODE,
  idor: flaw("FLAW_IDOR"),
  verticalEscalation: flaw("FLAW_VERTICAL_ESCALATION"),
  crossTenant: flaw("FLAW_CROSS_TENANT"),
  altMethods: flaw("FLAW_ALT_METHODS"),
  hiddenEndpoint: flaw("FLAW_HIDDEN_ENDPOINT"),
  workflowSkip: flaw("FLAW_WORKFLOW_SKIP"),
  staleInvite: flaw("FLAW_STALE_INVITE"),
  roleDowngradePersistence: flaw("FLAW_ROLE_DOWNGRADE_PERSISTENCE"),
  raceCondition: flaw("FLAW_RACE_CONDITION"),
  massAssignment: flaw("FLAW_MASS_ASSIGNMENT"),
  graphqlFieldAuthz: flaw("FLAW_GRAPHQL_FIELD_AUTHZ"),
  fileObjectMismatch: flaw("FLAW_FILE_OBJECT_MISMATCH"),
  deprecatedApiGap: flaw("FLAW_DEPRECATED_API_GAP"),
} as const;
