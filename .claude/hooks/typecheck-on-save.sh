#!/usr/bin/env bash
file="$(node -e '
let d="";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    console.log(j.tool_response?.filePath || j.tool_input?.file_path || "");
  } catch { console.log(""); }
});
')"

case "$file" in
  *apps/api/src/*.ts)
    workspace="apps/api"
    tsconfig="apps/api/tsconfig.json"
    ;;
  *apps/web/src/*.ts|*apps/web/src/*.tsx)
    workspace="apps/web"
    tsconfig="apps/web/tsconfig.json"
    ;;
  *)
    exit 0
    ;;
esac

npx tsc -p "$tsconfig" --noEmit
tsc_status=$?

npx vitest related --run "$file" --root "$workspace" 2>/dev/null
vitest_status=$?

if [ $tsc_status -ne 0 ] || [ $vitest_status -ne 0 ]; then
  echo "{\"systemMessage\": \"Type-check or related test failed for $file ($workspace) - see output above.\"}"
fi
exit 0
