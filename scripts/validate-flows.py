#!/usr/bin/env python3
"""Static validator for .gitlab/duo/flows/*.yaml against the GitLab custom-flow (Flow Registry v1) rules:
required keys, restricted fields, component/router/prompt references, input aliases vs {{ placeholders }},
tool names, HumanInputComponent constraints, and no Jinja braces in system prompts."""
import glob, re, sys, yaml
KNOWN_TOOLS = set("""read_file read_files create_file_with_contents find_files mkdir edit_file list_dir grep run_command run_git_command
get_job_logs create_merge_request get_merge_request list_merge_request_diffs gitlab_merge_request_search update_merge_request
add_merge_request_reviewers create_merge_request_note list_all_merge_request_notes create_merge_request_diff_note
get_pipeline_failing_jobs get_downstream_pipelines get_failing_bridge_jobs ci_linter create_issue list_issues get_issue update_issue
create_issue_note list_issue_notes get_issue_note create_branch list_commits get_commit get_commit_diff create_commit
get_repository_file list_repository_tree get_repository_files gitlab_api_get get_project""".split())
errs = []
for path in sorted(glob.glob(".gitlab/duo/flows/*.yaml")):
    d = yaml.safe_load(open(path, encoding="utf-8"))
    e = lambda m: errs.append(f"{path}: {m}")
    for k in ("version", "environment", "components", "routers", "flow"):
        if k not in d: e(f"missing {k}")
    for k in ("name", "description", "product_group"):
        if k in d: e(f"restricted top-level field {k}")
    if d.get("environment") != "ambient": e("environment must be ambient")
    comps = {c["name"]: c for c in d["components"]}
    prompts = {p["prompt_id"]: p for p in d.get("prompts", [])}
    for n, c in comps.items():
        if re.search(r"[:.]", n): e(f"bad component name {n}")
        if "response_schema_id" in c: e(f"{n}: response_schema_id restricted")
        if c["type"] in ("AgentComponent", "OneOffComponent"):
            p = prompts.get(c["prompt_id"])
            if not p: e(f"{n}: prompt {c['prompt_id']} missing"); continue
            if "model" in p: e(f"{n}: model restricted")
            if "stop" in p.get("params", {}): e(f"{n}: stop restricted")
            if p.get("unit_primitives") != []: e(f"{n}: unit_primitives: [] required")
            t = p["prompt_template"]
            if t.get("placeholder") != "history": e(f"{n}: placeholder: history required")
            if "{{" in t["system"] or "{%" in t["system"]: e(f"{n}: jinja braces in system prompt")
            aliases = {i["as"] for i in c.get("inputs", []) if isinstance(i, dict)}
            used = set(re.findall(r"\{\{\s*(\w+)\s*\}\}", t["user"]))
            if used - aliases: e(f"{n}: placeholders without input alias: {used - aliases}")
            if aliases - used: e(f"{n}: inputs never used in prompt: {aliases - used}")
            for tool in c.get("toolset", []):
                tn = tool if isinstance(tool, str) else list(tool)[0]
                if tn not in KNOWN_TOOLS: e(f"{n}: unknown tool {tn}")
            if any("project_id" in str(x) for x in c.get("toolset", [])) or True:
                api = [x for x in c.get("toolset", []) if isinstance(x, str) and x.startswith(("get_", "list_", "create_", "gitlab_", "update_", "ci_"))]
                if api and "project_id" not in aliases: e(f"{n}: GitLab API tools without project_id input")
            for i in c.get("inputs", []):
                src = i["from"] if isinstance(i, dict) else i
                if src.startswith("context:inputs.") and "inputs" not in d["flow"]: e(f"{n}: uses {src} but flow.inputs missing")
                m = re.match(r"context:(\w+)\.final_answer", src)
                if m and m.group(1) not in comps: e(f"{n}: input from unknown component {m.group(1)}")
        if c["type"] == "HumanInputComponent":
            if c.get("interaction_type") not in ("approval", "input"): e(f"{n}: interaction_type")
            if set(c.get("ui_log_events", [])) != {"on_user_input_prompt", "on_user_response"}: e(f"{n}: ui_log_events")
            r = [r for r in d["routers"] if r["from"] == n]
            if not r or "condition" not in r[0]: e(f"{n}: needs conditional router")
            else:
                routes = r[0]["condition"]["routes"]
                for k in ("approve", "modify", "reject", "default_route"):
                    if k not in routes: e(f"{n}: router missing {k}")
    targets = {"end", "abort"} | set(comps)
    for r in d["routers"]:
        if r["from"] not in comps: e(f"router from unknown {r['from']}")
        for t in ([r["to"]] if "to" in r else r["condition"]["routes"].values()):
            if t not in targets: e(f"router to unknown {t}")
    if d["flow"]["entry_point"] not in comps: e("bad entry_point")
    # reachability + must reach end
    seen, stack = set(), [d["flow"]["entry_point"]]
    while stack:
        x = stack.pop()
        if x in seen or x in ("end", "abort"): continue
        seen.add(x)
        for r in d["routers"]:
            if r["from"] == x: stack += [r["to"]] if "to" in r else list(r["condition"]["routes"].values())
    if set(comps) - seen: e(f"unreachable components {set(comps) - seen}")
    print(f"{path}: {len(comps)} components, {len(prompts)} prompts")
for x in errs: print("ERROR", x)
sys.exit(1 if errs else 0)
