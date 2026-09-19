# Agent workflow

The active workflow is native ChatGPT/Codex only. It does not use OpenCode model execution, provider routing, Kimi, or DeepSeek calls. `.opencode/agents/` and `.opencode/opencode.json` retain legacy OpenCode compatibility bindings and are inactive for this workflow.

## Native roles

- Astra (`gpt-6-astra`): director, architect, and final reviewer.
- Luna (`gpt-5.6-luna`): normal implementation executor.
- Terra (`gpt-5.6-terra`): tiny/mechanical executor.
- Sol (`gpt-5.6-sol`): optional bounded analysis or review only.

Native delegation must explicitly select the model, use `fork_turns: none`, and pass a self-contained narrow contract. There is no need for a new Codex config file; the collaboration runtime selects these models directly.

## Delegation contract

Every task includes:

- objective and minimal context
- allowed files/directories
- do-not-change list
- acceptance criteria
- verification commands
- return format: files changed, summary, checks and results, assumptions, unresolved concerns

Use one executor by default. Parallelize only disjoint file ownership with frozen interfaces, and at most two workers when parallel work has a concrete purpose. Do not create automatic review chains or recursive delegation. Reuse the same worker for repairs, up to two cycles.

Workers run focused checks. Run `pnpm exec tsc --noEmit` separately when type validation is needed because Next build may skip it. One designated worker runs the single serialized integrated `pnpm build`; never race builds in the shared checkout. Astra reviews the integrated diff and verification evidence after implementation and sends findings back to the same executor.
