#!/usr/bin/env bash
command="$(node -e '
let d="";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    console.log(j.tool_input?.command || "");
  } catch { console.log(""); }
});
')"

if echo "$command" | grep -qE 'git( .*)? commit\b'; then
  cat <<'EOF'
{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Commits in this repo are made only by the project lead, never by Claude (see CLAUDE.md and project workflow rules)."}}
EOF
fi
exit 0
