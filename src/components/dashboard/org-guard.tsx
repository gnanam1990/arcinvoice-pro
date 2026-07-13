import { Alert } from "@/components/ui/alert";
import { OrgContextError } from "@/lib/org/context";

export function OrgUnavailable({ error }: { error: unknown }) {
  const message =
    error instanceof OrgContextError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Organization context unavailable";

  const isForbidden =
    error instanceof OrgContextError && error.code === "FORBIDDEN";

  return (
    <Alert
      tone={isForbidden ? "error" : "warning"}
      title={isForbidden ? "Permission denied" : "Setup required"}
    >
      <p>{message}</p>
      {!isForbidden ? (
        <p className="mt-2">
          Ensure PostgreSQL is running, migrations are applied (
          <code className="font-mono text-xs">pnpm db:migrate</code>), and demo
          data is seeded (<code className="font-mono text-xs">pnpm db:seed</code>
          ).
        </p>
      ) : null}
    </Alert>
  );
}
