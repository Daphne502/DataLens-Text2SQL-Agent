"""
DataLens Text2SQL 批量评测
用法（项目根目录，且 FastAPI 已启动）:
    python eval/run_eval.py
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

API_BASE = os.getenv("DATALENS_API_URL", "http://127.0.0.1:8000").rstrip("/")


def load_cases(path: Path) -> list:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def check_case(result: dict, checks: dict) -> dict:
    """规则打分"""
    out = {}

    expect_status = checks.get("expect_status", "success")
    actual_status = result.get("status", "error")
    out["status_match"] = actual_status == expect_status

    sql = (result.get("sql") or "").lower()
    msg = str(result.get("message") or result.get("data") or "")

    for key in checks.get("sql_must_contain_all", []):
        out[f"sql_has_{key}"] = key.lower() in sql

    any_list = checks.get("sql_must_contain_any", [])
    if any_list:
        out["sql_keyword_ok"] = any(k.lower() in sql for k in any_list)
    else:
        out["sql_keyword_ok"] = True

    if checks.get("data_not_empty"):
        data = result.get("data")
        if isinstance(data, list):
            out["data_not_empty"] = len(data) > 0
        elif isinstance(data, dict):
            out["data_not_empty"] = len(data) > 0
        else:
            out["data_not_empty"] = bool(data)
    else:
        out["data_not_empty"] = True

    msg_any = checks.get("message_must_contain_any", [])
    if msg_any:
        combined = (msg + sql).lower()
        out["message_ok"] = any(k.lower() in combined for k in msg_any)
    else:
        out["message_ok"] = True

    out["passed"] = all(v for k, v in out.items() if k != "passed")
    return out


def run_one(client: httpx.Client, case: dict) -> dict:
    t0 = time.perf_counter()
    try:
        resp = client.post(
            f"{API_BASE}/api/v1/query",
            json={"query": case["query"]},
            timeout=120.0,
        )
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        result = resp.json()
        if resp.status_code != 200:
            result = {
                "status": "error",
                "sql": "",
                "data": None,
                "message": result.get("detail", str(result)),
            }
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        return {
            "id": case["id"],
            "query": case["query"],
            "passed": False,
            "error": str(e),
            "elapsed_ms": elapsed_ms,
        }

    checks = check_case(result, case.get("checks", {}))
    return {
        "id": case["id"],
        "query": case["query"],
        "passed": checks.get("passed", False),
        "checks": checks,
        "status": result.get("status"),
        "sql": result.get("sql"),
        "corrected": result.get("corrected", False),
        "elapsed_ms": elapsed_ms,
        "api_elapsed_ms": result.get("elapsed_ms"),
    }


def summarize(results: list) -> dict:
    total = len(results)
    passed = sum(1 for r in results if r.get("passed"))
    corrected = sum(1 for r in results if r.get("corrected"))
    valid = [r for r in results if "elapsed_ms" in r]
    avg_ms = sum(r["elapsed_ms"] for r in valid) // len(valid) if valid else 0
    return {
        "total_cases": total,
        "passed_cases": passed,
        "pass_rate": round(passed / total * 100, 1) if total else 0,
        "corrected_cases": corrected,
        "avg_elapsed_ms": avg_ms,
    }


def main():
    cases_path = ROOT / "eval" / "test_cases.json"
    report_path = ROOT / "eval" / "eval_report.json"

    print(f"API: {API_BASE}")
    print(f"加载用例: {cases_path}")
    cases = load_cases(cases_path)
    print(f"共 {len(cases)} 条\n")

    # 健康检查
    with httpx.Client() as client:
        try:
            h = client.get(f"{API_BASE}/health", timeout=5.0)
            h.raise_for_status()
        except Exception as e:
            print(f"错误: FastAPI 未启动或不可达 ({e})")
            print("请先运行: cd backend && uvicorn api.main:app --port 8000")
            sys.exit(1)

        results = []
        for i, case in enumerate(cases, 1):
            print(f"[{i}/{len(cases)}] {case['id']}: {case['query'][:30]}...")
            r = run_one(client, case)
            print(f"    -> {'PASS' if r.get('passed') else 'FAIL'}")
            if not r.get("passed") and r.get("checks"):
                failed = [k for k, v in r["checks"].items() if not v and k != "passed"]
                print(f"    失败项: {failed}")
            results.append(r)

    summary = summarize(results)
    report = {
        "project": "DataLens",
        "evaluated_at": datetime.now().isoformat(timespec="seconds"),
        "api_base": API_BASE,
        "summary": summary,
        "results": results,
    }

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("\n========== 评测摘要 ==========")
    print(f"通过率: {summary['pass_rate']}% ({summary['passed_cases']}/{summary['total_cases']})")
    print(f"经自修正: {summary['corrected_cases']} 条")
    print(f"平均耗时: {summary['avg_elapsed_ms']} ms")
    print(f"报告: {report_path}")


if __name__ == "__main__":
    main()