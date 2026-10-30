# Controlled maintenance releases

The repository variable `AUTOMATIC_RELEASES_ENABLED` controls push-triggered
Worker deployment and the main-branch Docker image publication workflow.

- Unset or any value other than `false`: existing automatic releases continue.
- Exactly `false`: main pushes still run PR validation where applicable, but
  push-triggered production Worker deployment and Docker `latest` publication
  are skipped. Staging and manually selected Worker deployments remain available.
- Release/manual npm and Docker publication workflows are independent. Do not
  publish a GitHub Release or invoke those workflows during a maintenance hold.

Set the variable before merging a maintenance candidate. Deploy the reviewed
commit through the existing manual workflow with a single environment, verify
the environment, then promote the same candidate to the next environment.
Do not select `all` when the purpose is progressive rollout.

Each CMS environment serializes its deployments without cancelling a deployment
in flight. Staging is independently serialized. This avoids overlapping D1
migration/deploy steps within the same workflow target.

The hold changes no deployed Worker, binding, content, or database. Re-enabling
it does not deploy code retroactively; the next qualifying main push resumes
automatic releases. Record the current variable value and deployment versions
in the release log before changing the hold.

For staging, first inspect the GitHub environment's deployment branch policy.
It may restrict which branch can access staging secrets. Keep staging D1/R2
separate from production and preserve existing staging content.

## Before committing or pushing

Review the diff, check for secrets, confirm environment files are ignored, and
run the tests/build/type checks appropriate to the change. Required PR checks
include the server suite, admin editor/accessibility tests, Astro integration
tests/type check, server/admin and Worker builds, CSP checks, and the docs build.
